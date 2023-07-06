import { MeterPostDto } from "../interfaces/dto";

export const generateMeterPostDto = (form: string, name: string): MeterPostDto => {
    return {
        form,
        name,
        assignees: null
    }
}
