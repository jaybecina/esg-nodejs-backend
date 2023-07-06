import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { IBaseApiQueryParams } from '../../../utils/interfaces';

import { IConstant, IMeta } from "./constant";

export class ConstantMetaPostDto implements IMeta {
    @IsString()
    @IsNotEmpty()
    location: string;

    @IsNumber()
    value: number;
}

export class ConstantPostDto implements Omit<IConstant, '_id'> {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    uniqueId: string;

    @IsNumber()
    @Min(1990)
    @Max(2099)
    year: number; // YYYY

    @IsOptional()
    @IsString()
    unit: string;

    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => ConstantMetaPostDto)
    meta: ConstantMetaPostDto[];

    @IsString()
    remarks: string;
}

export class ConstantUpdateDto implements Omit<IConstant, '_id' | 'uniqueId'> {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsNumber()
    @Min(1990)
    @Max(2099)
    year: number; // YYYY

    @IsOptional()
    @IsString()
    unit: string;

    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => ConstantMetaPostDto)
    meta: ConstantMetaPostDto[];

    @IsString()
    remarks: string;
}

export class ConstantGetParams implements IBaseApiQueryParams {
    filters: Partial<IConstant>;
    page: number = 1;
    limit: number = 10;
    search?: string;
    sort?: {
        updatedAt: -1
    }
}
