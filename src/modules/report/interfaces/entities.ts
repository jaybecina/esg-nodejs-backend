import mongoose from 'mongoose';
import { IReport, ReportName } from "./report";

interface SReport extends Omit<IReport, 'calculations'> {
    calculations: mongoose.Types.ObjectId[],
}

const reportSchema = new mongoose.Schema<SReport>({
    name: {
        type: String,
        enum: ReportName,
        required: true,
    },
    calculations: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'calculations'
    }],
}, { timestamps: true });

const Report = mongoose.model('reports', reportSchema);

export default Report;
