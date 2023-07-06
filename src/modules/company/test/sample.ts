import dayjs from "dayjs";
import type {ReadonlyDeep} from 'type-fest';
import { getDatesOfFinancialYear } from "../../../utils/financialYear";
import { Roles } from "../../auth/interfaces/auth";
import { getComingFinancialYearEndDate } from "../../form/test/sample";
import { CompanyCreateDto } from "../interfaces/dto";


const adminA = {
    password: 'bar123456',
    email: 'fooAdminA@gmail.com',
    role: Roles.clientAdmin,
    name: 'Foo Admin A',
    phone: '98887888',
    defaultLanguage: '63871a114d9e6ea0860f2ee4', // random ObjectId
};

const sample: CompanyCreateDto = {
    name: 'Foo Company Ltd',
    yearEnd: getComingFinancialYearEndDate(),
    phone: '98887888',
    email: 'foo@companyltd.com',
    admin: adminA,
    expiryDate: dayjs().add(1, 'year').format('YYYY-MM-DD'),
    submissionDeadline: dayjs().add(1, 'year').format('YYYY-MM-DD'),
    defaultLanguage: '637ae6804aff45107393412c', // random ObjectId
    location: 'Hong Kong',
    logo: '',
};

const sample2Admin = {
  password: 'bar123456',
  email: 'sample2Admin@gmail.com',
  role: Roles.clientAdmin,
  name: 'Sample 2 Admin',
  phone: '98887888',
  defaultLanguage: '63871a114d9e6ea0860f2ee4', // random ObjectId
}

const sample2: CompanyCreateDto = {
  name: 'Sample 2 Company Ltd',
  yearEnd: getComingFinancialYearEndDate(),
  phone: '98887888',
  email: 'cs@sample2company.com',
  admin: sample2Admin,
  expiryDate: dayjs().add(1, 'year').format('YYYY-MM-DD'),
  submissionDeadline: dayjs().add(1, 'year').format('YYYY-MM-DD'),
  defaultLanguage: '637ae6804aff45107393412c', // random ObjectId
  location: 'Hong Kong',
  logo: '',
}

export const sampleCompanies: ReadonlyDeep<CompanyCreateDto>[] = [sample, sample2];
