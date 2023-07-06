import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsEnum, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { IBaseApiQueryParams } from '../../../utils/interfaces';
import { IPointer, pointerMethod } from "../../pointer/interfaces/pointer";
import { ICalculation } from "./calculation";

export class CalculationPointerPostDto implements IPointer{
    @IsString()
    text: string;

    @IsEnum(pointerMethod)
    method: pointerMethod;

    @IsOptional()
    @IsString()
    materialId?: string;

    @IsOptional()
    @IsString()
    materialUniqueId?: string;

    @IsOptional()
    @IsNumber()
    row?: number;

    @IsOptional()
    @IsNumber()
    col?: number;

    @IsOptional()
    @IsObject()
    payload?: { [key: string]: string | number }

    @IsOptional()
    @IsString()
    calculationUniqueId?: string;

    @IsOptional()
    @IsString()
    constantUniqueId?: string;
}

export class CalculationPostDto implements Omit<ICalculation, '_id' | 'version' | 'latest'> {
    @IsString()
    name: string;

    @IsString()
    uniqueId: string;

    @IsOptional()
    @IsString()
    unit: string;

    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type((obj) => CalculationPointerPostDto)
    expression: CalculationPointerPostDto[];
}

export class CalculationGetParams implements IBaseApiQueryParams {
    page: number = 1;
    limit: number = 10;
    search?: string;
    filters: Partial<Omit<ICalculation, '_id' | 'expression'>>;
    sort: {
        updatedAt: -1
    }
}
