import { EventAction, IUserActivityEvent } from "../interfaces/userActivityLog";

export const editReportEvent: IUserActivityEvent = {
    name: 'edit-report-event',
    description: 'edit a report',
    action: EventAction.edit,
    resource: 'report',
};

export const exportReportEvent: IUserActivityEvent = {
    name: 'export-report-event',
    description: 'export a report',
    action: EventAction.export,
    resource: 'report',
};
