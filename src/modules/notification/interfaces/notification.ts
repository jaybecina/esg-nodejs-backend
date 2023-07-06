import { NotificationLevel } from "../../notification-template/interfaces/notificationTemplate";

export enum ReceiverType {
    form = 'form',
    user = 'user',
}

export interface INotification {
    _id: string,
    notificationTemplate: string,
    level: NotificationLevel, // copy from template or override

    // payload
    payload: {[key: string]: string | number },
    
    receiver: string, // form id / user id
    receiverType: ReceiverType,

    read: boolean,
    // timestamp in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ
    lastReadAt: string,

    createdBy: string,
}