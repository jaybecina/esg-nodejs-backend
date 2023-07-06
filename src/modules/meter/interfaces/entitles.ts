import mongoose from 'mongoose';
import { IMeter } from './meter';

export interface SMeter extends Omit<IMeter, 'form' | 'company' | 'assignees' | 'attachments'> {
    form: mongoose.Types.ObjectId,
    company: mongoose.Types.ObjectId,
    assignees: mongoose.Types.ObjectId,
    attachments: {
        file: mongoose.Types.ObjectId,
        description: string;
    }[]
}

const formSchema = new mongoose.Schema<SMeter>({
    form: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'forms',
        required: true,
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'companies',
        required: true,
    },
    financialYear: { type: String, required: true },

    name: { type: String, required: true },

    assignees: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        default: null,
    }],

    inputs: [{ type: mongoose.Schema.Types.Mixed }],

    attachments: [{
        file: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'uploads'
        },
        description: { type: String, default: '' },
    }],

    approved: { type: Boolean, default: null, },
    errorReason: { type: String, default: '' },

    finished: { type: Boolean, default: false, },
    checked: { type: Boolean, default: false, },
}, { timestamps: true });

const Meter = mongoose.model('meters', formSchema);

export default Meter;