import mongoose from 'mongoose';

import crudService from '../../utils/crudService';
import entities from './interfaces/entities';
import { IReport } from './interfaces/report';

class ReportService extends crudService {
    constructor() {
        super(entities);
    }

    async replaceCalculationId(oldCalculationId: string, newCalculationId: string) {
        const reports: IReport[] = await this.read(1, 0, null, {
            calculations: { $in: [new mongoose.mongo.ObjectId(oldCalculationId)] }
        })

        if (reports.length === 0) {
            return true;
        }

        for (const report of reports) {
            const calculations = report.calculations;

            const updatedCalculations = calculations.map((calculation) => {
                return calculation === oldCalculationId ? newCalculationId : calculation;
            })

            await this.update(report._id, {
                calculations: updatedCalculations
            });
        }

        return true;
    }
}

export default ReportService;
