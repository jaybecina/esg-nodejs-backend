import { IPointer } from "../../pointer/interfaces/pointer";

export interface ICalculation {
    _id: string,
    name: string,
    uniqueId: string,
    version: number;
    latest: boolean;
    unit: string,
    expression: IPointer[],
}
