import { IUpload } from "../../upload/interfaces/upload";

export interface IMeter {
    _id: string,

    form: string, // required
    company: string, // required
    financialYear: string, // required, yyyy-mm-dd, deadline of form

    name: string,

    assignees: string[] | null, // null = all user can access, empty array no one can input

    inputs: MeterInput[],

    attachments: IMeterAttachment[],

    approved: boolean | null,
    errorReason: string,

    finished: boolean, // user submit
    checked: boolean, // client admin submit
}

export interface IMeterAttachment {
    file: IUpload,
    description: string,
}

export type MeterInput = IMeterInputText[] | IMeterInputMatrix;

export interface IMeterInputText {
    answer: string;
}

export interface IMeterInputMatrix {
    answer: (string | number)[][];
    unit: string[];
}

export type MeterRequiredUpdateData = Pick<IMeter, '_id'>;

export type MeterApprovalData = MeterRequiredUpdateData
    & Pick<IMeter, 'finished' | 'checked' | 'approved' | 'errorReason'>;

export type MeterUserInputData = MeterRequiredUpdateData
    & Pick<IMeter, 'finished'>
    & Partial<Pick<IMeter, 'name' | 'inputs'>> & {
        removeAttachments?: string[],
    };

export type MeterAdminCheckData = MeterUserInputData
    & MeterApprovalData
    & Partial<Pick<IMeter, 'assignees'>>;

export type MeterAttachmentData = Pick<IMeterAttachment, 'description'> & {
    file: string,
};

export type MeterPushAttachmentsData = MeterRequiredUpdateData & {
    attachments: MeterAttachmentData[],
}

export type MeterUpdateAttachmentData = MeterRequiredUpdateData & {
    attachmentId: string,
    description: string,
}

export type MaterialInputResult = {
    row: string,
    col: string,
    value: number;
    unit: string;
}
