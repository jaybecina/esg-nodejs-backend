import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { IBaseApiQueryParams } from '../../../utils/interfaces';
import { INotification } from '../../notification/interfaces/notification';
import { formStatus, IForm } from "./form";

export class FormPostDto implements Omit<Pick<IForm, 'formTemplate' | 'company' | 'financialYear' | 'assignees'>, 'formTemplate'> {
    @IsString()
    formTemplate: string;

    @IsString()
    company: string;

    @Matches(/^\d{4}(-)(((0)[0-9])|((1)[0-2]))(-)([0-2][0-9]|(3)[0-1])$/i, {
        message: "$property must be formatted as yyyy-mm-dd"
    })
    financialYear: string;

    @IsOptional() // for set to null
    @IsArray()
    assignees: string[] | null;
}

export class FormPutDto implements Pick<IForm, 'assignees'> {
    // for button 'save' & 'submit'
    @IsBoolean()
    submitted: boolean;

    @IsEnum(formStatus)
    nextStatus: formStatus;

    @IsOptional() // for set to null
    @IsArray()
    assignees: string[] | null;
}

export class FormLockPostDto {
    @IsBoolean()
    locked: boolean;
}

export class FormGetParams implements IBaseApiQueryParams {
    page: number = 1;
    limit: number = 10;
    search?: string;
    filters: Partial<Omit<IForm, '_id' | 'formTemplate' | 'meters' | 'editingUser' | 'locked'>>;

    @IsOptional()
    @IsBoolean()
    bookmarked?: boolean;

    sort: {
        updateAt: number,
        inputProgress: number,
        adminCheckedProgress: number,
    }
}

export class FormNotificationGetParams implements IBaseApiQueryParams {
    page: number = 1;
    limit: number = 10;
    search?: string;
    filters: Partial<Pick<INotification, 'level' | 'read'>>;
}

export type FormRequiredUpdateData = Pick<IForm, '_id'>;

export type FormUserInputData = FormRequiredUpdateData
    & Pick<IForm, 'status'>;

export type FormAdminInputData = FormRequiredUpdateData
    & Pick<IForm, 'status'>
    & Partial<Pick<IForm, 'assignees'>>;
