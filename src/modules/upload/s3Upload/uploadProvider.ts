import S3 from 'aws-sdk/clients/s3';
import { IUploadProvider } from '../interfaces/uploadProvider';

export interface IS3UploadProvider extends IUploadProvider {
    s3Bucket: string;
    s3Client: S3;

    // uploadFile(file: IFileObject, fileFolder:string, fileName: string, ): Promise<S3.ManagedUpload.SendData>;
}