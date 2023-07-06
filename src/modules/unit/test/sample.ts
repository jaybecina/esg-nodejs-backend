import request from "supertest";

import { UnitCreateDto } from "../interfaces/dto";

export type postContentRequestParams = {
    app: any,
    jwt: string,
    data: UnitCreateDto,
}

export const unitSample1: UnitCreateDto = {
    input: 'L',
    output: 'mL',
    rate: 1000,
};

export const unitSample2: UnitCreateDto = {
    input: 'kgCO2e/L',
    output: 'kgCO2e/L',
    rate: 1,
};

export const postUnitRequest = async ({ app, jwt, data }: postContentRequestParams) => {
    return request(app).post(`/unit`)
        .set('Authorization', `Bearer ${jwt}`)
        .send(data);
}
