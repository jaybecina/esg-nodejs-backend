import mongoose from 'mongoose';
import { ICompany } from './company';

interface SCompany extends Omit<ICompany, 'admin' | 'logo' | 'defaultLanguage'> {
  admin: mongoose.Types.ObjectId;
  logo: mongoose.Types.ObjectId;
  defaultLanguage: mongoose.Types.ObjectId;
}

const companySchema = new mongoose.Schema<SCompany>({
  name: String,
  yearEnd: String,
  phone: String,
  email: String,
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users'
  },
  logo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'uploads'
  },
  expiryDate: { type: String, required: true },
  submissionDeadline: { type: String, required: true },
  defaultLanguage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'content'
  },
  location: { type: String, required: true },
}, { timestamps: true });

const Company = mongoose.model('companies', companySchema);

export default Company;