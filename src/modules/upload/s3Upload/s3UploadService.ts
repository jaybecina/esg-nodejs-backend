import S3 from 'aws-sdk/clients/s3';
import { IFileObject } from '../interfaces/upload';
import { IS3UploadProvider } from './uploadProvider';

class S3UploadService implements IS3UploadProvider {
    s3Bucket: string;
    s3Client: S3;

    constructor() {
        this.s3Client = new S3({
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
            endpoint: process.env.S3_UPLOAD_ENDPOINT,
        })
        this.s3Bucket = process.env.S3_BUCKET;
    }

    async uploadFile(file: IFileObject, fileFolder:string, fileName: string, ) {        
        const uploadedFileInfo = await this.s3Client.upload({
            Bucket: this.s3Bucket,
            Key: `${fileFolder}/${fileName}`,
            Body: file.buffer,
        }).promise();

        return uploadedFileInfo;
    }
}

export default S3UploadService;