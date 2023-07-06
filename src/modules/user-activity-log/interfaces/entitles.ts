import mongoose from 'mongoose';
import { EventAction, IUserActivityLog, Resource } from './userActivityLog';

export interface SUserActivityLog extends Omit<IUserActivityLog, 'userId' | 'resourceId'> {
    userId: mongoose.Types.ObjectId,
    resourceId: mongoose.Types.ObjectId,
}

const userActivityLogSchema = new mongoose.Schema<SUserActivityLog>({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
        immutable: true,
    },
    resourceId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        immutable: true,
    },

    data: mongoose.Schema.Types.Mixed,
    
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        default: '',
        required: true,
    },
    action: {
        type: String,
        enum: EventAction,
        required: true,
        immutable: true,
    },
    resource: {
        type: String,
        enum: Resource,
        required: true,
        immutable: true,
    }
}, { timestamps: true });

const UserActivityLog = mongoose.model('user_activity_logs', userActivityLogSchema);

export default UserActivityLog;
