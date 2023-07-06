import { FormTemplatePostDto } from "../interfaces/dto";

const sampleFormTemplate: FormTemplatePostDto = {
    name: 'Gas consumption Form',
    uniqueId: 'gas-consumption-form',
    materials: [], // need to add material IDs
}

const sampleFormTemplate2: FormTemplatePostDto = {
    name: 'Gas consumption Form 2',
    uniqueId: 'gas-consumption-form-2',
    materials: [], // need to add material IDs
}

export const sampleFormTemplates = [sampleFormTemplate, sampleFormTemplate2];
