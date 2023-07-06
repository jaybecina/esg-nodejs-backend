export interface IUpload {
    _id: string,
    name: string,
    mimetype: string,
    size: number,
    url: string,
    createdBy: string,
}

export interface IFileObject extends Pick<Express.Multer.File,
    'fieldname' | 'originalname' | 'encoding' | 'mimetype' | 'buffer' | 'size'
> {
}