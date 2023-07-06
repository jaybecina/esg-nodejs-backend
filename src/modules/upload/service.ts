import { recurisveObjectIdStringifyer } from '../../utils';
import crudService from '../../utils/crudService';
import entities from './interfaces/entities';
import { IFileObject } from './interfaces/upload';
import S3UploadService from "./s3Upload/s3UploadService";
import S3TestUploadService from "./s3Upload/s3TestUploadService";
import { IUploadProvider } from './interfaces/uploadProvider';
import AzureUploadService from './azureUpload/azureUploadService';

const isTest = process.env.TEST === 'true';

class UploadService extends crudService {
    private cloudUploadService: IUploadProvider;

    constructor() {
        super(entities);

        if (isTest) {
            this.cloudUploadService = new S3TestUploadService();
        } else {
            if (process.env.STORAGE_SERVICE === 'AWS') {
                this.cloudUploadService = new S3UploadService();
            } else if (process.env.STORAGE_SERVICE === 'Azure') {
                this.cloudUploadService = new AzureUploadService();
            } else {
                throw new Error("Please select 'AWS' or 'Azure' in .env");
            }
        }
    }

    // Using uploadFile() to override create
    async create() { }

    async uploadFile(file: IFileObject, userId: string, folder: string = '', addTimestampOnFileName: boolean = true) {
        let fileName = `${file.originalname}`;

        if (addTimestampOnFileName) {
            fileName = `${Date.now()}_${file.originalname}`;
        }

        const uploadedFileInfo = await this.cloudUploadService.uploadFile(file, `uploads${folder}`, fileName);

        const result = await entities.create({
            name: fileName,
            mimetype: file.mimetype,
            size: file.size,
            url: uploadedFileInfo.Location,
            createdBy: userId,
        });

        return recurisveObjectIdStringifyer(result.toObject());
    }
}

export default UploadService;