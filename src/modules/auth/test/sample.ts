import dayjs from "dayjs"
import { CompanyCreateDto } from "../../company/interfaces/dto"
import { Roles } from "../interfaces/auth"
import { UserRegistrationDto } from "../interfaces/dto"

export const clientAdminSample: Readonly<UserRegistrationDto> = {
    password: 'bar123456',
    email: 'foo-company-client-admin-1@gmail.com',
    role: Roles.clientAdmin,
    name: 'Foo Company Client Admin 1',
    phone: '98887888',
    defaultLanguage: '63871a114d9e6ea0860f2ee4', // random ObjectId
}

export const userSample: Readonly<UserRegistrationDto> = {
    password: 'bar123456',
    email: 'foo-company-user-1@gmail.com',
    role: Roles.user,
    name: 'Foo Company User 1',
    phone: '98887888',
    defaultLanguage: '63871a114d9e6ea0860f2ee4', // random ObjectId
}

export const companySample: Readonly<CompanyCreateDto> = {
    name: 'Foo Company Ltd',
    yearEnd: '1990-10-20',
    phone: '98887888',
    email: 'foo@companyltd.com',
    admin: clientAdminSample,
    expiryDate: dayjs().add(1, 'year').format('YYYY-MM-DD'),
    submissionDeadline: dayjs().add(1, 'year').format('YYYY-MM-DD'),
    defaultLanguage: '637ae6804aff45107393412c', // random ObjectId
    location: 'Hong Kong',
    logo: '',
}