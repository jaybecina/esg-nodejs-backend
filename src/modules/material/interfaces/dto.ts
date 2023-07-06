import { Type } from 'class-transformer';
import { IsInt, IsString, IsArray, IsEnum, ValidateNested, Max, Min, ArrayNotEmpty, ArrayUnique, IsBoolean, IsOptional } from 'class-validator';
import { IBaseApiQueryParams } from '../../../utils/interfaces';
import { IMaterial, inputType, IQnaMatrix, IQnaMatrixColumn, IQnaMatrixRow, IQnaText, qnaType } from "./materialForm";

// POST
export class MaterialQnaMatrixRowPostDto implements IQnaMatrixRow {
    @IsString()
    name: string;
}

export class MaterialQnaMatrixColumnPostDto implements IQnaMatrixColumn {
    @IsString()
    name: string;

    @IsEnum(inputType)
    inputType: inputType;

    @IsString()
    outputUnit: string;
}

export class MaterialQnaMatrixPostDto implements IQnaMatrix {
    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => MaterialQnaMatrixRowPostDto)
    rows: MaterialQnaMatrixRowPostDto[];

    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => MaterialQnaMatrixColumnPostDto)
    columns: MaterialQnaMatrixColumnPostDto[];
}
export class MaterialQnaTextPostDto implements IQnaText {
    @IsString()
    question: string;

    @IsString()
    hints: string;
}

export class MaterialPostDto implements Omit<IMaterial, '_id' | 'version' | 'latest'> {
    @IsString()
    name: string;

    @IsString()
    uniqueId: string;

    @IsInt()
    @Min(1)
    @Max(12)
    size: number;

    @IsString()
    @IsEnum(qnaType)
    type: qnaType;

    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type((type) => {
        if (type.object.type === qnaType.text) {
            return MaterialQnaTextPostDto;
        } else {
            return MaterialQnaMatrixPostDto;
        }
    })
    @ArrayUnique<MaterialQnaTextPostDto | MaterialQnaMatrixPostDto>((qnaRow) => {
        if (qnaRow instanceof MaterialQnaTextPostDto) {
            return qnaRow.question;
        } else {
            // don't need to check unique here
            return qnaRow;
        }
    })
    content: Array<MaterialQnaTextPostDto | MaterialQnaMatrixPostDto>;
}

// GET
export class MaterialGetParams implements IBaseApiQueryParams {
    page: number = 1;
    limit: number = 10;
    search?: string;
    filters: Partial<Omit<IMaterial, '_id' | 'content'>>;

    @IsOptional()
    @IsBoolean()
    bookmarked?: boolean;

    sort: {
        updatedAt: 1;
    }
}