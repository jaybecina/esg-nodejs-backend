import { Authorized, CurrentUser, JsonController, Post, UploadedFiles } from 'routing-controllers';
import { ICurrentUser, Roles } from '../auth/interfaces/auth';
import { IFileObject } from './interfaces/upload';
import UploadService from "./service";

const path = 'upload';

@JsonController()
class UploadController {
    private service: UploadService;

    constructor() {
        this.service = new UploadService();
    }

    @Authorized([Roles.superAdmin])
    @Post(`/${path}`)
    async upload(
        @UploadedFiles("files") files: IFileObject[],
        @CurrentUser() user: ICurrentUser,
    ) {
        const uploadedFiles = await Promise.all(files.map(async (file) => {
            const result = await this.service.uploadFile(file, user._id);
            return result;
        }));

        return { status: 'success', data: uploadedFiles };
    }
}

export default UploadController;