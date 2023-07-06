import { Types } from 'mongoose';
import { IFormTemplate } from "../../form-template/interfaces/formTemplate";
import { IMeter } from "../../meter/interfaces/meter";

export enum formStatus {
    inProgress = 'in-progress',
    submitted = 'submitted',
    error = 'error',
    checkAgain = 'check-again',
    completed = 'completed',
}

export interface IForm {
    _id: string,
    formTemplate: IFormTemplate, // copy

    company: string, // required
    financialYear: string, // required, yyyy-mm-dd, deadline of form

    status: formStatus, // default: inProgress

    // only editingUser should have access to that Form
    editingUser: string | null, // default: null
    locked: Date | null, // default: null

    meters: IMeter[],

    assignees: string[] | null, // null = all user can access, empty array no one can input

    materialFieldsCount: number; // number of fields in all materials
    inputtedFieldsCount: number; // number of inputted fields in all meters
    fieldsTotal: number; // number of fields in all meters, materialFieldsCount * number of meters
    inputProgress: number; // = inputtedFieldsCount / fieldsTotal, for sorting

    adminCheckedCount: number; // number of admin checked meters
    adminCheckedProgress: number; // = adminChecked / number of meters

    attachmentsCount: number; // number of attachment in the meters
}

export interface IFormPopulateMaterials extends Omit<IForm, 'formTemplate'> {
    formTemplate: Omit<IFormTemplate, 'materials'> & {
        materials: Types.ObjectId[],
    }
}
