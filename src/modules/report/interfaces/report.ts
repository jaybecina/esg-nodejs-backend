export enum ReportName {
    "env-report" = "env-report",
    "gov-report" = "gov-report",
    "soc-report" = "soc-report",
}

export interface IReport {
    _id: string,
    name: ReportName,
    calculations: string[];
}

export type calculateResult = {
    value: number;
    fieldsCount: number;
}

export type calculationResult = {
    value: number | "ERROR!",
    reasons: string[],
}
