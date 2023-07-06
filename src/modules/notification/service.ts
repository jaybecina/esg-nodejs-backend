import mongoose from 'mongoose';
import crudService from '../../utils/crudService';
import { NotificationTriggerData } from './interfaces/dto';
import entities from './interfaces/entities';
import NotificationTemplateService from "../notification-template/service";

class NotificationService extends crudService {
    private notificationTemplateService: NotificationTemplateService;

    constructor() {
        super(entities);
        this.notificationTemplateService = new NotificationTemplateService()
    }

    public async trigger(data: NotificationTriggerData) {
        const notificationTemplate = await this.notificationTemplateService.findByUniqueId(data.uniqueId);

        const level = data.level ? data.level : notificationTemplate.level;

        // payload validation
        const templateVariables = notificationTemplate.variables;
        for (const templateVariable of templateVariables) {
            if (!(templateVariable in data.payload)) {
                throw new Error(`Can't find ${templateVariable} in payload`);
            }
        }

        // create
        const result = await entities.create({
            notificationTemplate: notificationTemplate._id,
            level,
            payload: data.payload,
            receiver: new mongoose.mongo.ObjectId(data.receiver),
            receiverType: data.receiverType,
            read: false,
            lastReadAt: null,
            createdBy: new mongoose.mongo.ObjectId(data.createdBy),
        })

        return result;
    }
}

export default NotificationService;
