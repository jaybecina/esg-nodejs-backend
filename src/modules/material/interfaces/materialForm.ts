
export enum qnaType {
    text = 'text',
    matrix = 'matrix',
}

export enum inputType {
    text = 'text',
    number = 'number',
}

export type IQnaText = {
    question: string;
    hints: string;
}

export type IQnaMatrix = {
    rows: IQnaMatrixRow[];
    columns: IQnaMatrixColumn[];
}

export type IQnaMatrixRow = {
    name: string;
}

export type IQnaMatrixColumn = {
    name: string;
    inputType: inputType;
    outputUnit: string;
}

export type IQnaRow = IQnaText | IQnaMatrix;

export interface IMaterial {
    _id: string;
    name: string;
    uniqueId: string;
    size: number; // 1 - 12
    type: qnaType;
    content: IQnaRow[];
    version: number;
    latest: boolean;
}
