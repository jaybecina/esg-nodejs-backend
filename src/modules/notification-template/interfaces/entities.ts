import mongoose from 'mongoose';
import { INotificationTemplate, NotificationLevel } from "./notificationTemplate";

interface SNotificationTemplate extends INotificationTemplate { }

const notificationTemplateSchema = new mongoose.Schema<SNotificationTemplate>({
    name: {
        type: String,
        unique: true,
        required: true
    },
    uniqueId: {
        type: String,
        unique: true,
        required: true
    },
    description: { type: String, default: '' },

    level: {
        type: String,
        enum: NotificationLevel,
        default: NotificationLevel.info,
        required: true,
    },
    label: { type: String, default: '' },

    header: { type: String, required: true, },
    content: { type: String, default: '' },
    variables: [{ type: String }]
}, { timestamps: true })

const NotificationTemplate = mongoose.model('notification_templates', notificationTemplateSchema);

export default NotificationTemplate;
