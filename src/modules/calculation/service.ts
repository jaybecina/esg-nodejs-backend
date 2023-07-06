import mongoose from "mongoose";
import crudService from '../../utils/crudService';
import { CalculationPostDto } from "./interfaces/dto";
import entities from './interfaces/entities';

class CalculationService extends crudService {
    constructor() {
        super(entities);
    }

    /** Calculation require a backup for old version */
    public async updateWithVersioning(id: string, data: CalculationPostDto) {
        const _id = new mongoose.mongo.ObjectId(id);
        const filteredData = this.omitId(data);

        const originalDoc = (await entities.findOne({ _id })).toObject();
        if (!originalDoc.latest)
            throw new Error('Editing calculation is not the latest version.');

        delete originalDoc._id;

        // check uniqueId & version
        const duplicatedUniqueIdVersion = await entities.countDocuments({
            uniqueId: data.uniqueId,
            version: originalDoc.version + 1,
        })

        if (duplicatedUniqueIdVersion > 0) {
            throw new Error("Unique Id is duplicated. Please rename the calculation name");
        }

        try {
            await entities.updateOne({ _id }, {
                $set: {
                    ...originalDoc,
                    version: originalDoc.version,
                    latest: false,
                }
            });

            const newDoc = await entities.create({
                ...filteredData,
                version: originalDoc.version + 1,
                latest: true,
            });
            const newId = newDoc._id.toString();

            return newId;
        } catch (error) {
            // reset to original calculation
            await entities.updateOne({ _id }, {
                $set: {
                    ...originalDoc,
                }
            });

            throw error;
        }
    }
}

export default CalculationService;