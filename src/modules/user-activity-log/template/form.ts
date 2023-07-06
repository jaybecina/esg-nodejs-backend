import { EventAction, IUserActivityEvent } from "../interfaces/userActivityLog";

export const addFormEvent: IUserActivityEvent = {
    name: 'add-form-event',
    description: 'add a form',
    action: EventAction.add,
    resource: 'form',
};

export const editFormEvent: IUserActivityEvent = {
    name: 'edit-form-event',
    description: 'edit a form',
    action: EventAction.edit,
    resource: 'form',
};

export const deleteFormEvent: IUserActivityEvent = {
    name: 'delete-form-event',
    description: 'delete a form',
    action: EventAction.delete,
    resource: 'form',
};

export const assignFormEvent: IUserActivityEvent = {
    name: 'assign-form-event',
    description: 'assign a form',
    action: EventAction.assign,
    resource: 'form',
}

export const submitFormEvent: IUserActivityEvent = {
    name: 'submit-form-event',
    description: 'submit a form',
    action: EventAction.submit,
    resource: 'form',
}

export const completeFormEvent: IUserActivityEvent = {
    name: 'complete-form-event',
    description: 'complete a form',
    action: EventAction.complete,
    resource: 'form',
}
