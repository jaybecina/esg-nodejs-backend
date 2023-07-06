import { IsEnum, IsMongoId, IsObject, IsString } from 'class-validator';

import { NotificationLevel } from "../../notification-template/interfaces/notificationTemplate";
import { INotification, ReceiverType } from "./notification";

export class NotificationPostDto implements Pick<INotification, 'level' | 'receiver' | 'payload'> {
    @IsString()
    uniqueId: string;

    @IsEnum(NotificationLevel)
    level: NotificationLevel;

    @IsMongoId()
    receiver: string;

    @IsObject()
    payload: { [key: string]: string | number; };
}

export type NotificationTriggerData = {
    uniqueId: string,
    level?: NotificationLevel,
    receiver: string,
    receiverType: ReceiverType,
    payload: {[key: string]: string | number},
    createdBy: string,
}