import { EventAction, IUserActivityEvent } from "../interfaces/userActivityLog";

export const addUserEvent: IUserActivityEvent = {
    name: 'add-user-event',
    description: 'add a user',
    action: EventAction.add,
    resource: 'user',
};

export const editUserEvent: IUserActivityEvent = {
    name: 'edit-user-event',
    description: 'edit a user',
    action: EventAction.edit,
    resource: 'user',
};

export const deleteUserEvent: IUserActivityEvent = {
    name: 'delete-user-event',
    description: 'delete a user',
    action: EventAction.delete,
    resource: 'user',
};
