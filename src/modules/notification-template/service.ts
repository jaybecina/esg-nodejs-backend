import crudService from '../../utils/crudService';
import entities from './interfaces/entities';

class NotificationTemplateService extends crudService {
    constructor() {
        super(entities);
    }

    public async findByUniqueId(uniqueId: string) {
        return entities.findOne({ uniqueId });
    }
}

export default NotificationTemplateService;
