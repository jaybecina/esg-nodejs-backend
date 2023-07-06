import { EventAction, IUserActivityEvent } from "../interfaces/userActivityLog";

export const addUnitEvent: IUserActivityEvent = {
    name: 'add-unit-event',
    description: 'add a unit',
    action: EventAction.add,
    resource: 'unit',
};

export const editUnitEvent: IUserActivityEvent = {
    name: 'edit-unit-event',
    description: 'edit a unit',
    action: EventAction.edit,
    resource: 'unit',
};

export const deleteUnitEvent: IUserActivityEvent = {
    name: 'delete-unit-event',
    description: 'delete a unit',
    action: EventAction.delete,
    resource: 'unit',
};
