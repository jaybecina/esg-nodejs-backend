import mongoose from 'mongoose';
import { IUpload } from "./upload";

interface SUpload extends Omit<IUpload, 'createdBy'> {
    createdBy: mongoose.Types.ObjectId;
}

const uploadSchema = new mongoose.Schema<SUpload>({
    name: { type: String, required: true, },
    mimetype: { type: String, required: true, },
    size: { type: Number, required: true, },
    url: { type: String, required: true, },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true, 
        ref: 'users'
    },
}, { timestamps: true });

const Upload = mongoose.model('uploads', uploadSchema);

export default Upload;
