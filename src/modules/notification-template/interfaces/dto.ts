import { ArrayUnique, IsArray, IsEnum, IsNotEmpty, IsString } from "class-validator";
import { IBaseApiQueryParams } from "../../../utils/interfaces";
import { INotificationTemplate, NotificationLevel } from "./notificationTemplate";

export class NotificationTemplatePostDto implements Omit<INotificationTemplate, '_id'> {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsString()
    uniqueId: string;

    @IsString()
    description: string;

    @IsEnum(NotificationLevel)
    level: NotificationLevel;

    @IsString()
    label: string;

    @IsNotEmpty()
    @IsString()
    header: string;

    @IsString()
    content: string;

    @IsArray()
    @IsString({ each: true })
    @ArrayUnique()
    variables: string[];
}

export class NotificationTemplateGetParams implements IBaseApiQueryParams {
    page: number = 1;
    limit: number = 10;
    search?: string;
    filters: Partial<Omit<INotificationTemplate, '_id'>>;
}