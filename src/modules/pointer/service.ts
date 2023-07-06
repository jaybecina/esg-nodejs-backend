import { IQnaMatrix, inputType } from "../material/interfaces/materialForm";
import { functionPayloadMap } from "./interfaces/const";
import { calcPointerText, ICalcPointer, ICalculationPointer, IConstantPointer, IMaterialPointer, IPointer, pointerFunctionMethodArr, pointerFunctionMethodType, pointerMethod } from "./interfaces/pointer";

class PointerService {
    public generateBasePointers(): ICalcPointer[] {
        return Object.values(calcPointerText).map((pointerText) => {
            return {
                text: pointerText,
                method: !isNaN(parseFloat(pointerText))
                    ? pointerMethod.number
                    : pointerMethod.operator,
            }
        })
    }

    public generateConstantPointer(constantUniqueId:string, year: string): IConstantPointer[] {
        return [{
            text: `${constantUniqueId}_(${year})`,
            method: pointerMethod.constant,
            constantUniqueId: constantUniqueId,
        }]
    }

    public generateCalculationPointer(calculationUniqueId: string): ICalculationPointer[] {
        return [{
            text: calculationUniqueId,
            method: pointerMethod.calculation,
            calculationUniqueId,
        }]
    }

    public generateFunctionPointers(materialId: string, uniqueId: string, matrix: IQnaMatrix): IMaterialPointer[] {
        const arr: IMaterialPointer[] = [];

        const sumPointers = this.generateSumPointers(materialId, uniqueId, matrix);
        const countIfPointers = this.generateCountIfPointers(materialId, uniqueId, matrix);

        return arr.concat(sumPointers, countIfPointers);
    }

    public generateSumPointers(materialId: string, uniqueId: string, matrix: IQnaMatrix): IMaterialPointer[] {
        const methodType = pointerMethod.sum;
        const arr: IMaterialPointer[] = [];

        const isColumnsHaveNumberType = matrix.columns.some((column) => {
            return column.inputType === inputType.number;
        })        

        // rows & cols
        for (let r = 0; r < matrix.rows.length; r++) {
            for (let c = 0; c < matrix.columns.length; c++) {
                if (matrix.columns[c].inputType !== inputType.number) {
                    continue;
                }

                arr.push({
                    text: `${uniqueId}_row_${r}_col_${c}-${methodType}`,
                    materialId,
                    materialUniqueId: uniqueId,
                    row: r,
                    col: c,
                    method: methodType,
                    payload: functionPayloadMap[methodType].reduce((accumulator, value) => {
                        return { ...accumulator, [value]: '' };
                    }, {})
                })
            }
        }

        // rows only
        if (isColumnsHaveNumberType) {
            for (let r = 0; r < matrix.rows.length; r++) {
                arr.push({
                    text: `${uniqueId}_row_${r}-${methodType}`,
                    materialId,
                    materialUniqueId: uniqueId,
                    row: r,
                    col: -1,
                    method: methodType,
                    payload: functionPayloadMap[methodType].reduce((accumulator, value) => {
                        return { ...accumulator, [value]: '' };
                    }, {})
                })
            }
        }

        // columns only
        for (let c = 0; c < matrix.columns.length; c++) {
            if (matrix.columns[c].inputType !== 'number') {
                continue;
            }

            arr.push({
                text: `${uniqueId}_col_${c}-${methodType}`, materialId,
                materialUniqueId: uniqueId,
                row: -1,
                col: c,
                method: methodType,
                payload: functionPayloadMap[methodType].reduce((accumulator, value) => {
                    return { ...accumulator, [value]: '' };
                }, {})
            })
        }

        // all
        if (isColumnsHaveNumberType) {
            arr.push({
                text: `${uniqueId}-${methodType}`,
                materialId,
                materialUniqueId: uniqueId,
                row: -1,
                col: -1,
                method: methodType,
                payload: functionPayloadMap[methodType].reduce((accumulator, value) => {
                    return { ...accumulator, [value]: '' };
                }, {})
            })
        }

        return arr;
    }

    public generateCountIfPointers(materialId: string, uniqueId: string, matrix: IQnaMatrix): IMaterialPointer[] {
        const methodType = pointerMethod.countif;
        const arr: IMaterialPointer[] = [];

        // rows & cols
        for (let r = 0; r < matrix.rows.length; r++) {
            for (let c = 0; c < matrix.columns.length; c++) {
                arr.push({
                    text: `${uniqueId}_row_${r}_col_${c}-${methodType}_{{search}}`,
                    materialId,
                    materialUniqueId: uniqueId,
                    row: r,
                    col: c,
                    method: methodType,
                    payload: functionPayloadMap[methodType].reduce((accumulator, value) => {
                        return { ...accumulator, [value]: '' };
                    }, {})
                })
            }
        }

        // rows only
        for (let r = 0; r < matrix.rows.length; r++) {
            arr.push({
                text: `${uniqueId}_row_${r}-${methodType}_{{search}}`,
                materialId,
                materialUniqueId: uniqueId,
                row: r,
                col: -1,
                method: methodType,
                payload: functionPayloadMap[methodType].reduce((accumulator, value) => {
                    return { ...accumulator, [value]: '' };
                }, {})
            })
        }

        // columns only
        for (let c = 0; c < matrix.columns.length; c++) {
            arr.push({
                text: `${uniqueId}_col_${c}-${methodType}_{{search}}`, materialId,
                materialUniqueId: uniqueId,
                row: -1,
                col: c,
                method: methodType,
                payload: functionPayloadMap[methodType].reduce((accumulator, value) => {
                    return { ...accumulator, [value]: '' };
                }, {})
            })
        }

        // all
        arr.push({
            text: `${uniqueId}-${methodType}_{{search}}`,
            materialId,
            materialUniqueId: uniqueId,
            row: -1,
            col: -1,
            method: methodType,
            payload: functionPayloadMap[methodType].reduce((accumulator, value) => {
                return { ...accumulator, [value]: '' };
            }, {})
        })

        return arr;
    }

    public isIMaterialPointer(pointer: IPointer): pointer is IMaterialPointer {
        return 'materialId' in pointer
            && 'materialUniqueId' in pointer
            && 'row' in pointer
            && 'col' in pointer;
    }

    public isICalculationPointer(pointer: IPointer): pointer is ICalculationPointer {
        return 'calculationUniqueId' in pointer
            && pointer.method === pointerMethod.calculation;
    }

    public isIConstantPointer(pointer: IPointer): pointer is IConstantPointer{
        return 'constantUniqueId' in pointer
        && pointer.method === pointerMethod.constant;
    }
}

export default PointerService;
