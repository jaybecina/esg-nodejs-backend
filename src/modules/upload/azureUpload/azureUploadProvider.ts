import { IUploadProvider } from '../interfaces/uploadProvider';

export interface IAzureUploadProvider extends IUploadProvider {
    accountName: string;
    accountKey: string;
    containerName: string;
    containerUrl: string;
}