import mongoose from 'mongoose';
import { NotificationLevel } from '../../notification-template/interfaces/notificationTemplate';
import { INotification, ReceiverType } from './notification';

interface SNotification extends Omit<INotification, 'notificationTemplate' | 'receiver' | 'lastReadAt' | 'createdBy'> {
    notificationTemplate: mongoose.Types.ObjectId,
    receiver: mongoose.Types.ObjectId,
    lastReadAt: Date,
    createdBy: mongoose.Types.ObjectId,
}

const notificationSchema = new mongoose.Schema<SNotification>({
    notificationTemplate: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'notification_templates',
        required: true,
        immutable: true,
    },
    level: {
        type: String,
        enum: NotificationLevel,
        default: NotificationLevel.info,
        required: true,
        immutable: true,
    },

    payload: {
        type: mongoose.Schema.Types.Mixed,
        immutable: true,
    },

    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        immutable: true,
    },
    receiverType: {
        type: String,
        enum: ReceiverType,
        required: true,
        immutable: true,
    },

    read: {
        type: Boolean,
        default: false,
    },
    lastReadAt: {
        type: Date, // allow null
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
    },
}, { timestamps: true })

const NotificationTemplate = mongoose.model('notifications', notificationSchema);

export default NotificationTemplate;
