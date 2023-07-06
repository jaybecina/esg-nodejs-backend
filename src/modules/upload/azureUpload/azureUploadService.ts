import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";
import { IFileObject } from "../interfaces/upload";
import { IUploadFileType } from "../interfaces/uploadProvider";
import { IAzureUploadProvider } from "./azureUploadProvider";

class AzureUploadService implements IAzureUploadProvider {
    accountName: string;
    accountKey: string;
    containerName: string;
    containerUrl: string;

    sharedKeyCredential: StorageSharedKeyCredential
    blobServiceClient: BlobServiceClient;

    constructor() {
        this.accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
        this.accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
        this.containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;
        this.containerUrl = `https://${this.accountName}.blob.core.windows.net/${this.containerName}`;

        this.sharedKeyCredential = new StorageSharedKeyCredential(this.accountName, this.accountKey);
        this.blobServiceClient = new BlobServiceClient(
            `https://${this.accountName}.blob.core.windows.net`,
            this.sharedKeyCredential,
        );
    }

    async uploadFile(file: IFileObject, fileFolder: string, fileName: string) {
        const containerClient = this.blobServiceClient.getContainerClient(this.containerName);

        const blockBlobClient = containerClient.getBlockBlobClient(`${fileFolder}/${fileName}`)

        await blockBlobClient.uploadData(file.buffer);

        const result: IUploadFileType = {
            Location: `${this.containerUrl}/${fileFolder}/${fileName}`,
        }
        return result
    }
}

export default AzureUploadService;
