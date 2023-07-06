import { ConstantPostDto } from "../interfaces/dto";

export const constantSample: ConstantPostDto = {
    name: "Mobile combustionPetrol (gasoline)CO2",
    uniqueId: "mobile-combustion-01",
    year: 2022,
    unit: "kgCO2e/L",
    meta: [
        {
            location: "China Northwest",
            value: 2.2638
        },
        {
            location: "Global",
            value: 2.36
        },
        {
            location: "Hong Kong",
            value: 2.36
        },
    ],
    remarks: "test"
}

export const constantSample2: ConstantPostDto = {
    name: "F45",
    uniqueId: "f45",
    year: 2022,
    unit: "kg",
    meta: [
        {
            location: "Hong Kong",
            value: 0.0161,
        },
    ],
    remarks: "",
}
