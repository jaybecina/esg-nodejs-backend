import crudService from '../../utils/crudService';
import entities from './interfaces/entitles';

class ConstantService extends crudService {
    constructor() {
        super(entities);
    }
}

export default ConstantService
