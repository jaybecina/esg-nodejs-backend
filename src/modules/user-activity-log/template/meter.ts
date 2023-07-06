import { EventAction, IUserActivityEvent } from "../interfaces/userActivityLog";

export const addMeterEvent: IUserActivityEvent = {
    name: 'add-meter-event',
    description: 'add a meter',
    action: EventAction.add,
    resource: 'meter',
};

export const editMeterEvent: IUserActivityEvent = {
    name: 'edit-meter-event',
    description: 'edit a meter',
    action: EventAction.edit,
    resource: 'meter',
};

export const deleteMeterEvent: IUserActivityEvent = {
    name: 'delete-meter-event',
    description: 'delete a meter',
    action: EventAction.delete,
    resource: 'meter',
};
