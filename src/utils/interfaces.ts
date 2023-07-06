import { IUser } from "../modules/auth/interfaces/auth";

export interface ControllerResponse<T, DataType> {
  status: string;
  data: T,
  meta: DataType extends 'array' ? {
    count: number,
    page: number,
  } : {};
}

export interface JWTPayload extends Pick<IUser, '_id' | 'email' | 'role' >{
  exp: number
}

export interface IBaseApiQueryParams {
  page: number,
  limit: number,
  search?: string,
  filters: { [key: string]: any },
}