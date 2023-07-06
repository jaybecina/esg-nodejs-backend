import mongoose from 'mongoose';
import { IForm, formStatus } from './form';

interface SForm extends Omit<IForm, 'company' | 'editingUser'> {
    company: mongoose.Types.ObjectId,
    editingUser: mongoose.Types.ObjectId,
}

const formSchema = new mongoose.Schema<SForm>({
    formTemplate: {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        uniqueId: {
            type: String,
            required: true,
            trim: true,
        },
        materials: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'materials'
        }],
    },

    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'companies',
        required: true,
    },
    financialYear: String,

    status: {
        type: String,
        enum: formStatus,
        default: formStatus.inProgress,
        required: true,
    },

    editingUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        default: null,
    },
    locked: {
        type: Date,
        default: null,
    },

    meters: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'meters',
    }],

    assignees: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        default: null,
    }],

    materialFieldsCount: {
        type: Number,
        required: true,
        immutable: true,
    },
    inputtedFieldsCount: {
        type: Number,
        required: true,
        default: 0,
    },
    fieldsTotal: {
        type: Number,
        required: true,
    },
    inputProgress: {
        type: Number,
        required: true,
        default: 0,
    },

    adminCheckedCount: {
        type: Number,
        required: true,
        default: 0,
    },
    adminCheckedProgress: {
        type: Number,
        required: true,
        default: 0,
    },

    attachmentsCount: {
        type: Number,
        required: true,
        default: 0,
    },
}, { timestamps: true });

formSchema.index({
    'formTemplate.name': 'text',
});

const Form = mongoose.model('forms', formSchema);

export default Form;