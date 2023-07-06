export enum pointerMethod {
    // base method
    number = 'number',
    operator = 'operator',

    // constant
    constant = 'constant',

    // calculation
    calculation = 'calculation',

    // function method
    sum = 'sum',
    countif = 'countif',
}

export enum calcPointerText {
    addition = '+', subtraction = '-', multiplication = '*',
    division = '/', leftBracket = '(', rightBracket = ')',
    num0 = '0', num1 = '1', num2 = '2', num3 = '3', num4 = '4',
    num5 = '5', num6 = '6', num7 = '7', num8 = '8', num9 = '9',
    dot = '.'
}

// Material Pointer
export const pointerFunctionMethodArr = [
    pointerMethod.sum,
    pointerMethod.countif,
] as const;
export type pointerFunctionMethodType = typeof pointerFunctionMethodArr[number];

export interface IMaterialPointer extends IPointer {
    text: string,
    method: pointerFunctionMethodType,
    materialId: string,
    materialUniqueId: string,
    row: number,
    col: number,
}

// Calculation Pointer
export const pointerCalculationMethodArr = [pointerMethod.calculation] as const;
export type pointerCalculationMethodType = typeof pointerCalculationMethodArr[number];

export interface ICalculationPointer extends IPointer {
    text: string,
    method: pointerCalculationMethodType,
    calculationUniqueId: string,
}

// Base Pointer
export const pointerBaseMethodArr = [pointerMethod.number, pointerMethod.operator] as const;
export type pointerBaseMethodType = typeof pointerBaseMethodArr[number];

export interface ICalcPointer extends IPointer {
    text: calcPointerText,
    method: pointerBaseMethodType,
}

// Constant Pointer
export const pointerConstantMethodArr = [pointerMethod.constant] as const;
export type pointerConstantMethodType = typeof pointerConstantMethodArr[number];

export interface IConstantPointer {
    text: string,
    method: pointerConstantMethodType,
    constantUniqueId: string,
}

export interface IPointer {
    text: string,
    method: pointerMethod,

    materialId?: string,
    materialUniqueId?: string,
    row?: number,
    col?: number,
    payload?: { [key: string]: string | number },

    calculationUniqueId?: string,

    constantUniqueId?: string,
}
