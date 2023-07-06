import { EventAction, IUserActivityEvent } from "../interfaces/userActivityLog";

export const addFormTemplateEvent: IUserActivityEvent = {
    name: 'add-form-template-event',
    description: 'add a form template',
    action: EventAction.add,
    resource: 'form-template',
};

export const editFormTemplateEvent: IUserActivityEvent = {
    name: 'edit-form-template-event',
    description: 'edit a form template',
    action: EventAction.edit,
    resource: 'form-template',
};

export const deleteFormTemplateEvent: IUserActivityEvent = {
    name: 'delete-form-template-event',
    description: 'delete a form template',
    action: EventAction.delete,
    resource: 'form-template',
};
