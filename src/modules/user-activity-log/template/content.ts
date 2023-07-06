import { EventAction, IUserActivityEvent } from "../interfaces/userActivityLog";

export const addContentEvent: IUserActivityEvent = {
    name: 'add-content-event',
    description: 'add a content',
    action: EventAction.add,
    resource: 'content',
};

export const editContentEvent: IUserActivityEvent = {
    name: 'edit-content-event',
    description: 'edit a content',
    action: EventAction.edit,
    resource: 'content',
};

export const deleteContentEvent: IUserActivityEvent = {
    name: 'delete-content-event',
    description: 'delete a content',
    action: EventAction.delete,
    resource: 'content',
};
