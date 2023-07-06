import mongoose from 'mongoose';
import { IFormTemplate } from "./formTemplate";

interface SFormTemplate extends IFormTemplate { }

const formTemplateSchema = new mongoose.Schema<SFormTemplate>({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    uniqueId: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    materials: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'materials'
    }],
}, { timestamps: true });

const FormTemplate = mongoose.model('form_templates', formTemplateSchema);

export default FormTemplate;