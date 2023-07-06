require('dotenv').config();

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import server, { shutdown } from '../../../app';
import { CompanyCreateDto, CompanyGetDto } from '../interfaces/dto';
import request from "supertest";
import { IUser, Roles } from '../../auth/interfaces/auth';
import qs from 'qs';
import jwt from 'jsonwebtoken';
import CompanyService from "../service";
import { ICompany } from '../interfaces/company';
import dayjs from "dayjs";
import nodePath from 'path';
import _ from 'lodash';
import mongoose from 'mongoose';

import { generateFormPostDto, getComingFinancialYearEndDate } from '../../form/test/sample';
import { sampleMaterials, sampleMatrixMaterial } from '../../material/test/sample';
import { sampleFormTemplates } from '../../form-template/test/sample';
import { generateMeterPostDto } from '../../meter/test/sample'
import { formStatus } from '../../form/interfaces/form';
import { requiredNotificationTemplateDtoArr } from '../../notification-template/test/sample';
import { getDatesOfFinancialYear } from "../../../utils/financialYear";
import { translationSample } from '../../content/test/sample';
import { ContentCategory } from '../../content/interfaces/content';

chai.use(chaiAsPromised);
chai.should();
const expect = chai.expect;

let app: any;
let token: string;
const path = 'company';

const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/i;

function validateCompanyObject(company) {
  expect(company).is.includes.keys(
    ['_id', 'name', 'yearEnd', 'phone', 'email',
      'expiryDate', 'submissionDeadline',
      'materialFieldsCount', 'inputtedFieldsCount', 'inputProgress',
      'adminCheckedCount', 'adminCheckedProgress',
      'createdAt', 'updatedAt']);
  expect(company.admin).is.includes.keys(
    ['_id', 'email', 'role', 'hash', 'name', 'phone', 'createdAt', 'updatedAt']);
}

describe('company controller', () => {
  const companyService = new CompanyService();

  const allowedSearchFields = ['name', 'yearEnd', 'phone', 'email']

  const adminA = {
    password: 'bar123456',
    email: 'fooAdminA@gmail.com',
    role: Roles.clientAdmin,
    name: 'Foo Admin A',
    phone: '98887888',
    defaultLanguage: '637ae6804aff45107393412c', // random ObjectId
  };

  const sample: CompanyCreateDto = {
    name: 'Foo Company Ltd',
    yearEnd: getDatesOfFinancialYear(dayjs().year(), dayjs().month(11).date(31).format('YYYY-MM-DD')).endDate,
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
    defaultLanguage: '637ae6804aff45107393412c', // random ObjectId
    location: 'Hong Kong',
  }

  const sample2: CompanyCreateDto = {
    name: 'Sample 2 Company Ltd',
    yearEnd: getDatesOfFinancialYear(dayjs().year(), dayjs().month(11).date(31).format('YYYY-MM-DD')).endDate,
    phone: '98887888',
    email: 'cs@sample2company.com',
    admin: sample2Admin,
    expiryDate: dayjs().add(1, 'year').format('YYYY-MM-DD'),
    submissionDeadline: dayjs().add(1, 'year').format('YYYY-MM-DD'),
    defaultLanguage: '63871a114d9e6ea0860f2ee4', // random ObjectId
    location: 'Hong Kong',
    logo: '',
  }

  before(async () => {
    app = await server();
    const response = await request(app).post('/auth/superadmin?secret=dijMz13OsM')
    token = response.body.data;
  });

  it('should only allow super to create company', async function () {
    const res1 = await request(app).post(`/${path}`).send(sample);
    expect(res1.status).equal(403);
  });

  it('(above test related) should match the related user id when creating company', async function () {
    const res1 = await request(app).post(`/${path}`)
      .set('Authorization', `Bearer ${token}`)
      .send(sample);
    expect(res1.status).equal(200);

    const companyId = res1.body.data;
    const res2 = await request(app).get(`/${path}/${companyId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res2.body.data.logo).equal(null);
    expect(res2.body.data.admin.name).equal(sample.admin.name);
    expect(res2.body.data.admin.role).equal(Roles.clientAdmin);

    const userId = res2.body.data.admin._id;
    const res3 = await request(app).get(`/auth/${userId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res3.body.data.company._id).equal(companyId);
  })

  it('should create a new company with logo (form-data)', async function () {
    // Register a new company to test
    const createSample2CompanyReq = request(app).post(`/${path}`)
      .set('Authorization', `Bearer ${token}`)
      .attach('logo', nodePath.join(__dirname, '../../upload/test', 'test-logo-1.jpg'))

    for (const sampleKey in sample2) {
      const sampleValue = sample2[sampleKey];

      if (typeof sampleValue == 'object' && sampleValue != null) {
        for (const key in sampleValue) {
          createSample2CompanyReq.field(`${sampleKey}[${key}]`, sampleValue[key]);
        }
      } else {
        createSample2CompanyReq.field(sampleKey, sampleValue);
      }
    }

    const createSample2CompanyRes = await createSample2CompanyReq;
    expect(createSample2CompanyRes.status).equal(200);

    const companyId = createSample2CompanyRes.body.data;
    const res2 = await request(app).get(`/${path}/${companyId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res2.body.data.logo.url).match(urlRegex);
  })

  it('should return company list', async function () {
    const res1 = await request(app).get(`/${path}`)
      .set('Authorization', `Bearer ${token}`)
    expect(res1.status).equal(200);
    expect(res1.body.meta.count).gte(1, "should find at least one company");
    expect(res1.body.data.length).equal(res1.body.meta.count);
  });

  it('should return one company in the list if not get by super admin', async function () {
    // client admin login 
    const res1 = await request(app)
      .post('/auth')
      .send({ email: adminA.email, password: adminA.password });
    const clientAdminJWT = res1.body.data;
    const decoded: any = jwt.decode(clientAdminJWT);

    // Get his company id
    const res3 = await request(app).get(`/auth/${decoded._id}`)
      .set('Authorization', `Bearer ${clientAdminJWT}`);
    const companyId = res3.body.data.company._id;

    const res4 = await request(app).get(`/${path}`)
      .set('Authorization', `Bearer ${clientAdminJWT}`)
    expect(res4.status).equal(200);
    expect(res4.body.meta.count).equal(1);
    expect(res4.body.data.length).equal(res4.body.meta.count);
    expect(res4.body.data[0]._id).equal(companyId);
  })

  it('should not get other company by client admin', async () => {
    // client admin login 
    const res1 = await request(app)
      .post('/auth')
      .send({ email: adminA.email, password: adminA.password });
    const clientAdminJWT = res1.body.data;

    const res4 = await request(app).get(`/${path}/63bd1ecf6ca18f5c67e120e8`)
      .set('Authorization', `Bearer ${clientAdminJWT}`)
    expect(res4.status).equal(500);
    expect(res4.body.message).equal('Forbidden');
  })

  it('should return 500 if no company found', async function () {
    const res = await request(app).get(`/${path}/not_found`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).equal(500);
  })

  it('should deep equal to sample data when get company details', async function () {
    const res1 = await request(app).get(`/${path}`)
      .set('Authorization', `Bearer ${token}`)
    const id = res1.body.data[0]._id;
    const res2 = await request(app).get(`/${path}/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res2.status).equal(200);

    expect(res2.body.data).is.includes.keys(
      ['_id', 'name', 'yearEnd', 'phone', 'email',
        'expiryDate', 'submissionDeadline',
        'inputProgress', 'adminCheckedProgress', 'createdAt', 'updatedAt']);
    expect(res2.body.data.admin).is.includes.keys(
      ['_id', 'email', 'role', 'hash', 'name', 'phone', 'createdAt', 'updatedAt']);

    const res3 = await request(app).get(`/${path}/${res1.body.data[1]._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res3.status).equal(200);

    validateCompanyObject(res3.body.data);
    expect(res3.body.data.logo.url).match(urlRegex);

    for (const key of ['materialFieldsCount', 'inputtedFieldsCount', 'inputProgress',
      'adminCheckedCount', 'adminCheckedProgress']) {
      expect(res3.body.data[key]).equal(0)
    }
  });

  it('should get all users from different companies by a super admin', async function () {
    const getCompaniesRes = await request(app).get(`/${path}`)
      .set('Authorization', `Bearer ${token}`);
    const companies: CompanyGetDto[] = getCompaniesRes.body.data;

    for (const company of companies) {
      // Get users in different company
      const getCompanyUsersRes = await request(app).get(`/${path}/${company._id}/users`)
        .set('Authorization', `Bearer ${token}`);
      expect(getCompanyUsersRes.status).equal(200);

      expect(getCompanyUsersRes.body.status).equal('success');
      expect(getCompanyUsersRes.body.meta.count).equal(1);
      expect(getCompanyUsersRes.body.meta.page).equal(1);

      const companyUsers = getCompanyUsersRes.body.data;
      companyUsers.forEach((user) => {
        expect(user.company._id).equal(company._id);
      });
    }
  });

  it('should get all users from his companies by a client admin', async function () {
    const clientAdminInfos = [adminA, sample2Admin];

    for (const clientAdminInfo of clientAdminInfos) {
      // client admin login
      const res = await request(app)
        .post('/auth')
        .send({ email: clientAdminInfo.email, password: clientAdminInfo.password });
      const jwtToken = res.body.data;

      // get his user info & company info
      const res2 = await request(app)
        .get('/auth')
        .set('Authorization', `Bearer ${jwtToken}`);
      expect(res2.status).equal(200);
      const clientAdmin = res2.body.data[0];
      expect(clientAdmin.email).equal(clientAdminInfo.email);
      expect(clientAdmin.role).equal(Roles.clientAdmin);

      // get users of client admin's company
      const getCompanyUsersRes = await request(app).get(`/${path}/${clientAdmin.company._id}/users`)
        .set('Authorization', `Bearer ${jwtToken}`);
      expect(getCompanyUsersRes.status).equal(200);

      expect(getCompanyUsersRes.body.status).equal('success');
      expect(getCompanyUsersRes.body.meta.count).equal(1);
      expect(getCompanyUsersRes.body.meta.page).equal(1);

      const companyUsers = getCompanyUsersRes.body.data;
      companyUsers.forEach((user) => {
        expect(user.company._id).equal(clientAdmin.company._id);
      });
    }
  });

  it(`should get users search by filters`, async () => {
    const result: (Omit<ICompany, 'admin'> & { admin: IUser })[]
      = await companyService.read(1, 20, ['admin'], { name: sample.name, });
    const company = result[0];

    const searchFields = ['email', 'name', 'role', 'phone'];
    for (const fieldName of searchFields) {
      const fieldValue = sample[fieldName];
      const getCompanyUsersRes = await request(app).get(`/${path}/${company._id}/users?filters[${fieldName}]=${fieldValue}`)
        .set('Authorization', `Bearer ${token}`);

      expect(getCompanyUsersRes.status).equal(200);
      const companyUsers = getCompanyUsersRes.body.data;
      companyUsers.forEach((user) => {
        expect(user[fieldName]).equal(fieldValue);
      });
    }
  })

  // test query params search function 
  allowedSearchFields.forEach((fieldName) => {
    it(`should get sample data search by ${fieldName} in query string`, async () => {
      const fieldValue = sample[fieldName];

      const res = await request(app).get(`/${path}?filters[${fieldName}]=${fieldValue}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).equal(200);
      expect(res.body.meta.count).gte(1, "should find at least one company");

      const result = res.body.data;
      expect(result.length).gte(1, "should find at least one company");
      expect(result.length).equal(res.body.meta.count);

      result.forEach((company) => {
        validateCompanyObject(company);
        expect(company[fieldName]).eq(fieldValue);
      })
    })
  })

  it('should return error if searching illegal field', async () => {
    const res = await request(app).get(`/${path}?filters[_id]=testing`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).equal(500);

    const res2 = await request(app).get(`/${path}?filters[admin]=testing`)
      .set('Authorization', `Bearer ${token}`);
    expect(res2.status).equal(500);
  })

  it('should get sample data search by multiple fields in query string', async () => {
    const queryString = qs.stringify({
      filters: {
        name: sample.name,
        email: sample.email,
        phone: sample.phone,
        yearEnd: sample.yearEnd,
      }
    });

    const res = await request(app).get(`/${path}?${queryString}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).equal(200);
    expect(res.body.meta.count).gte(1, "should find at least one company");

    const result = res.body.data;
    expect(result.length).gte(1, "should find at least one company");
    expect(result.length).equal(res.body.meta.count);

    result.forEach((company) => {
      validateCompanyObject(company);
      expect(company.name).eq(sample.name);
      expect(company.yearEnd).eq(sample.yearEnd);
      expect(company.phone).eq(sample.phone);
      expect(company.email).eq(sample.email);
    })
  })

  it(`should get sample data by full-text search in query string`, async () => {
    const res = await request(app).get(`/${path}?search=${sample.name!.substring(0, 5)}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).equal(200);
    expect(res.body.meta.count).gte(1, "should find at least one company");

    const result = res.body.data;
    expect(result.length).gte(1, "should find at least one company");
    expect(result.length).equal(res.body.meta.count);

    result.forEach((company) => {
      validateCompanyObject(company);
      expect(company.name).eq(sample.name);
      expect(company.yearEnd).eq(sample.yearEnd);
      expect(company.phone).eq(sample.phone);
      expect(company.email).eq(sample.email);
    })
  })

  it('should update company', async () => {
    // create a translation
    const postContentRes = await request(app).post(`/content`)
      .set('Authorization', `Bearer ${token}`)
      .send(translationSample);
    expect(postContentRes.status).equal(200);
    const newDefaultLanguage = postContentRes.body.data;

    const res1 = await request(app).get(`/${path}`)
      .set('Authorization', `Bearer ${token}`);
    const id = res1.body.data[0]._id;
    const res2 = await request(app).get(`/${path}/${id}`)
      .set('Authorization', `Bearer ${token}`);
    const oldCompany = res1.body.data;

    expect(res2.status).equal(200);

    const res3 = await request(app).put(`/${path}/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'test update',
        defaultLanguage: newDefaultLanguage,
        logo: 'null'
      });
    expect(res3.status).equal(200);

    const res4 = await request(app).get(`/${path}/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res4.status).equal(200);
    expect(res4.body.data.name).equal('test update');
    expect(res4.body.data.defaultLanguage._id).equal(newDefaultLanguage);
    expect(res4.body.data.defaultLanguage.category).equal(ContentCategory.translation);
    expect(res4.body.data.logo).equal(null);

    // reset
    const res5 = await request(app).put(`/${path}/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: oldCompany.name,
      });
    expect(res5.status).equal(200);
  })

  it('should update company with logo', async () => {
    const res1 = await request(app).get(`/${path}`)
      .set('Authorization', `Bearer ${token}`);
    const id = res1.body.data[0]._id;

    const putCompanyRes = await request(app).put(`/${path}/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .attach('logo', nodePath.join(__dirname, '../../upload/test', 'test-logo-1.jpg'));
    expect(putCompanyRes.status).equal(200);

    const res2 = await request(app).get(`/${path}/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res2.status).equal(200);
    expect(res2.body.data.logo.url).match(urlRegex);
  })

  it('should update company to remove logo', async () => {
    const res1 = await request(app).get(`/${path}`)
      .set('Authorization', `Bearer ${token}`);
    const id = res1.body.data[0]._id;

    const putCompanyRes = await request(app).put(`/${path}/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        logo: 'null'
      });
    expect(putCompanyRes.status).equal(200);

    const res2 = await request(app).get(`/${path}/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res2.status).equal(200);
    expect(res2.body.data.logo).equal(null);
  })

  it('should update expiry date and then should not be access by users', async () => {
    const res1 = await request(app).get(`/${path}`)
      .set('Authorization', `Bearer ${token}`);
    const id = res1.body.data[0]._id;
    const res2 = await request(app).get(`/${path}/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res2.status).equal(200);

    // set the expiry date is 1 day before (expired)
    const res3 = await request(app).put(`/${path}/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ expiryDate: dayjs().subtract(1, 'day').format('YYYY-MM-DD') });
    expect(res3.status).equal(200);

    // adminA should not login now
    const res4 = await request(app)
      .post('/auth')
      .send({ email: adminA.email, password: adminA.password });
    expect(res4.status).equal(500);

    // reset expiryDate
    const res5 = await request(app).put(`/${path}/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ expiryDate: dayjs().add(1, 'year').format('YYYY-MM-DD') });
    expect(res5.status).equal(200);

    // adminA should able to login now
    const res6 = await request(app)
      .post('/auth')
      .send({ email: adminA.email, password: adminA.password });
    expect(res6.status).equal(200);
  })

  it('should get dashboard data', async () => {
    // create required notification template
    for (const dto of requiredNotificationTemplateDtoArr) {
      const postNotificationTemplateRes = await request(app).post(`/notification-template`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto);
      expect(postNotificationTemplateRes.status).equal(200);
    }


    // create unit
    const res2 = await request(app).post(`/unit`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        input: 'mL',
        output: 'L',
        rate: 0.001,
      });
    expect(res2.status).equal(200);

    // create form
    const sampleFormPostDto = await generateFormPostDto({
      app,
      jwt: token,
      data: {
        company: {
          ...sample,
          admin: {
            ...adminA,
            email: 'form@company.com'
          }
        },
        materials: sampleMaterials,
        formTemplate: sampleFormTemplates[0],
        financialYear: getComingFinancialYearEndDate(),
      },
    })

    const postFormRes = await request(app).post(`/form`)
      .set('Authorization', `Bearer ${token}`)
      .send(sampleFormPostDto);
    expect(postFormRes.status).equal(200);
    expect(postFormRes.body.data).to.be.a('string');
    const formId = postFormRes.body.data;

    // create meter
    const meterPostDto = generateMeterPostDto(postFormRes.body.data, 'Meter 1');
    const postMeterRes = await request(app).post(`/meter`)
      .set('Authorization', `Bearer ${token}`)
      .send(meterPostDto);
    expect(postMeterRes.status).equal(200);
    const meterId = postMeterRes.body.data;

    // submit the new meter
    const correctInputs = [
      [{ answer: 'ans 3' }, { answer: 'ans 4' }],
      {
        answer: [
          [123, 100.23, 'Tom'], [234.12, 234.56, 'John']
        ],
        unit: ["L", "L", "N/A"],
      }
    ];
    const putMeterRes = await request(app).put(`/meter/${meterId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        inputs: correctInputs,
        submitted: false,
      });
    expect(putMeterRes.status).equal(200);
    expect(putMeterRes.body.data).equal(true);

    // create meter 2
    const meterPostDto2 = generateMeterPostDto(postFormRes.body.data, 'Meter 2');
    const postMeterRes2 = await request(app).post(`/meter`)
      .set('Authorization', `Bearer ${token}`)
      .send(meterPostDto2);
    expect(postMeterRes2.status).equal(200);
    const meterId2 = postMeterRes2.body.data;

    // submit the new meter
    const correctInputs2 = [
      [{ answer: 'ans 3' }, { answer: 'ans 4' }],
      {
        answer: [
          [100 * 1000, 200.21 * 1000, 'Tom'], [300 * 1000, 400.78 * 1000, 'John']
        ],
        unit: ["mL", "mL", "N/A"],
      }
    ];
    const putMeterRes2 = await request(app).put(`/meter/${meterId2}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        inputs: correctInputs2,
        submitted: false,
      });
    expect(putMeterRes2.status).equal(200);
    expect(putMeterRes2.body.data).equal(true);

    // submit the form
    const putFormRes = await request(app).put(`/form/${formId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        submitted: true,
        nextStatus: formStatus.submitted,
      });
    expect(putFormRes.status).equal(200);

    // get materials
    const getMaterialsRes = await request(app).get(`/material`)
      .set('Authorization', `Bearer ${token}`);
    expect(getMaterialsRes.status).equal(200);
    const matrixMaterial = getMaterialsRes.body.data[1];

    // get data
    const getDashboardRes = await request(app)
      .get(`/${path}/${sampleFormPostDto.company}/financialYear/${sampleFormPostDto.financialYear}/material/${matrixMaterial._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getMaterialsRes.status).equal(200);

    const data = getDashboardRes.body.data;
    expect(data.length).equal(4);
    expect(data[0].row).equal(sampleMatrixMaterial.content[0].rows[0].name);
    expect(data[0].col).equal(sampleMatrixMaterial.content[0].columns[0].name);
    expect(data[0].unit).equal(sampleMatrixMaterial.content[0].columns[0].outputUnit);
    expect(data[0].value).equal(123 + 100);
    expect(data[1].row).equal(sampleMatrixMaterial.content[0].rows[0].name);
    expect(data[1].col).equal(sampleMatrixMaterial.content[0].columns[1].name);
    expect(data[1].unit).equal(sampleMatrixMaterial.content[0].columns[1].outputUnit);
    expect(data[1].value).equal(100.23 * 1000 + 200.21 * 1000);
    expect(data[2].row).equal(sampleMatrixMaterial.content[0].rows[1].name);
    expect(data[2].col).equal(sampleMatrixMaterial.content[0].columns[0].name);
    expect(data[2].unit).equal(sampleMatrixMaterial.content[0].columns[0].outputUnit);
    expect(data[2].value).equal(234.12 + 300);
    expect(data[3].row).equal(sampleMatrixMaterial.content[0].rows[1].name);
    expect(data[3].col).equal(sampleMatrixMaterial.content[0].columns[1].name);
    expect(data[3].unit).equal(sampleMatrixMaterial.content[0].columns[1].outputUnit);
    expect(data[3].value).equal(_.round(234.56 * 1000 + 400.78 * 1000, 2));

    // groupByRow
    const groupByRow = getDashboardRes.body.groupByRow;
    expect(groupByRow.length).equal(2);
    expect(groupByRow[0].row).equal(sampleMatrixMaterial.content[0].rows[0].name);
    expect(groupByRow[0][sampleMatrixMaterial.content[0].columns[0].name].value).equal(123 + 100);
    expect(groupByRow[0][sampleMatrixMaterial.content[0].columns[0].name].unit).equal(sampleMatrixMaterial.content[0].columns[0].outputUnit);
    expect(groupByRow[0][sampleMatrixMaterial.content[0].columns[1].name].value).equal(100.23 * 1000 + 200.21 * 1000);
    expect(groupByRow[0][sampleMatrixMaterial.content[0].columns[1].name].unit).equal(sampleMatrixMaterial.content[0].columns[1].outputUnit);
    expect(groupByRow[1].row).equal(sampleMatrixMaterial.content[0].rows[1].name);
    expect(groupByRow[1][sampleMatrixMaterial.content[0].columns[0].name].value).equal(234.12 + 300);
    expect(groupByRow[1][sampleMatrixMaterial.content[0].columns[0].name].unit).equal(sampleMatrixMaterial.content[0].columns[0].outputUnit);
    expect(groupByRow[1][sampleMatrixMaterial.content[0].columns[1].name].value).equal(_.round(234.56 * 1000 + 400.78 * 1000, 2));
    expect(groupByRow[1][sampleMatrixMaterial.content[0].columns[1].name].unit).equal(sampleMatrixMaterial.content[0].columns[1].outputUnit);

    // groupByCol
    const groupByCol = getDashboardRes.body.groupByCol;
    expect(groupByCol.length).equal(2);
    expect(groupByCol[0].col).equal(sampleMatrixMaterial.content[0].columns[0].name);
    expect(groupByCol[0][sampleMatrixMaterial.content[0].rows[0].name].value).equal(123 + 100);
    expect(groupByCol[0][sampleMatrixMaterial.content[0].rows[0].name].unit).equal(sampleMatrixMaterial.content[0].columns[0].outputUnit);
    expect(groupByCol[0][sampleMatrixMaterial.content[0].rows[1].name].value).equal(234.12 + 300);
    expect(groupByCol[0][sampleMatrixMaterial.content[0].rows[1].name].unit).equal(sampleMatrixMaterial.content[0].columns[0].outputUnit);
    expect(groupByCol[1].col).equal(sampleMatrixMaterial.content[0].columns[1].name);
    expect(groupByCol[1][sampleMatrixMaterial.content[0].rows[0].name].value).equal(100.23 * 1000 + 200.21 * 1000);
    expect(groupByCol[1][sampleMatrixMaterial.content[0].rows[0].name].unit).equal(sampleMatrixMaterial.content[0].columns[1].outputUnit);
    expect(groupByCol[1][sampleMatrixMaterial.content[0].rows[1].name].value).equal(_.round(234.56 * 1000 + 400.78 * 1000, 2));
    expect(groupByCol[1][sampleMatrixMaterial.content[0].rows[1].name].unit).equal(sampleMatrixMaterial.content[0].columns[1].outputUnit);
  })

  it('should delete company', async () => {
    const res1 = await request(app).get(`/${path}`)
      .set('Authorization', `Bearer ${token}`);
    const id = res1.body.data[0]._id;

    const deleteCompanyRes = await request(app).delete(`/${path}/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send();
    expect(deleteCompanyRes.status).equal(200);

    const getFormRes = await request(app).get(`/${path}/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send();
    expect(getFormRes.status).equal(500);
  })

  it('should have 3 add company log', async () => {
    const result = await mongoose.model('user_activity_logs').find({
      resource: 'company',
      action: 'add'
    }).exec()

    expect(result.length).equal(3);
  })

  it('should have 6 edit company log', async () => {
    const result = await mongoose.model('user_activity_logs').find({
      resource: 'company',
      action: 'edit'
    }).exec()

    expect(result.length).equal(6);
  })

  it('should have 1 delete company log', async () => {
    const result = await mongoose.model('user_activity_logs').find({
      resource: 'company',
      action: 'delete'
    }).exec()

    expect(result.length).equal(1);
  })

  after(async () => {
    await shutdown();
  });
});