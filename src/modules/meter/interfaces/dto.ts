import { ArrayNotEmpty, ArrayUnique, IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';
import { IBaseApiQueryParams } from '../../../utils/interfaces';
import { IMeter, IMeterInputMatrix, IMeterInputText, MeterInput, IMeterAttachment } from "./meter";

export const MeterOmitUpdateBody = ['_id', 'form', 'company', 'financialYear', 'attachments', 'finished', 'checked'] as const
type TypeMeterOmitUpdateBody = typeof MeterOmitUpdateBody[number]

export class MeterPostDto implements Pick<IMeter, 'form' | 'name' | 'assignees'> {
    @IsString()
    form: string;

    @IsString()
    name: string;

    @IsOptional()
    @IsArray()
    assignees: string[] | null;
}

export class MeterPutDto implements Omit<IMeter, TypeMeterOmitUpdateBody>{
    @IsString()
    name: string;

    @IsOptional()
    @IsArray()
    @ArrayUnique()
    assignees: string[];

    @IsArray()
    @ArrayNotEmpty()
    inputs: MeterInput[];

    @IsBoolean()
    approved: boolean;

    @IsOptional()
    @IsString()
    errorReason: string;

    @IsArray()
    removeAttachments: string[];

    // for button 'save' & 'submit'
    @IsBoolean()
    submitted: boolean;
}

export class MeterAddAttachmentsDto {
    @IsArray()
    @ArrayNotEmpty()
    descriptions: string[];
}

export class MeterAttachmentUpdateDto implements Omit<IMeterAttachment, 'file'>{
    @IsString()
    description: string;
}

export class MeterInputText implements IMeterInputText {
    public answer: string;

    constructor(answer: string) {
        this.answer = answer;
    }
}

export class MeterInputMatrix implements IMeterInputMatrix {
    public answer: (string | number)[][];
    public unit: string[];

    constructor(answer: (string | number)[][], unit: string[]) {
        this.answer = answer;
        this.unit = unit;
    }
}

export class MeterGetParams implements IBaseApiQueryParams {
    page: number = 1;
    limit: number = 10;
    search?: string;
    filters: Partial<Pick<IMeter, 'name' | 'company' | 'financialYear' | 'assignees' | 'approved'>>;
}

export type MaterialProgressData = {
    companyId: string;
    formId?: string;
    financialYear: string;
    materialId: string;
}
