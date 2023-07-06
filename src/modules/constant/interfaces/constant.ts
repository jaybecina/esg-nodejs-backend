export interface IConstant {
    _id: string,
    name: string,
    uniqueId: string,
    year: number, // YYYY

    unit: string,
    meta: IMeta[],

    remarks: string,
}

export interface IMeta {
    location: string,
    value: number,
}
