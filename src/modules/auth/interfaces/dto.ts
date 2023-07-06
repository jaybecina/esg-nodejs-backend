import { IsEmail, MinLength, IsBoolean } from 'class-validator';
import { IBaseApiQueryParams } from '../../../utils/interfaces';
import { INotification } from '../../notification/interfaces/notification';
import { IUser, Roles } from './auth';

export const MIN_PW_LENGTH = 6;

// Company cast as string on dto
export class UserRegistrationDto implements Omit<IUser, '_id' | 'hash' | 'company'> {
  email: string;
  role: Roles;
  @MinLength(MIN_PW_LENGTH)
  password: string;
  name: string;
  company?: string;
  phone: string;
  defaultLanguage: string;
}

export class UserLoginDto implements Pick<IUser, 'email'> {
  @IsEmail()
  email: string;
  @MinLength(MIN_PW_LENGTH)
  password: string;
  @IsBoolean()
  keepLoggedIn: boolean = false;
}

// Company cast as string on dto
export class UserUpdateDto implements Partial<Omit<IUser, 'company'>> {
  role?: Roles;
  @IsEmail()
  email?: string;
  @MinLength(MIN_PW_LENGTH)
  password?: string;
  name?: string;
  company?: string;
  phone?: string;
  defaultLanguage: string;
}

// User notification Update Read
export class UserNotificationUpdateDto implements Partial<Pick<INotification, 'read'>> {
  @IsBoolean()
  read: boolean;
}

export class UserGetParams implements IBaseApiQueryParams {
  page: number = 1;
  limit: number = 10;
  search?: string;
  filters: Partial<Omit<IUser, '_id' | 'hash' | 'resetToken'>>;
  sort: {
    updatedAt: 1
  }
}

export class UserNotificationGetParams implements IBaseApiQueryParams {
  page: number = 1;
  limit: number = 10;
  search?: string;
  filters: Partial<Pick<INotification, 'level' | 'read'>>;
}
