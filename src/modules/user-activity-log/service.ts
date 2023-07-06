import crudService from '../../utils/crudService';
import entities from './interfaces/entitles';

class UserActivityLogService extends crudService {
    constructor() {
        super(entities);
    }
}

export default UserActivityLogService;
