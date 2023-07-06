import { ICompany } from '../../company/interfaces/company';

export enum Roles {
  user = 'user',
  clientAdmin = 'client-admin',
  superAdmin = 'super-admin',
}

export interface IUser {
  _id: string,
  email: string,
  role: Roles,
  hash: string,
  name: string,
  company: string,
  phone: string,
  resetToken?: string,
  defaultLanguage: string,
}

export interface ICurrentUser extends Omit<IUser, 'company'>{
  company: ICompany,
}