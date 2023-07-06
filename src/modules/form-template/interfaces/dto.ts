import { ArrayNotEmpty, ArrayUnique, IsArray, IsString } from "class-validator";
import { IBaseApiQueryParams } from "../../../utils/interfaces";
import { IFormTemplate } from "./formTemplate";

export class FormTemplatePostDto implements Omit<IFormTemplate, '_id'> {
    @IsString()
    name: string;

    @IsString()
    uniqueId: string;

    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    @ArrayUnique()
    materials: string[];
}

export class FormTemplateGetParams implements IBaseApiQueryParams {
    page: number = 1;
    limit: number = 10;
    search?: string;
    filters: Partial<Omit<IFormTemplate, '_id' | 'materials'>>;
    sort: {
        updatedAt: -1
    }
}