import mongoose from 'mongoose';
import { pointerMethod } from '../../pointer/interfaces/pointer';
import { ICalculation } from "./calculation";

export interface SCalculation extends ICalculation {}

const calculationSchema = new mongoose.Schema<SCalculation>({
    name: { type: String, required: true, },
    uniqueId: { type: String, required: true, },
    version: {
        default: 1,
        type: Number,
    },
    latest: {
        default: true,
        type: Boolean,
    },

    unit: { type: String, },
    expression: [{
        text: { type: String, required: true, },
        method: { type: String, required: true, enum: Object.values(pointerMethod) },
        
        materialId: { type: String, },
        materialUniqueId: { type: String, },
        row: { type: Number, },
        col: { type: Number, },
        payload: { type: mongoose.Schema.Types.Mixed },

        calculationUniqueId: { type: String, },

        constantUniqueId: { type: String, },
    }]
}, { timestamps: true });

calculationSchema.index({
    uniqueId: 1,
    version: 1,
}, { unique: true });

const Calculation = mongoose.model('calculations', calculationSchema);

export default Calculation;
