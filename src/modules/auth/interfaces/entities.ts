import mongoose, { Schema, Types } from 'mongoose';
import { IUser, Roles } from './auth';

const collection = 'users';

interface SUser extends Omit<IUser, 'company' | 'defaultLanguage'> {
  company: Types.ObjectId,
  defaultLanguage: Types.ObjectId,
};

const userSchema = new mongoose.Schema<SUser>({
  email: {
    type: String,
    unique: true,
    required: true,
  },
  role: {
    type: String,
    enum: Roles,
    default: Roles.user,
    required: true,
  },
  hash: String,
  name: String,
  company: { type: Schema.Types.ObjectId, ref: 'companies' },
  phone: String,
  resetToken: String,
  defaultLanguage: { type: Schema.Types.ObjectId, ref: 'content' },
}, {timestamps: true});

const User = mongoose.model(collection, userSchema);

export default User;