import { EventAction, IUserActivityEvent } from "../interfaces/userActivityLog";

export const addMaterialEvent: IUserActivityEvent = {
    name: 'add-material-event',
    description: 'add a material',
    action: EventAction.add,
    resource: 'material',
};

export const editMaterialEvent: IUserActivityEvent = {
    name: 'edit-material-event',
    description: 'edit a material',
    action: EventAction.edit,
    resource: 'material',
};

export const deleteMaterialEvent: IUserActivityEvent = {
    name: 'delete-material-event',
    description: 'delete a material',
    action: EventAction.delete,
    resource: 'material',
};
