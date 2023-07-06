require('dotenv').config();

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import jwt from 'jsonwebtoken';
import _ from 'lodash';
import request from "supertest";
import dayjs from "dayjs";
import nodePath from 'path';
import mongoose from 'mongoose';

import { CompanyCreateDto } from '../../company/interfaces/dto';
import { Roles } from '../interfaces/auth';

import server, { shutdown } from '../../../app';
import User from '../interfaces/entities';
import { UserRegistrationDto } from '../interfaces/dto';
import { createDeadlineRemindTemplateDto, requiredNotificationTemplateDtoArr } from '../../notification-template/test/sample';
import { NotificationLevel } from '../../notification-template/interfaces/notificationTemplate';
import { ReceiverType } from '../../notification/interfaces/notification';
import { translationSample } from '../../content/test/sample'
import { ContentCategory } from '../../content/interfaces/content';

chai.use(chaiAsPromised);
chai.should();
const expect = chai.expect;

describe('auth controller', async function () {
  let app;
  let token;

  const clientAdminSample: UserRegistrationDto = {
    password: 'bar123456',
    email: 'foo-company-client-admin-1@gmail.com',
    role: Roles.clientAdmin,
    name: 'Foo Company Client Admin 1',
    phone: '98887888',
    defaultLanguage: '63871a114d9e6ea0860f2ee4', // random ObjectId
  }

  const userSample: UserRegistrationDto = {
    password: 'bar123456',
    email: 'foo-company-user-1@gmail.com',
    role: Roles.user,
    name: 'Foo Company User 1',
    phone: '98887888',
    defaultLanguage: '63871a114d9e6ea0860f2ee4', // random ObjectId
  }

  const userSample2: UserRegistrationDto = {
    password: 'bar123456',
    email: 'foo-company-user-2@gmail.com',
    role: Roles.user,
    name: 'Foo Company User 2',
    phone: '98887888',
    defaultLanguage: '63871a114d9e6ea0860f2ee4', // random ObjectId
  }

  const companySample: CompanyCreateDto = {
    name: 'Foo Company Ltd',
    yearEnd: '1990-10-20',
    phone: '98887888',
    email: 'foo@companyltd.com',
    admin: clientAdminSample,
    expiryDate: dayjs().add(1, 'year').format('YYYY-MM-DD'),
    submissionDeadline: dayjs().add(1, 'year').format('YYYY-MM-DD'),
    defaultLanguage: '637ae6804aff45107393412c', // random ObjectId
    location: 'Hong Kong',
  }

  before(async () => {
    app = await server();
  });

  it('should return token when generating superadmin', async function () {
    const response = await request(app)
      .post('/auth/superadmin?secret=dijMz13OsM')
      .expect(200);

    token = response.body.data;
    expect(token).is.not.undefined;
  });

  it('should able to prepare a company and its client admin for testing', async function () {
    const decoded: any = jwt.decode(token);

    /** Prepare a company  for testing */
    const createCompanyReq = request(app).post(`/company`)
      .set('Authorization', `Bearer ${token}`)
      .attach('logo', nodePath.join(__dirname, '../../upload/test', 'test-logo-1.jpg'));

    for (const sampleKey in companySample) {
      const sampleValue = companySample[sampleKey];

      if (typeof sampleValue == 'object' && sampleValue != null) {
        for (const key in sampleValue) {
          createCompanyReq.field(`${sampleKey}[${key}]`, sampleValue[key]);
        }
      } else {
        createCompanyReq.field(sampleKey, sampleValue);
      }
    }

    const res2 = await createCompanyReq;

    clientAdminSample.company = res2.body.data;

    expect(res2.body.data).to.have.lengthOf(24);
    expect(clientAdminSample.company).equal(res2.body.data);
  })

  it('should return token when registered and login', async function () {
    // client admin login 
    const res = await request(app)
      .post('/auth')
      .send({ email: clientAdminSample.email, password: clientAdminSample.password });

    const jwtToken = res.body.data
    expect(res.status).equal(200);
    expect(jwtToken).to.be.a('string');

    const decoded: any = jwt.decode(jwtToken);
    expect(dayjs.unix(decoded.exp).diff(dayjs(), 'hour') + 1).equal(6);
  });

  it('should return token with exp time is 6 hours', async function () {
    // client admin login 
    const res = await request(app)
      .post('/auth')
      .send({
        email: clientAdminSample.email,
        password: clientAdminSample.password,
        keepLoggedIn: false,
      });

    const jwtToken = res.body.data
    expect(res.status).equal(200);
    expect(jwtToken).to.be.a('string');

    const decoded: any = jwt.decode(jwtToken);
    expect(dayjs.unix(decoded.exp).diff(dayjs(), 'hour') + 1).equal(6);
  });

  it('should return token with exp time is 7 days', async function () {
    // client admin login 
    const res = await request(app)
      .post('/auth')
      .send({
        email: clientAdminSample.email,
        password: clientAdminSample.password,
        keepLoggedIn: true,
      });

    const jwtToken = res.body.data
    expect(res.status).equal(200);
    expect(jwtToken).to.be.a('string');

    const decoded: any = jwt.decode(jwtToken);
    expect(dayjs.unix(decoded.exp).diff(dayjs(), 'day') + 1).equal(7);
  });

  it('should able to get user with company details by Super Admin', async function () {
    const res1 = await request(app)
      .get('/auth')
      .set('Authorization', `Bearer ${token}`);

    expect(res1.status).equal(200);
    expect(res1.body.meta.count).equal(2);

    const users = res1.body.data;
    expect(users).lengthOf(2);
    expect(users[1].company).to.include(_.omit(companySample, 'admin'));
    expect(users[1].company.logo.url).to.be.a('string');

    const id = res1.body.data[1]._id;
    const res2 = await request(app)
      .get('/auth/' + id)
      .set('Authorization', `Bearer ${token}`);

    expect(res2.status).equal(200)
    expect(res2.body.data.email).equal(clientAdminSample.email);
    expect(res2.body.data.company).to.include(_.omit(companySample, 'admin'));
    expect(res2.body.data.company.logo.url).to.be.a('string');
  });

  it('should able to get user with company details and use filters to filter users by Super Admin', async function () {
    const searchFields = ['email', 'name', 'role', 'phone'];
    for (const fieldName of searchFields) {
      const fieldValue = clientAdminSample[fieldName];
      const res1 = await request(app)
        .get(`/auth?filters[${fieldName}]=${fieldValue}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res1.status).equal(200)
      const users = res1.body.data;
      users.forEach(user => {
        expect(user[fieldName]).equal(fieldValue);
      });
    }
  })

  it('should get its own company details by client admin', async function () {
    const res1 = await request(app)
      .post('/auth')
      .send({ email: clientAdminSample.email, password: clientAdminSample.password });

    const res2 = await request(app)
      .get('/auth')
      .set('Authorization', `Bearer ${res1.body.data}`);

    expect(res2.status).equal(200);
    expect(res2.body.meta.count).gte(1);

    const companyUsers = res2.body.data;
    expect(companyUsers.length).equal(res2.body.meta.count);

    companyUsers.forEach(companyUser => {
      expect(companyUser.company).not.undefined;
      expect(companyUser.company).not.null;
      expect(companyUser.company).to.include(_.omit(companySample, 'admin'));
    });
  });



  it('should able to update self info or by super admin', async function () {
    const res1 = await request(app)
      .get('/auth')
      .set('Authorization', `Bearer ${token}`)

    const id = res1.body.data[1]._id;
    const res2 = await request(app).put(`/auth/${id}`)
    expect(res2.status).equal(401);

    // create a translation
    const postContentRes = await request(app).post(`/content`)
      .set('Authorization', `Bearer ${token}`)
      .send(translationSample);
    expect(postContentRes.status).equal(200);
    const newDefaultLanguage = postContentRes.body.data;

    /** Super admin edit another user */
    const newName = 'Alex';
    const res3 = await request(app).put(`/auth/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: newName, defaultLanguage: newDefaultLanguage });
    expect(res3.body.data).to.be.true;

    const res4 = await request(app).get(`/auth/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res4.body.data.name).equal(newName);
    expect(res4.body.data.defaultLanguage._id).equal(newDefaultLanguage);
    expect(res4.body.data.defaultLanguage.category).equal(ContentCategory.translation);

    /** User update self information */
    const newSuperAdminName = 'superhero';
    const res5 = await request(app).put(`/auth`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: newSuperAdminName, defaultLanguage: newDefaultLanguage });
    expect(res5.body.data).to.be.true;

    const decoded: any = jwt.decode(token);
    const res6 = await request(app).get(`/auth/${decoded._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res6.body.data.name).equal(newSuperAdminName);
    expect(res6.body.data.defaultLanguage._id).equal(newDefaultLanguage);
    expect(res6.body.data.defaultLanguage.category).equal(ContentCategory.translation);
  })

  it('should able to request reset password email', async function () {
    this.timeout(10000);

    const res1 = await request(app)
      .post('/auth/forget-password')
      .send({ email: clientAdminSample.email });

    expect(res1.status).equal(200);
    expect(res1.body.data).is.not.undefined;
  });

  it('should return boolean when reset password successfully', async function () {
    // As reset will not expose to any method so need to retrieve from db
    const userToReset = await User.findOne({ email: clientAdminSample.email });
    expect(userToReset).not.null;

    const newPassword = 'newpassword';

    const res1 = await request(app)
      .post('/auth/reset-password')
      .send({ token: userToReset?.resetToken, password: newPassword });
    expect(res1.body.data).is.true;

    // test login after reset
    const res2 = await request(app)
      .post('/auth')
      .send({ email: clientAdminSample.email, password: newPassword });
    expect(res2.status).equal(200);
    clientAdminSample.password = newPassword;
  });

  it('should register a new user by super admin', async function () {
    const res = await request(app)
      .post('/auth')
      .send({ email: clientAdminSample.email, password: clientAdminSample.password });
    const decoded: any = jwt.decode(res.body.data);

    const res1 = await request(app).get(`/auth/${decoded._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res1.status).equal(200);
    const clientAdmin = res1.body.data;

    // Register a user
    const res2 = await request(app).post(`/auth/register`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...userSample,
        company: clientAdmin.company._id,
      });
    expect(res2.status).equal(200);
    expect(res2.body.data).to.be.a('string');

    const userDecodedInfo: any = jwt.decode(res2.body.data);
    expect(userDecodedInfo._id).is.not.null;
    expect(userDecodedInfo.email).equal(userSample.email);
    expect(userDecodedInfo.role).equal(Roles.user);
  });

  it('should register a new user by client admin', async function () {
    // client admin login 
    const res1 = await request(app)
      .post('/auth')
      .send({ email: clientAdminSample.email, password: clientAdminSample.password });
    const clientAdminJWT = res1.body.data;
    const decoded: any = jwt.decode(clientAdminJWT);

    // Get his company id
    const res2 = await request(app).get(`/auth/${decoded._id}`)
      .set('Authorization', `Bearer ${clientAdminJWT}`);
    const companyId = res2.body.data.company._id;

    // Register a user but not matching the company id
    const res3 = await request(app).post(`/auth/register`)
      .set('Authorization', `Bearer ${clientAdminJWT}`)
      .send(userSample2);
    expect(res3.status).equal(500);
    expect(res3.body.message).equal('Wrong company ID');

    const res4 = await request(app).post(`/auth/register`)
      .set('Authorization', `Bearer ${clientAdminJWT}`)
      .send({ ...userSample2, company: companyId });
    expect(res4.status).equal(200);
  });

  it("should able to get client admin details by super admin", async function () {
    // get client admin id
    const res = await request(app)
      .post('/auth')
      .send({ email: clientAdminSample.email, password: clientAdminSample.password });
    const decoded: any = jwt.decode(res.body.data);

    const res1 = await request(app).get(`/auth/${decoded._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res1.status).equal(200);

    const clientAdmin = res1.body.data;
    expect(clientAdmin.email).equal(clientAdminSample.email);
    expect(clientAdmin.role).equal(Roles.clientAdmin);
    expect(clientAdmin.company.name).equal(companySample.name);
    expect(clientAdmin.company.email).equal(companySample.email);
  });

  it("should able to get his details by client admin", async function () {
    // client admin login 
    const res = await request(app)
      .post('/auth')
      .send({ email: clientAdminSample.email, password: clientAdminSample.password });
    const jwtToken = res.body.data;
    const decoded: any = jwt.decode(jwtToken);

    const res1 = await request(app).get(`/auth/${decoded._id}`)
      .set('Authorization', `Bearer ${jwtToken}`);
    expect(res1.status).equal(200);

    const clientAdmin = res1.body.data;
    expect(clientAdmin.email).equal(clientAdminSample.email);
    expect(clientAdmin.role).equal(Roles.clientAdmin);
    expect(clientAdmin.company.name).equal(companySample.name);
    expect(clientAdmin.company.email).equal(companySample.email);
  });

  it("should able to get his details by user", async function () {
    // client admin login 
    const res = await request(app)
      .post('/auth')
      .send({ email: userSample.email, password: userSample.password });
    const jwtToken = res.body.data;
    const decoded: any = jwt.decode(jwtToken);

    const res1 = await request(app).get(`/auth/${decoded._id}`)
      .set('Authorization', `Bearer ${jwtToken}`);
    expect(res1.status).equal(200);

    const user = res1.body.data;
    expect(user.email).equal(userSample.email);
    expect(userSample.role).equal(Roles.user);
    expect(user.company.name).equal(companySample.name);
    expect(user.company.email).equal(companySample.email);
  });

  it('should not update to super admin himself', async () => {
    const res1 = await request(app).put(`/auth/`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: Roles.clientAdmin });
    expect(res1.status).equal(500);
    expect(res1.body.message).equal("You can't update super admin to other role");
  })

  it('should not update the role of super admin himself', async () => {
    const res = await request(app)
      .post('/auth')
      .send({ email: userSample.email, password: userSample.password });
    const jwtToken = res.body.data;

    const res1 = await request(app).put(`/auth/`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ role: Roles.superAdmin });
    expect(res1.status).equal(500);
    expect(res1.body.message).equal("You can't update to super admin");
  })

  it('should not update the role of super admin account', async () => {
    const decoded: any = jwt.decode(token);

    const res1 = await request(app).put(`/auth/${decoded._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: Roles.clientAdmin });
    expect(res1.status).equal(500);
    expect(res1.body.message).equal("You can't update super admin to other role");
  })

  it('should not update to super admin', async () => {
    const res = await request(app)
      .post('/auth')
      .send({ email: userSample.email, password: userSample.password });
    const jwtToken = res.body.data;
    const decoded: any = jwt.decode(jwtToken);

    const res1 = await request(app).put(`/auth/${decoded._id}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ role: Roles.superAdmin });
    expect(res1.status).equal(500);
    expect(res1.body.message).equal("You can't update to super admin");
  })

  it("should able to get user's notification list", async () => {
    // create required notification template
    for (const dto of requiredNotificationTemplateDtoArr) {
      const postNotificationTemplateRes = await request(app).post(`/notification-template`)
        .set('Authorization', `Bearer ${token}`)
        .send(dto);
      expect(postNotificationTemplateRes.status).equal(200);
    }

    // client admin login 
    const res = await request(app)
      .post('/auth')
      .send({ email: userSample.email, password: userSample.password });
    const jwtToken = res.body.data;
    const decoded: any = jwt.decode(jwtToken);

    // send notification to client admin
    const res1 = await request(app).post(`/notification`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        uniqueId: createDeadlineRemindTemplateDto.uniqueId,
        level: NotificationLevel.info,
        receiver: decoded._id,
        payload: {
          url: '/test',
          days: 1,
          deadline: '2022-12-31',
        }
      });
    expect(res1.status).equal(200);

    // get client admin notification list
    const res2 = await request(app).get(`/auth/me/notification`)
      .set('Authorization', `Bearer ${jwtToken}`);
    expect(res2.status).equal(200);
    expect(res2.body.meta.count).equal(1);
    expect(res2.body.data).to.be.an('array');
    expect(res2.body.data.length).equal(1);
    expect(res2.body.data[0].notificationTemplate.uniqueId).equal(createDeadlineRemindTemplateDto.uniqueId);
    expect(res2.body.data[0].receiver).equal(decoded._id);
    expect(res2.body.data[0].receiverType).equal(ReceiverType.user);
    expect(res2.body.data[0].payload).include.keys(createDeadlineRemindTemplateDto.variables);
    expect(res2.body.data[0].read).equal(false);
  })

  it('should able to set the notification to read', async () => {
    // client admin login 
    const res = await request(app)
      .post('/auth')
      .send({ email: userSample.email, password: userSample.password });
    const jwtToken = res.body.data;

    // get client admin notification list
    const res2 = await request(app).get(`/auth/me/notification`)
      .set('Authorization', `Bearer ${jwtToken}`);
    expect(res2.status).equal(200);

    // update the notification
    const res3 = await request(app).put(`/auth/notification/${res2.body.data[0]._id}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ read: true });
    expect(res3.status).equal(200);

    // get client admin notification list
    const res4 = await request(app).get(`/auth/me/notification`)
      .set('Authorization', `Bearer ${jwtToken}`);
    expect(res4.status).equal(200);

    expect(res4.body.data[0].read).equal(true);
    expect(res4.body.data[0].read).is.not.null;
  })

  it('should able to delete the notification', async () => {
    // client admin login 
    const res = await request(app)
      .post('/auth')
      .send({ email: userSample.email, password: userSample.password });
    const jwtToken = res.body.data;

    // get client admin notification list
    const res2 = await request(app).get(`/auth/me/notification`)
      .set('Authorization', `Bearer ${jwtToken}`);
    expect(res2.status).equal(200);

    // delete the notification
    const res3 = await request(app).delete(`/auth/notification/${res2.body.data[0]._id}`)
      .set('Authorization', `Bearer ${jwtToken}`);
    expect(res3.status).equal(200);

    // get client admin notification list
    const res4 = await request(app).get(`/auth/me/notification`)
      .set('Authorization', `Bearer ${jwtToken}`);
    expect(res4.status).equal(200);
    expect(res4.body.data.length).equal(0);
  })

  it("should able to delete his company's user by a client admin", async function () {
    // Client admin login
    const clientAdminLoginRes = await request(app)
      .post('/auth')
      .send({ email: clientAdminSample.email, password: clientAdminSample.password });
    expect(clientAdminLoginRes.status).equal(200);
    const clientAdminJwt = clientAdminLoginRes.body.data;

    // Find one company and then add user into this company
    const getCompaniesRes = await request(app).get(`/company`)
      .set('Authorization', `Bearer ${clientAdminJwt}`);
    const company = getCompaniesRes.body.data[0];

    const newUserToDelete = {
      password: "bar123456",
      email: "deleteUser1@gmail.com",
      role: Roles.user,
      name: "Delete User 1",
      company: company._id,
      phone: "98887888",
      defaultLanguage: '63871a114d9e6ea0860f2ee4', // random ObjectId
    }

    // Register a user
    const res1 = await request(app).post(`/auth/register`)
      .set('Authorization', `Bearer ${token}`)
      .send(newUserToDelete);
    expect(res1.status).equal(200);

    // Find the user id
    const res2 = await request(app)
      .get('/auth')
      .set('Authorization', `Bearer ${clientAdminJwt}`);
    const newUser = res2.body.data.find((user) => user.email === newUserToDelete.email);

    // Delete the user
    const res3 = await request(app)
      .delete('/auth')
      .set('Authorization', `Bearer ${clientAdminJwt}`)
      .send({ id: newUser._id });

    expect(res3.status).equal(200)
    expect(res3.body.data).is.true;

    // The user should not login
    const res4 = await request(app)
      .post('/auth')
      .send({ email: newUserToDelete.email, password: newUserToDelete.password });
    expect(res4.status).equal(500);
  });

  it("should able to delete his company's client admin by a client admin", async function () {
    // Client admin login
    const clientAdminLoginRes = await request(app)
      .post('/auth')
      .send({ email: clientAdminSample.email, password: clientAdminSample.password });
    expect(clientAdminLoginRes.status).equal(200);
    const clientAdminJwt = clientAdminLoginRes.body.data;

    // Find one company and then add user into this company
    const getCompaniesRes = await request(app).get(`/company`)
      .set('Authorization', `Bearer ${clientAdminJwt}`);
    const company = getCompaniesRes.body.data[0];

    const newUserToDelete = {
      password: "bar123456",
      email: "deleteClientAdmin1@gmail.com",
      role: Roles.clientAdmin,
      name: "Delete Client Admin 1",
      company: company._id,
      phone: "98887888",
      defaultLanguage: '63871a114d9e6ea0860f2ee4', // random ObjectId
    }

    // Register a user
    const res1 = await request(app).post(`/auth/register`)
      .set('Authorization', `Bearer ${token}`)
      .send(newUserToDelete);
    expect(res1.status).equal(200);

    // Find the user id
    const res2 = await request(app)
      .get('/auth')
      .set('Authorization', `Bearer ${clientAdminJwt}`);
    const newUser = res2.body.data.find((user) => user.email === newUserToDelete.email);

    // Delete the user
    const res3 = await request(app)
      .delete('/auth')
      .set('Authorization', `Bearer ${clientAdminJwt}`)
      .send({ id: newUser._id });

    expect(res3.status).equal(200)
    expect(res3.body.data).is.true;

    // The user should not login
    const res4 = await request(app)
      .post('/auth')
      .send({ email: newUserToDelete.email, password: newUserToDelete.password });
    expect(res4.status).equal(500);
  });

  it('should not delete super admin', async () => {
    const decoded: any = jwt.decode(token);
    const res = await request(app)
      .delete('/auth')
      .set('Authorization', `Bearer ${token}`)
      .send({ id: decoded._id });

    expect(res.status).equal(500);
    expect(res.body.message).equal('You are not allowed to delete super admin');
  })

  for (const role of [Roles.clientAdmin, Roles.user]) {
    it(`should able to delete a ${role} by a super admin`, async function () {
      // Find one company and then add user into this company
      const getCompaniesRes = await request(app).get(`/company`).set('Authorization', `Bearer ${token}`);
      const company = getCompaniesRes.body.data[0];

      const newUserToDelete = {
        password: "bar123456",
        email: "deleteUser1@gmail.com",
        role,
        name: "Delete User 1",
        company: company._id,
        phone: "98887888",
        defaultLanguage: '63871a114d9e6ea0860f2ee4', // random ObjectId
      }

      // Register a user
      const res1 = await request(app).post(`/auth/register`)
        .set('Authorization', `Bearer ${token}`)
        .send(newUserToDelete);
      expect(res1.status).equal(200);

      // Find the user id
      const res2 = await request(app)
        .get('/auth')
        .set('Authorization', `Bearer ${token}`);
      const newUser = res2.body.data.find((user) => user.email === newUserToDelete.email);

      // Delete the user
      const res3 = await request(app)
        .delete('/auth')
        .set('Authorization', `Bearer ${token}`)
        .send({ id: newUser._id });

      expect(res3.status).equal(200)
      expect(res3.body.data).is.true;

      // The user should not login
      const res4 = await request(app)
        .post('/auth')
        .send({ email: newUserToDelete.email, password: newUserToDelete.password });
      expect(res4.status).equal(500);
    });
  }

  for (const role of [Roles.clientAdmin, Roles.user]) {
    it(`should able to delete a ${role} by a client admin`, async function () {
      // client admin login 
      const res1 = await request(app)
        .post('/auth')
        .send({ email: clientAdminSample.email, password: clientAdminSample.password });
      const clientAdminJWT = res1.body.data;

      const res2 = await request(app)
        .get('/auth')
        .set('Authorization', `Bearer ${clientAdminJWT}`);
      const companyId = res2.body.data[0].company._id;

      const newUserToDelete = {
        password: "bar123456",
        email: "deleteUser1@gmail.com",
        role: role,
        name: "Delete User 1",
        company: companyId,
        phone: "98887888",
        defaultLanguage: '63871a114d9e6ea0860f2ee4', // random ObjectId
      }

      // Register a user
      const res3 = await request(app).post(`/auth/register`)
        .set('Authorization', `Bearer ${token}`)
        .send(newUserToDelete);
      expect(res3.status).equal(200);

      // Find the user id
      const res4 = await request(app)
        .get('/auth')
        .set('Authorization', `Bearer ${token}`);
      const newUser = res4.body.data.find((user) => user.email === newUserToDelete.email);

      // Delete the user
      const res5 = await request(app)
        .delete('/auth')
        .set('Authorization', `Bearer ${clientAdminJWT}`)
        .send({ id: newUser._id });

      expect(res5.status).equal(200)
      expect(res5.body.data).is.true;

      // The user should not login
      const res6 = await request(app)
        .post('/auth')
        .send({ email: newUserToDelete.email, password: newUserToDelete.password });
      expect(res6.status).equal(500);
    });
  }

  it('should have 8 add user log', async () => {
    const result = await mongoose.model('user_activity_logs').find({
      resource: 'user',
      action: 'add'
    }).exec()
    expect(result.length).equal(8);
  })

  it('should have 2 edit user log', async () => {
    const result = await mongoose.model('user_activity_logs').find({
      resource: 'user',
      action: 'edit'
    }).exec()
    expect(result.length).equal(2);
  })

  it('should have 1 delete user log', async () => {
    const result = await mongoose.model('user_activity_logs').find({
      resource: 'user',
      action: 'delete'
    }).exec()
    expect(result.length).equal(6);
  })

  after(async () => {
    await shutdown();
  });
});