import S3 from 'aws-sdk/clients/s3';
import { IFileObject } from '../interfaces/upload';
import { IS3UploadProvider } from './uploadProvider';

class S3TestUploadService implements IS3UploadProvider {
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

    async uploadFile(file: IFileObject, fileFolder: string, fileName: string): Promise<S3.ManagedUpload.SendData> {
        if (!file.buffer) {
            throw new Error("Can't read the file");
        }

        const uploadedFileInfo: S3.ManagedUpload.SendData = {
            Location: `https://${process.env.S3_BUCKET}.s3.ap-east-1.amazonaws.com/${fileFolder}/${fileName}`,
            ETag: '"random15f7237774b810a442bb2abcd"',
            Bucket: process.env.S3_BUCKET,
            Key: `${fileFolder}/${fileName}`
        };

        return uploadedFileInfo;
    }
}

export default S3TestUploadService;