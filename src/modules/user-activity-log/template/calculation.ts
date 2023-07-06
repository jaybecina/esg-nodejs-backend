import { EventAction, IUserActivityEvent } from "../interfaces/userActivityLog";

export const addCalculationEvent: IUserActivityEvent = {
    name: 'add-calculation-event',
    description: 'add a calculation',
    action: EventAction.add,
    resource: 'calculation',
};

export const editCalculationEvent: IUserActivityEvent = {
    name: 'edit-calculation-event',
    description: 'edit a calculation',
    action: EventAction.edit,
    resource: 'calculation',
};

export const deleteCalculationEvent: IUserActivityEvent = {
    name: 'delete-calculation-event',
    description: 'delete a calculation',
    action: EventAction.delete,
    resource: 'calculation',
};
