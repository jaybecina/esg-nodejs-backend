export enum EventAction {
    add = 'add',
    edit = 'edit',
    delete = 'delete',
    assign = 'assign',
    submit = 'submit',
    complete = 'complete',
    export = 'export',
}

type EventActionType = keyof typeof EventAction;

export enum Resource {
    company = 'company',
    user = 'user',
    calculation = 'calculation',
    material = 'material',
    'form-template' = 'form-template',
    form = 'form',
    meter = 'meter',
    report = 'report',
    unit = 'unit',
    constant = 'constant',
    content = 'content',
}

export type ResourceType = keyof typeof Resource;

export interface IUserActivityLog extends IUserActivityEvent {
    _id: string,
    userId: string,
    resourceId: string,
    data: any,
}

export interface IUserActivityEvent {
    name: string,
    description: string,
    action: EventActionType,
    resource: ResourceType,
}
