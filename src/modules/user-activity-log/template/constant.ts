import { EventAction, IUserActivityEvent } from "../interfaces/userActivityLog";

export const addConstantEvent: IUserActivityEvent = {
    name: 'add-constant-event',
    description: 'add a constant',
    action: EventAction.add,
    resource: 'constant',
};

export const editConstantEvent: IUserActivityEvent = {
    name: 'edit-constant-event',
    description: 'edit a constant',
    action: EventAction.edit,
    resource: 'constant',
};

export const deleteConstantEvent: IUserActivityEvent = {
    name: 'delete-constant-event',
    description: 'delete a constant',
    action: EventAction.delete,
    resource: 'constant',
};
