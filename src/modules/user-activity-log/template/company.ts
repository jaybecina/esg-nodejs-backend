import { EventAction, IUserActivityEvent, ResourceType } from "../interfaces/userActivityLog";

export const addCompanyEvent: IUserActivityEvent = {
    name: 'add-company-event',
    description: 'add a company',
    action: EventAction.add,
    resource: 'company',
};

export const editCompanyEvent: IUserActivityEvent = {
    name: 'edit-company-event',
    description: 'edit a company',
    action: EventAction.edit,
    resource: 'company',
};

export const deleteCompanyEvent: IUserActivityEvent = {
    name: 'delete-company-event',
    description: 'delete a company',
    action: EventAction.delete,
    resource: 'company',
};
