import { IsArray, IsEnum, } from 'class-validator';
import { IBaseApiQueryParams } from '../../../utils/interfaces';
import { IReport, ReportName } from './report';

export class ReportPostDto implements Omit<IReport, '_id'> {
    @IsEnum(ReportName)
    name: ReportName;

    @IsArray()
    calculations: string[];
}

export class ReportGetParams implements IBaseApiQueryParams {
    filters: Partial<IReport>;
    page: number = 1;
    limit: number = 10;
}

export class ReportDownloadParams {
    format: string;
    locale: string = 'en';
}
