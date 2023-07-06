import { IFileObject } from "./upload";

export interface IUploadFileType {
    // URL
    Location: string;
}

export interface IUploadProvider {
    uploadFile(file: IFileObject, fileFolder:string, fileName: string, ): Promise<IUploadFileType>;
}