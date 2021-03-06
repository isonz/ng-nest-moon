import { Component, OnInit, ViewChild, TemplateRef, ElementRef, ViewEncapsulation } from '@angular/core';
import * as _ from 'lodash';
import { FormComponent } from 'src/share/components/form/form.component';
import { OverlayRef } from '@angular/cdk/overlay';
import { ModalService } from 'src/share/components/modal/modal.service';
import { FormOption, Row, InputControl, AddItemControl, SelectControl, CheckboxControl, Control } from 'src/share/components/form/form.type';
import { Subject, Observable } from 'rxjs';
import { ColumnTypeData } from './mi-entity.store';
import { Select } from 'src/share/components/select/select.type';
import { SettingService } from 'src/services/setting.service';
import { ModuleInfoService } from '../module-info.service';
import { TableService } from '../../module.service';
import { map } from 'rxjs/operators';
import { CdkDrag } from '@angular/cdk/drag-drop';
import { PopoverService } from 'src/share/components/popover/popover.service';
import { MiEntityService } from './mi-entity.service';

@Component({
    selector: 'nm-mi-entity',
    styleUrls: ['./mi-entity.component.scss'],
    templateUrl: './mi-entity.component.html',
    providers: [MiEntityService],
    encapsulation: ViewEncapsulation.None
})
export class MiEntityComponent implements OnInit {

    list = [];

    _initList = [];

    @ViewChild('entityTemp') entityTemp: TemplateRef<any>;

    @ViewChild('codeTemp') codeTemp: TemplateRef<any>;

    @ViewChild('dragBox') dragBox: ElementRef;

    entityForm: FormComponent;
    @ViewChild('entityForm') set _formCom(val) {
        this.entityForm = val;
    }

    modal: OverlayRef;

    submitSubject = new Subject();

    cancelSubject = new Subject();

    removeSubject = new Subject();

    addDefaultPrimarySubject = new Subject();

    active: any = {};

    type: string = 'add';

    entityCode = '';

    private _initControls: Control<any>[] | Row[];

    getFormAddData = Observable.create(x => {
        x.next({
            id: this.setting.guid(),
            moduleId: this.moduleInfoService.id
        })
    });

    formOption: FormOption = {
        title: '实体信息',
        controls: [
            new Row({
                hide: true, controls: [
                    new InputControl({ key: "id", label: "编号" }),
                    new InputControl({ key: "moduleId", label: "对应模块Id" }),
                    new Control({ key: "transform", label: "位置", value: { x: 50, y: 32 } }),
                ]
            }),
            new Row({
                controls: [
                    new InputControl({ key: "name", label: "名称", col: 3 }),
                    new InputControl({ key: "code", label: "编码", col: 3 }),
                    new InputControl({ key: "description", label: "描述", col: 6 }),
                ]
            }),
            new Row({
                title: '属性', icon: 'icon-grid', controls: [
                    new AddItemControl({
                        key: "cols",
                        type: 'batch',
                        buttons: [
                            {
                                label: '添加默认主键', handler: this.addDefaultPrimarySubject, defaultData: [
                                    {
                                        label: '编码', name: 'id', length: 36, type: { key: 'varchar', label: 'varchar' },
                                        default: '', nullable: false, primary: true, unique: false, sort: 0
                                    }
                                ]
                            }
                        ],
                        form: {
                            controls: [
                                new Row({
                                    hide: true, controls: [
                                        new InputControl({ key: "id", label: "编号" }),
                                        new InputControl({ key: "tableId", label: "编号", relation: 'many-one' })
                                    ]
                                }),
                                new Row({
                                    title: "基本信息",
                                    icon: "icon-align-justify",
                                    controls: [
                                        new InputControl({ key: "label", label: "名称", width: 100, colHead: true, required: true }),
                                        new InputControl({ key: "name", label: "编码", width: 100, colHead: true, required: true }),
                                        new SelectControl({
                                            key: "type", label: "类型", width: 100, data: ColumnTypeData as Select[], colHead: true,
                                            value: { key: 'varchar', label: 'varchar' }
                                        }),
                                        new InputControl({ key: "length", label: "长度", width: 50, colHead: true, }),
                                        new CheckboxControl({ key: "primary", label: "主键", width: 50, colHead: true }),
                                        new CheckboxControl({ key: "nullable", label: "允许空", width: 50, colHead: true }),
                                        new CheckboxControl({ key: "unique", label: "唯一", width: 50, colHead: true }),
                                        new InputControl({ key: "default", label: "默认值", width: 165, colHead: true }),
                                    ]
                                })
                            ]
                        }
                    }),
                ]
            })
        ],
        buttons: [
            { type: 'submit', handler: this.submitSubject },
            { type: 'cancel', handler: this.cancelSubject }
        ],
        type: 'info',
        isOnePage: true
    }

    constructor(
        private modalService: ModalService,
        private tableService: TableService,
        private setting: SettingService,
        private moduleInfoService: ModuleInfoService,
        private popoverService: PopoverService,
        private miEntityService: MiEntityService
    ) { }

    ngOnInit() {
        this.getData();
        this.setForm();
        this.subject();
    }

    action(type: string, data?: any, event?: Event) {
        switch (type) {
            case 'entityModal':
                this.modal = this.modalService.create({
                    panelClass: 'form',
                    templateRef: this.entityTemp,
                    title: data,
                    width: 800
                })
                break;
            case 'codeModal':
                this.modal = this.modalService.create({
                    panelClass: 'tabs',
                    templateRef: this.codeTemp,
                    title: '生成代码',
                    width: 800,
                    height: 600
                })
                break;
            case 'add':
                this.formOption.controls = _.cloneDeep(this._initControls);
                this.formOption.data = this.getFormAddData
                this.action('entityModal', '新建实体')
                this.type = type;
                setTimeout(() => { this.entityForm.option.type = this.type })
                break;
            case 'update':
                this.formOption.controls = _.cloneDeep(this._initControls);
                this.formOption.data = this.tableService.findOne(data.id).pipe(map(x => {
                    x.cols = _.orderBy(x.cols, 'sort')
                    return x;
                }))
                this.action('entityModal', '更新实体')
                this.type = type;
                setTimeout(() => { this.entityForm.option.type = this.type })
                break;
            case 'more':
                this.popoverService.create({
                    connectRef: new ElementRef(event.srcElement),
                    originPos: { originX: 'end', originY: 'bottom' },
                    overlayPos: { overlayX: 'end', overlayY: 'top' },
                    menus: [
                        { title: '删除', icon: 'icon-trash-2', handler: this.removeSubject },
                        { title: '生成代码', icon: 'icon-hash', handler: () => this.createCode(data) }
                    ]
                })
                break;
            case 'active':
                let item = _.remove(this.list, x => x.id === data.id);
                if (item.length > 0) {
                    this.active = item[0];
                    this.list.push(this.active);
                }
                break;
            case 'cancel':
                if (this.modal) {
                    this.modal.detach();
                    this.modal.dispose();
                }
                break;
        }
    }

    getData() {
        this.tableService.findAll({ size: 0, filter: { moduleId: this.moduleInfoService.id } })
            .pipe(map(x => {
                x.list = _.map(x.list, y => {
                    y.cols = _.orderBy(y.cols, 'sort')
                    return y;
                })
                return x;
            }))
            .subscribe(x => {
                this.list = x.list;
                this._initList = _.cloneDeep(this.list);
            })
    }

    dragEnded(drag: { source: CdkDrag }, item) {
        let initItem = _.find(this._initList, x => x.id === item.id),
            transform = drag.source._dragRef['_activeTransform'];
        item.transform = { x: transform.x + initItem.transform.x, y: transform.y + initItem.transform.y };
        this.tableService.updateTransform({ id: item.id, transform: item.transform }).subscribe();
    }

    setForm() {
        this._initControls = _.cloneDeep(this.formOption.controls);
    }

    subject() {
        this.submitSubject.subscribe((x: any) => {
            if (this.type === 'add') {
                this.tableService.create(x).subscribe(() => {
                    this.list = _.union(this.list, [x]);
                    this._initList = _.cloneDeep(this.list);
                    this.action('cancel')
                })
            } else if (this.type === 'update') {
                this.tableService.update(x).subscribe(y => {
                    let find = _.find(this.list, z => z.id === y.id)
                    Object.assign(find, y);
                    this.action('cancel')
                })
            }
        })
        this.cancelSubject.subscribe(() => {
            this.action('cancel')
        })
        this.removeSubject.subscribe(() => {
            this.tableService.remove(this.active.id).subscribe(() => {
                _.remove(this.list, z => z.id === this.active.id)
            })
        })
        this.addDefaultPrimarySubject.subscribe(() => {

        })
    }

    createCode(data) {
        this.entityCode = this.miEntityService.createCode(data);
        this.action('codeModal')
    }
}
