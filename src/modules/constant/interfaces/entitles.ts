import mongoose from 'mongoose';
import { IConstant } from './constant';

interface SConstant extends IConstant {}

const constantSchema = new mongoose.Schema<SConstant>({
    name: { type: String, required: true, trim: true, },
    uniqueId: { type: String, required: true, trim: true, unique: true, },
    year: { type: Number, required: true, },

    unit: { type: String, default: '' },
    meta: [{
        location: { type: String, required: true },
        value: { type: Number, required: true },
    }],

    remarks: { type: String, default: '' },
}, { timestamps: true });

const Form = mongoose.model('constants', constantSchema);

export default Form;
