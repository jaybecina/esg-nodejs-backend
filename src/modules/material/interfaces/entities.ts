import mongoose from 'mongoose';
import { IMaterial, qnaType } from './materialForm';

interface SMaterial extends IMaterial { }

export interface MaterialDocument extends mongoose.HydratedDocument<SMaterial> { }

const materialSchema = new mongoose.Schema<SMaterial>({
    name: { type: String, required: true, trim: true, },
    uniqueId: { type: String, required: true, trim: true },
    size: { type: Number, required: true, min: 1, max: 12 },
    type: { type: String, required: true, enum: Object.values(qnaType) },
    content: [
        {
            _id: false,

            // IQnaText
            question: {
                required: function () { return this.type === qnaType.text },
                type: String,
                trim: true,
            },
            hints: {
                required: function () { return this.type === qnaType.text },
                type: String,
                trim: true
            },

            // IQnaMatrix
            rows: {
                required: function () { return this.type === qnaType.matrix },
                default: undefined,
                type: [{
                    _id: false,
                    name: { type: String, trim: true, },
                }]
            },
            columns: {
                required: function () { return this.type === qnaType.matrix },
                default: undefined,
                type: [{
                    _id: false,
                    name: { type: String, trim: true, },
                    inputType: { type: String, trim: true, },
                    outputUnit: { type: String, trim: true, },
                }]
            },
        }
    ],
    version: {
        default: 1,
        type: Number,
    },
    latest: {
        default: true,
        type: Boolean,
    }
}, { timestamps: true })

materialSchema.index({
    uniqueId: 1,
    version: 1,
}, { unique: true });

const Material = mongoose.model('materials', materialSchema);

export default Material;