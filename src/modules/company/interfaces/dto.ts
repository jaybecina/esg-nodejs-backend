import { IsMongoId, Matches } from 'class-validator';
import { IBaseApiQueryParams } from '../../../utils/interfaces';
import { UserRegistrationDto } from '../../auth/interfaces/dto';
import { ICompany } from './company';
import { IContent } from '../../content/interfaces/content';

export const MIN_PW_LENGTH = 6;

export const CompanyBlockedSearchParams = ['_id', 'admin', 'logo'] as const
type TypeCompanyBlockedSearchParams = typeof CompanyBlockedSearchParams[number]

// Company cast as string on dto
export class CompanyUpdateDto implements Omit<ICompany, '_id' | 'admin' | 'logo'> {
  name: string;
  @Matches(/^\d{4}(-)(((0)[0-9])|((1)[0-2]))(-)([0-2][0-9]|(3)[0-1])$/i, {
    message: "$property must be formatted as yyyy-mm-dd"
  })
  yearEnd: string;
  phone: string;
  email: string;
  @Matches(/^\d{4}(-)(((0)[0-9])|((1)[0-2]))(-)([0-2][0-9]|(3)[0-1])$/i, {
    message: "$property must be formatted as yyyy-mm-dd"
  })
  expiryDate: string;
  @Matches(/^\d{4}(-)(((0)[0-9])|((1)[0-2]))(-)([0-2][0-9]|(3)[0-1])$/i, {
    message: "$property must be formatted as yyyy-mm-dd"
  })
  submissionDeadline: string;
  @IsMongoId()
  defaultLanguage: string;
  location: string;
  logo: string;
}

export class CompanyCreateDto extends CompanyUpdateDto {
  admin: UserRegistrationDto;
}

export class CompanyGetDto implements Omit<ICompany, 'admin' | 'defaultLanguage'> {
  location: string;
  _id: string;
  name: string;
  yearEnd: string;
  phone: string;
  email: string;
  admin: {
    name: string,
  };
  logo: string;
  @Matches(/^\d{4}(-)(((0)[0-9])|((1)[0-2]))(-)([0-2][0-9]|(3)[0-1])$/i, {
    message: "$property must be formatted as yyyy-mm-dd"
  })
  expiryDate: string;
  @Matches(/^\d{4}(-)(((0)[0-9])|((1)[0-2]))(-)([0-2][0-9]|(3)[0-1])$/i, {
    message: "$property must be formatted as yyyy-mm-dd"
  })
  submissionDeadline: string;
  defaultLanguage: IContent;

  materialFieldsCount: number;
  inputtedFieldsCount: number;
  fieldsTotal: number;
  inputProgress: number;
  adminCheckedCount: number;
  adminCheckedProgress: number;
}

export class CompanyGetParams implements IBaseApiQueryParams {
  filters: Partial<Omit<ICompany, TypeCompanyBlockedSearchParams>>;
  page: number = 1;
  limit: number = 10;
  search?: string;
  year: number;
  sort: {
    updatedAt: 1;
}
}