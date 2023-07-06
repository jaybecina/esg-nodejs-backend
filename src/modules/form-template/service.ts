import mongoose from 'mongoose';
import crudService from '../../utils/crudService';
import entities from './interfaces/entities';

class FromTemplateService extends crudService {
    private FormTemplate: mongoose.Model<any>;

    constructor() {
        super(entities);
        this.FormTemplate = entities;
    }

    async updateMaterial(oldMaterialId: string, newMaterialId: string) {
        const entities = await this.FormTemplate.find({ materials: { $in: [oldMaterialId] } });
        const newEntities = entities.map(temp => {
            temp.materials = temp.materials.map(mid => mid.toString());
            
            const oldIndex = temp.materials.indexOf(oldMaterialId);
            temp.materials[oldIndex] = newMaterialId;
            return temp;
        });

        const promiseGroup = [];
        for (let i = 0; i < newEntities.length; i++) {
            const ent = newEntities[i];
            promiseGroup.push(this.FormTemplate.updateOne({ _id: ent._id },
                { $set: { materials: ent.materials } }));
        }

        await Promise.all(promiseGroup);
    }
}

export default FromTemplateService;
