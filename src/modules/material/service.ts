import mongoose from "mongoose";
import crudService from '../../utils/crudService';
import { MaterialPostDto } from "./interfaces/dto";
import entities from './interfaces/entities';
import { IQnaMatrix } from "./interfaces/materialForm";
import FormTemplateService from '../form-template/service';

class MaterialService extends crudService {
    private formTemplateService: FormTemplateService;

    constructor() {
        super(entities);
        this.formTemplateService = new FormTemplateService();
    }

    /** Material require a backup for old version */
    public async updateWithVersioning(id: string, data: MaterialPostDto) {
        const _id = new mongoose.mongo.ObjectId(id);
        const filteredData = this.omitId(data);

        const originalDoc = (await entities.findOne({ _id })).toObject();
        if (!originalDoc.latest)
            throw new Error('Editing document is not the latest version.');

        delete originalDoc._id;

        // check uniqueId & version
        const duplicatedUniqueIdVersion = await entities.countDocuments({
            uniqueId: data.uniqueId,
            version: originalDoc.version + 1,
        })

        if (duplicatedUniqueIdVersion > 0) {
            throw new Error("Unique Id is duplicated. Please rename the material name");
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

            await this.formTemplateService.updateMaterial(id, newId)

            return newId;
        } catch (error) {
            // reset original material
            await entities.updateOne({ _id }, {
                $set: {
                    ...originalDoc,
                }
            });

            throw error;
        }
    }

    public async findNotLatestMaterials(ids: string[]) {
        return entities.find({
            _id: {
                '$in': ids.map((id) => new mongoose.mongo.ObjectId(id)),
            },
            latest: false,
        })
    }

    public async countFields(ids: string[]): Promise<number> {
        let count = 0;

        const materials = await entities.find({
            _id: {
                '$in': ids.map((id) => new mongoose.mongo.ObjectId(id)),
            },
        });

        for (const material of materials) {
            if (material.type === 'text') {
                count += material.content.length;
            } else {
                // matrix
                for (const table of material.content) {
                    if (this.isQnaMatrix(table)) {
                        count += table.rows.length * table.columns.length;
                    }
                }
            }
        }

        return count;
    }

    public isQnaMatrix(object: any): object is IQnaMatrix {
        return 'rows' in object;
    }
}

export default MaterialService;