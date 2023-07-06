require('dotenv').config();

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import _ from 'lodash';
import request from "supertest";
import jwt from 'jsonwebtoken';
import nodePath from 'path';
import dayjs from 'dayjs';
import MockDate from 'mockdate';
import mongoose from 'mongoose';

import server, { shutdown } from '../../../app';

import { generateFormPostDto, getComingFinancialYearEndDate } from "./sample";
import { sampleCompanies } from "../../company/test/sample";
import { sampleMaterials, sampleMatrixMaterial } from "../../material/test/sample";
import { sampleFormTemplates } from "../../form-template/test/sample";
import { FormPostDto } from '../interfaces/dto';
import { formStatus } from '../interfaces/form';
import { generateMeterPostDto } from "../../meter/test/sample";
import { userSample } from '../../auth/test/sample'
import { createAssignUserTemplateDto, createClientAdminRejectFormTemplateDto, createUserSubmitFormTemplateDto, requiredNotificationTemplateDtoArr } from '../../notification-template/test/sample';
import { ReceiverType } from '../../notification/interfaces/notification';
import { postUnitRequest, unitSample1 } from '../../unit/test/sample';
import { qnaType } from '../../material/interfaces/materialForm';
import { FormTemplatePostDto } from '../../form-template/interfaces/dto';

chai.use(chaiAsPromised);
chai.should();
const expect = chai.expect;

let app: any;
let superAdminJwt: string;
let clientAdminJwT: string;
let userJwt: string;

const path = 'form';

describe('form controller', () => {
  let sampleFormPostDto: FormPostDto;

  before(async () => {
    app = await server();
    const response = await request(app).post('/auth/superadmin?secret=dijMz13OsM')
    superAdminJwt = response.body.data;

    sampleFormPostDto = await generateFormPostDto({
      app,
      jwt: superAdminJwt,
      data: {
        company: sampleCompanies[0],
        materials: sampleMaterials,
        formTemplate: sampleFormTemplates[0],
        financialYear: getComingFinancialYearEndDate(),
      },
    })

    // create required notification template
    for (const dto of requiredNotificationTemplateDtoArr) {
      const postNotificationTemplateRes = await request(app).post(`/notification-template`)
        .set('Authorization', `Bearer ${superAdminJwt}`)
        .send(dto);
      expect(postNotificationTemplateRes.status).equal(200);
    }

    const res1 = await request(app)
      .post('/auth')
      .send({ email: sampleCompanies[0].admin.email, password: sampleCompanies[0].admin.password });
    clientAdminJwT = res1.body.data;

    // create user
    const res2 = await request(app).post(`/auth/register`)
      .set('Authorization', `Bearer ${superAdminJwt}`)
      .send({
        ...userSample,
        company: sampleFormPostDto.company,
      });
    userJwt = res2.body.data;

    // create unit
    const createUnitRes = await postUnitRequest({
      app,
      jwt: superAdminJwt,
      data: unitSample1,
    })
  });

  it('should create form successfully and get by super admin', async () => {
    const res1 = await request(app).post(`/${path}`)
      .set('Authorization', `Bearer ${superAdminJwt}`)
      .send(sampleFormPostDto);
    expect(res1.status).equal(200);
    expect(res1.body.data).to.be.a('string');

    const res2 = await request(app).get(`/${path}/${res1.body.data}`)
      .set('Authorization', `Bearer ${superAdminJwt}`);
    expect(res2.status).equal(200);
    const form = res2.body.data;

    expect(form._id).to.be.a('string');
    expect(form.formTemplate.name).equal(sampleFormTemplates[0].name);
    expect(form.formTemplate.uniqueId).equal(sampleFormTemplates[0].uniqueId);
    expect(form.formTemplate.materials.length).equal(2);
    expect(form.company._id).equal(sampleFormPostDto.company);
    expect(form.financialYear).equal(getComingFinancialYearEndDate());
    expect(form.status).equal(formStatus.inProgress);
    expect(form.editingUser).equal(null);
    expect(form.locked).equal(null);
    expect(form.materialFieldsCount).equal(8); // 2 texts + 3*2 matrix = 8
    expect(form.inputtedFieldsCount).equal(0);
    expect(form.fieldsTotal).equal(0);
    expect(form.inputProgress).equal(0);
    expect(form.meters.length).equal(0);
    expect(form.adminCheckedCount).equal(0);
    expect(form.adminCheckedProgress).equal(0);
    expect(form.attachmentsCount).equal(0);
  });

  it('should not create same form in same financial year', async () => {
    const res1 = await request(app).post(`/${path}`)
      .set('Authorization', `Bearer ${superAdminJwt}`)
      .send(sampleFormPostDto);
    expect(res1.status).equal(500);
    expect(res1.body.message).equal('This form is created');
  })

  it('should not create form that financial year end date is expired', async () => {
    const res1 = await request(app).post(`/${path}`)
      .set('Authorization', `Bearer ${superAdminJwt}`)
      .send({
        ...sampleFormPostDto,
        financialYear: '2020-03-31',
      });
    expect(res1.status).equal(500);
    expect(res1.body.message).equal("Today is outside reporting period. You can't create the form");
  })

  it('should get array of form', async () => {
    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${superAdminJwt}`);
    expect(res1.status).equal(200);
    expect(res1.body.data).to.be.an('array');
    expect(res1.body.data.length).equal(1);
    expect(res1.body.meta.count).equal(res1.body.data.length);
    expect(res1.body.meta.page).equal(1);
    expect(res1.body.meta.meter.incomplete).equal(0);

    for (const form of res1.body.data) {
      expect(form._id).to.be.a('string');
    }
  })

  it('should get bookmarked form list by User', async () => {
    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${superAdminJwt}`);
    expect(res1.status).equal(200);
    const formId = res1.body.data[0]._id;

    // create bookmark
    const res2 = await request(app).post(`/bookmark`)
      .set('Authorization', `Bearer ${userJwt}`)
      .send({
        collectionName: 'form',
        documentId: formId,
      });
    expect(res2.status).equal(200);

    // get bookmarked form list
    const res3 = await request(app).get(`/${path}?bookmarked=true`).set('Authorization', `Bearer ${userJwt}`);
    expect(res3.status).equal(200);
    expect(res3.body.data).to.be.an('array');
    expect(res3.body.data.length).equal(1);
    expect(res3.body.meta.count).equal(res3.body.data.length);
    expect(res3.body.meta.page).equal(1);
    expect(res3.body.data[0]._id).equal(formId);

    // get non-bookmarked form list
    const res4 = await request(app).get(`/${path}?bookmarked=false`).set('Authorization', `Bearer ${userJwt}`);
    expect(res4.status).equal(200);
    expect(res4.body.data).to.be.an('array');
    expect(res4.body.data.length).equal(0);
    expect(res4.body.meta.count).equal(res4.body.data.length);
    expect(res4.body.meta.page).equal(1);

    // other user doesn't have any bookmarked form
    const res5 = await request(app).get(`/${path}?bookmarked=true`).set('Authorization', `Bearer ${superAdminJwt}`);
    expect(res5.status).equal(200);
    expect(res5.body.data).to.be.an('array');
    expect(res5.body.data.length).equal(0);
    expect(res5.body.meta.count).equal(res5.body.data.length);
    expect(res5.body.meta.page).equal(1);
  })

  it('should assign no one to the form by Client Admin', async () => {
    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${clientAdminJwT}`);
    expect(res1.status).equal(200);
    const formId = res1.body.data[0]._id;

    const decoded: any = jwt.decode(userJwt);

    // assign no user
    const res2 = await request(app).put(`/${path}/${formId}`)
      .set('Authorization', `Bearer ${clientAdminJwT}`)
      .send({
        submitted: false,
        assignees: []
      });
    expect(res2.status).equal(200);

    const res3 = await request(app).get(`/${path}/${formId}`)
      .set('Authorization', `Bearer ${superAdminJwt}`);
    expect(res3.status).equal(200);

    const form = res3.body.data;
    expect(form._id).to.be.a('string');
    expect(form.formTemplate.name).equal(sampleFormTemplates[0].name);
    expect(form.formTemplate.uniqueId).equal(sampleFormTemplates[0].uniqueId);
    expect(form.assignees.length).equal(0);

    const res4 = await request(app).get(`/${path}/${formId}`)
      .set('Authorization', `Bearer ${userJwt}`);
    expect(res4.status).equal(500);
    expect(res4.body.message).equal('You are not assigned to edit this form');

    // User have no form in his list
    const res5 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${userJwt}`);
    expect(res5.status).equal(200);
    expect(res5.body.data).to.be.an('array');
    expect(res5.body.data.length).equal(0);
  })

  it('should assign any user to the form by Client Admin', async () => {
    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${clientAdminJwT}`);
    expect(res1.status).equal(200);
    const formId = res1.body.data[0]._id;

    // let all user edit
    const res2 = await request(app).put(`/${path}/${formId}`)
      .set('Authorization', `Bearer ${clientAdminJwT}`)
      .send({
        submitted: false,
        assignees: null
      });
    expect(res2.status).equal(200);

    // User can get the form
    const res3 = await request(app).get(`/${path}/${formId}`)
      .set('Authorization', `Bearer ${userJwt}`);
    expect(res3.status).equal(200);

    const form = res3.body.data;
    expect(form._id).to.be.a('string');
    expect(form.formTemplate.name).equal(sampleFormTemplates[0].name);
    expect(form.formTemplate.uniqueId).equal(sampleFormTemplates[0].uniqueId);
    expect(form.assignees).equal(null);

    // User have 1 form in his list
    const res4 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${userJwt}`);
    expect(res4.status).equal(200);
    expect(res4.body.data).to.be.an('array');
    expect(res4.body.data.length).equal(1);
    expect(res4.body.data[0]._id).equal(formId);
  })

  it('should assign user to the form by Client Admin', async () => {
    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${clientAdminJwT}`);
    expect(res1.status).equal(200);
    const formId = res1.body.data[0]._id;

    const decoded: any = jwt.decode(userJwt);

    // assign user
    const res2 = await request(app).put(`/${path}/${formId}`)
      .set('Authorization', `Bearer ${clientAdminJwT}`)
      .send({
        submitted: false,
        assignees: [decoded._id]
      });
    expect(res2.status).equal(200);

    // user should get a notification
    const getUserNotificationRes1 = await request(app).get(`/auth/me/notification`)
      .set('Authorization', `Bearer ${userJwt}`);
    expect(getUserNotificationRes1.status).equal(200);
    expect(getUserNotificationRes1.body.data).to.be.an('array');
    
    expect(getUserNotificationRes1.body.data.length).equal(3);
    expect(getUserNotificationRes1.body.meta.count).equal(getUserNotificationRes1.body.data.length);

    const notification1 = getUserNotificationRes1.body.data[0];
    expect(notification1.notificationTemplate.uniqueId).equal(createAssignUserTemplateDto.uniqueId);
    expect(notification1.receiver).equal(decoded._id);
    expect(notification1.receiverType).equal(ReceiverType.user);
    expect(notification1.payload.formId).equal(formId);

    // check user is assigned
    const res3 = await request(app).get(`/${path}/${formId}`)
      .set('Authorization', `Bearer ${superAdminJwt}`);
    expect(res3.status).equal(200);

    const form = res3.body.data;
    expect(form._id).to.be.a('string');
    expect(form.formTemplate.name).equal(sampleFormTemplates[0].name);
    expect(form.formTemplate.uniqueId).equal(sampleFormTemplates[0].uniqueId);
    expect(form.assignees[0]._id).equal(decoded._id);

    // User have 1 form in his list
    const res4 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${userJwt}`);
    expect(res4.status).equal(200);
    expect(res4.body.data).to.be.an('array');
    expect(res4.body.data.length).equal(1);
    expect(res4.body.data[0]._id).equal(formId);
    expect(res4.body.data[0].assignees[0]._id).equal(decoded._id);
  })

  it('should update the form status to "submitted" by User', async () => {
    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${clientAdminJwT}`);
    expect(res1.status).equal(200);
    expect(res1.body.data).to.be.an('array');

    const formId = res1.body.data[0]._id;

    // create meter to the form
    const meterPostDto = generateMeterPostDto(formId, 'Meter 1');

    const res2 = await request(app).post(`/meter`)
      .set('Authorization', `Bearer ${clientAdminJwT}`)
      .send(meterPostDto);
    expect(res2.status).equal(200);
    const meterId = res2.body.data;

    const getFormRes2 = await request(app).get(`/${path}/${formId}`)
      .set('Authorization', `Bearer ${userJwt}`);
    expect(getFormRes2.status).equal(200);

    const form2 = getFormRes2.body.data;
    expect(form2.materialFieldsCount).equal(8);
    expect(form2.inputtedFieldsCount).equal(0);
    expect(form2.fieldsTotal).equal(form2.materialFieldsCount * 1);
    expect(form2.inputProgress).equal(0);
    expect(form2.meters.length).equal(1);
    expect(form2.meters).contain(meterId);

    const correctInputs = [
      [{ answer: 'ans 1' }, { answer: 'ans2' }],
      {
        answer: [
          [123, 100.23, 'Name 1'], [234, 234.56, 'Name 2']
        ],
        unit: ["L", "L", "N/A"],
      }
    ];

    // save 4 inputs
    const putMeterRes1 = await request(app).put(`/meter/${meterId}`)
      .set('Authorization', `Bearer ${userJwt}`)
      .send({
        inputs: [
          [{ answer: 'ans 1' }, { answer: '' }],
          {
            answer: [
              [123, '', 'Name 1'], [234, '', '']
            ],
            unit: ["L", "L", "N/A"],
          }
        ],
        submitted: false,
      });
    expect(putMeterRes1.status).equal(200);
    expect(putMeterRes1.body.data).equal(true);

    const putFormRes1 = await request(app).put(`/${path}/${formId}`)
      .set('Authorization', `Bearer ${userJwt}`)
      .send({
        submitted: false,
      });
    expect(putFormRes1.status).equal(200);

    const getFormRes3 = await request(app).get(`/${path}/${formId}`)
      .set('Authorization', `Bearer ${userJwt}`);
    expect(getFormRes3.status).equal(200);

    // 4 fields are inputted
    const form3 = getFormRes3.body.data;
    expect(form3.materialFieldsCount).equal(8);
    expect(form3.inputtedFieldsCount).equal(4);
    expect(form3.fieldsTotal).equal(8);
    expect(form3.inputProgress).equal(0.5);
    expect(form3.meters.length).equal(1);
    expect(form3.meters).contain(meterId);

    // 50% user complete schedule & 0% admin check progress
    const getCompanyRes1 = await request(app).get(`/company`)
      .set('Authorization', `Bearer ${userJwt}`);
    const company = getCompanyRes1.body.data[0];
    expect(company.materialFieldsCount).equal(2 + 6);
    expect(company.inputtedFieldsCount).equal(4);
    expect(company.fieldsTotal).equal((2 + 6));
    expect(company.inputProgress).equal(0.5);
    expect(company.adminCheckedCount).equal(0);
    expect(company.adminCheckedProgress).equal(0);

    // save all inputs
    const res3 = await request(app).put(`/meter/${meterId}`)
      .set('Authorization', `Bearer ${userJwt}`)
      .send({
        inputs: correctInputs,
        submitted: false,
      });
    expect(res3.status).equal(200);
    expect(res3.body.data).equal(true);

    const putFormRes2 = await request(app).put(`/${path}/${formId}`)
      .set('Authorization', `Bearer ${userJwt}`)
      .send({
        submitted: false,
      });
    expect(putFormRes2.status).equal(200);

    const getFormRes4 = await request(app).get(`/${path}/${formId}`)
      .set('Authorization', `Bearer ${userJwt}`);
    expect(getFormRes4.status).equal(200);

    // all fields are inputted
    const form4 = getFormRes4.body.data;
    expect(form4.materialFieldsCount).equal(8);
    expect(form4.inputtedFieldsCount).equal(8);
    expect(form4.fieldsTotal).equal(form4.inputtedFieldsCount);
    expect(form4.inputProgress).equal(1);
    expect(form4.meters.length).equal(1);
    expect(form4.meters).contain(meterId);

    // submit the form
    const res4 = await request(app).put(`/${path}/${formId}`)
      .set('Authorization', `Bearer ${userJwt}`)
      .send({
        submitted: true,
        nextStatus: formStatus.submitted,
      });
    expect(res4.status).equal(200);

    // client admin should get a notification
    const getUserNotificationRes1 = await request(app).get(`/auth/me/notification`)
      .set('Authorization', `Bearer ${clientAdminJwT}`);
    expect(getUserNotificationRes1.status).equal(200);
    expect(getUserNotificationRes1.body.data).to.be.an('array');
    expect(getUserNotificationRes1.body.data.length).equal(1);
    expect(getUserNotificationRes1.body.meta.count).equal(getUserNotificationRes1.body.data.length);

    const decodedClientAdmin: any = jwt.decode(clientAdminJwT);
    const notification1 = getUserNotificationRes1.body.data[0];
    expect(notification1.notificationTemplate.uniqueId).equal(createUserSubmitFormTemplateDto.uniqueId);
    expect(notification1.receiver).equal(decodedClientAdmin._id);
    expect(notification1.receiverType).equal(ReceiverType.user);
    expect(notification1.payload.formId).equal(formId);

    // 100% user complete schedule & 0% admin check progress
    const getCompanyRes2 = await request(app).get(`/company`)
      .set('Authorization', `Bearer ${clientAdminJwT}`);
    const company2 = getCompanyRes2.body.data[0];
    expect(company2.materialFieldsCount).equal(2 + 6);
    expect(company2.inputtedFieldsCount).equal((2 + 6));
    expect(company2.fieldsTotal).equal((2 + 6));
    expect(company2.inputProgress).equal(1);
    expect(company2.adminCheckedCount).equal(0);
    expect(company2.adminCheckedProgress).equal(0);

    // check form is submitted
    const res5 = await request(app).get(`/${path}/${formId}`).set('Authorization', `Bearer ${userJwt}`);
    expect(res5.status).equal(200);
    expect(res5.body.data._id).equal(formId);
    expect(res5.body.data.status).equal(formStatus.submitted);

    // check count 1 incomplete meter in the form list
    const res6 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${userJwt}`);
    expect(res6.body.data.length).equal(1);
    expect(res6.body.data[0].meters.length).equal(1);
    expect(res6.body.meta.meter.incomplete).equal(1);;
  });

  it('should not do unit conversion if select "N/A" and get 0 if no data input', async () => {
    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${userJwt}`);
    expect(res1.status).equal(200);
    expect(res1.body.data).to.be.an('array');

    const formId = res1.body.data[0]._id;

    const res3 = await request(app).get(`/${path}/${formId}`).set('Authorization', `Bearer ${clientAdminJwT}`);
    const meterId = res3.body.data.meters[0];

    const inputs = [
      [{ answer: 'ans 3' }, { answer: 'ans 4' }],
      {
        answer: [
          [123, 1.1, 'Tom'], [234, '', 'John']
        ],
        unit: ["L", "N/A", "N/A"],
      }
    ];

    const putMeterRes = await request(app).put(`/meter/${meterId}`)
      .set('Authorization', `Bearer ${clientAdminJwT}`)
      .send({
        inputs: inputs,
        submitted: false,
      });
    expect(putMeterRes.status).equal(200);
    expect(putMeterRes.body.data).equal(true);

    // save the form
    const res4 = await request(app).put(`/${path}/${formId}`)
      .set('Authorization', `Bearer ${clientAdminJwT}`)
      .send({
        submitted: false,
      });
    expect(res4.status).equal(200);

    const res2 = await request(app).get(`/${path}/${formId}/matrixInputResult`).set('Authorization', `Bearer ${clientAdminJwT}`);
    expect(res2.status).equal(200);

    const matrixInputResult = res2.body.data;
    expect(matrixInputResult).to.be.an('array');
    expect(matrixInputResult.length).equal(1);

    // data
    expect(matrixInputResult[0].data).to.be.an('array');
    expect(matrixInputResult[0].data.length).equal(4);

    expect(matrixInputResult[0].data[0].row).equal(sampleMatrixMaterial.content[0].rows[0].name);
    expect(matrixInputResult[0].data[0].col).equal(sampleMatrixMaterial.content[0].columns[0].name);
    expect(matrixInputResult[0].data[0].value).equal(123);
    expect(matrixInputResult[0].data[0].unit).equal(sampleMatrixMaterial.content[0].columns[0].outputUnit);

    expect(matrixInputResult[0].data[1].row).equal(sampleMatrixMaterial.content[0].rows[0].name);
    expect(matrixInputResult[0].data[1].col).equal(sampleMatrixMaterial.content[0].columns[1].name);
    expect(matrixInputResult[0].data[1].value).equal(1.1);
    expect(matrixInputResult[0].data[1].unit).equal(sampleMatrixMaterial.content[0].columns[1].outputUnit);

    expect(matrixInputResult[0].data[2].row).equal(sampleMatrixMaterial.content[0].rows[1].name);
    expect(matrixInputResult[0].data[2].col).equal(sampleMatrixMaterial.content[0].columns[0].name);
    expect(matrixInputResult[0].data[2].value).equal(234);
    expect(matrixInputResult[0].data[2].unit).equal(sampleMatrixMaterial.content[0].columns[0].outputUnit);

    expect(matrixInputResult[0].data[3].row).equal(sampleMatrixMaterial.content[0].rows[1].name);
    expect(matrixInputResult[0].data[3].col).equal(sampleMatrixMaterial.content[0].columns[1].name);
    expect(matrixInputResult[0].data[3].value).equal(0);
    expect(matrixInputResult[0].data[3].unit).equal(sampleMatrixMaterial.content[0].columns[1].outputUnit);

    // groupByRow
    expect(matrixInputResult[0].groupByRow).to.be.an('array');
    expect(matrixInputResult[0].groupByRow.length).equal(2);

    expect(matrixInputResult[0].groupByRow[0].row).equal(sampleMatrixMaterial.content[0].rows[0].name);
    expect(matrixInputResult[0].groupByRow[0][sampleMatrixMaterial.content[0].columns[0].name].value).equal(123);
    expect(matrixInputResult[0].groupByRow[0][sampleMatrixMaterial.content[0].columns[0].name].unit).equal(sampleMatrixMaterial.content[0].columns[0].outputUnit);
    expect(matrixInputResult[0].groupByRow[0][sampleMatrixMaterial.content[0].columns[1].name].value).equal(1.1);
    expect(matrixInputResult[0].groupByRow[0][sampleMatrixMaterial.content[0].columns[1].name].unit).equal(sampleMatrixMaterial.content[0].columns[1].outputUnit);

    expect(matrixInputResult[0].groupByRow[1].row).equal(sampleMatrixMaterial.content[0].rows[1].name);
    expect(matrixInputResult[0].groupByRow[1][sampleMatrixMaterial.content[0].columns[0].name].value).equal(234);
    expect(matrixInputResult[0].groupByRow[1][sampleMatrixMaterial.content[0].columns[0].name].unit).equal(sampleMatrixMaterial.content[0].columns[0].outputUnit);
    expect(matrixInputResult[0].groupByRow[1][sampleMatrixMaterial.content[0].columns[1].name].value).equal(0);
    expect(matrixInputResult[0].groupByRow[1][sampleMatrixMaterial.content[0].columns[1].name].unit).equal(sampleMatrixMaterial.content[0].columns[1].outputUnit);

    // groupByCol
    expect(matrixInputResult[0].groupByCol).to.be.an('array');
    expect(matrixInputResult[0].groupByCol.length).equal(2);

    expect(matrixInputResult[0].groupByCol[0].col).equal(sampleMatrixMaterial.content[0].columns[0].name);
    expect(matrixInputResult[0].groupByCol[0][sampleMatrixMaterial.content[0].rows[0].name].value).equal(123);
    expect(matrixInputResult[0].groupByCol[0][sampleMatrixMaterial.content[0].rows[0].name].unit).equal(sampleMatrixMaterial.content[0].columns[0].outputUnit);
    expect(matrixInputResult[0].groupByCol[0][sampleMatrixMaterial.content[0].rows[1].name].value).equal(234);
    expect(matrixInputResult[0].groupByCol[0][sampleMatrixMaterial.content[0].rows[1].name].unit).equal(sampleMatrixMaterial.content[0].columns[0].outputUnit);

    expect(matrixInputResult[0].groupByCol[1].col).equal(sampleMatrixMaterial.content[0].columns[1].name);
    expect(matrixInputResult[0].groupByCol[1][sampleMatrixMaterial.content[0].rows[0].name].value).equal(1.1);
    expect(matrixInputResult[0].groupByCol[1][sampleMatrixMaterial.content[0].rows[0].name].unit).equal(sampleMatrixMaterial.content[0].columns[1].outputUnit);
    expect(matrixInputResult[0].groupByCol[1][sampleMatrixMaterial.content[0].rows[1].name].value).equal(0);
    expect(matrixInputResult[0].groupByCol[1][sampleMatrixMaterial.content[0].rows[1].name].unit).equal(sampleMatrixMaterial.content[0].columns[1].outputUnit);

  })

  it('should not update the form status after submitted by User', async () => {
    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${userJwt}`);
    expect(res1.status).equal(200);
    expect(res1.body.data).to.be.an('array');

    const formId = res1.body.data[0]._id;

    const res6 = await request(app).put(`/${path}/${formId}`)
      .set('Authorization', `Bearer ${userJwt}`)
      .send({
        submitted: false,
      });
    expect(res6.status).equal(500);
    expect(res6.body.message).equal('This form is submitted. You are not allowed to update this form.');
  })

  it('should update the form status to "error" by Client Admin', async () => {
    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${clientAdminJwT}`);
    expect(res1.status).equal(200);
    expect(res1.body.data).to.be.an('array');

    const formId = res1.body.data[0]._id;

    // save the form
    const res2 = await request(app).put(`/${path}/${formId}`)
      .set('Authorization', `Bearer ${clientAdminJwT}`)
      .send({
        submitted: false,
      });
    expect(res2.status).equal(200);

    const res3 = await request(app).get(`/${path}/${formId}`).set('Authorization', `Bearer ${clientAdminJwT}`);
    expect(res3.status).equal(200);
    expect(res3.body.data._id).equal(formId);
    expect(res3.body.data.status).equal(formStatus.submitted);
    expect(res3.body.data.adminCheckedCount).equal(0);
    expect(res3.body.data.adminCheckedProgress).equal(0);

    const correctInputs = [
      [{ answer: 'ans 3' }, { answer: 'ans 4' }],
      {
        answer: [
          [123, 100.23, 'Tom'], [234, 234.56, 'John']
        ],
        unit: ["L", "L", "N/A"],
      }
    ];

    for (const meterId of res3.body.data.meters) {
      const putMeterRes = await request(app).put(`/meter/${meterId}`)
        .set('Authorization', `Bearer ${clientAdminJwT}`)
        .send({
          inputs: correctInputs,
          submitted: false,
          approved: false,
          errorReason: 'Please check'
        });
      expect(putMeterRes.status).equal(200);
      expect(putMeterRes.body.data).equal(true);
    }

    // save the form
    const res4 = await request(app).put(`/${path}/${formId}`)
      .set('Authorization', `Bearer ${clientAdminJwT}`)
      .send({
        submitted: true,
        nextStatus: formStatus.error,
      });
    expect(res4.status).equal(200);

    // client admin send a reject form notification to user
    const getUserNotificationRes1 = await request(app).get(`/auth/me/notification`)
      .set('Authorization', `Bearer ${userJwt}`);
    expect(getUserNotificationRes1.status).equal(200);
    expect(getUserNotificationRes1.body.data).to.be.an('array');
    expect(getUserNotificationRes1.body.data.length).equal(4);
    expect(getUserNotificationRes1.body.meta.count).equal(getUserNotificationRes1.body.data.length);

    const decoded: any = jwt.decode(userJwt);
    const notification1 = getUserNotificationRes1.body.data[0];
    expect(notification1.notificationTemplate.uniqueId).equal(createClientAdminRejectFormTemplateDto.uniqueId);
    expect(notification1.receiver).equal(decoded._id);
    expect(notification1.receiverType).equal(ReceiverType.user);
    expect(notification1.payload.formId).equal(formId);

    // 100% user complete schedule & 0% admin check progress
    const getCompanyRes1 = await request(app).get(`/company`)
      .set('Authorization', `Bearer ${clientAdminJwT}`);
    const company = getCompanyRes1.body.data[0];
    expect(company.materialFieldsCount).equal(2 + 6);
    expect(company.inputtedFieldsCount).equal((2 + 6));
    expect(company.fieldsTotal).equal((2 + 6));
    expect(company.inputProgress).equal(1);
    expect(company.adminCheckedCount).equal(0);
    expect(company.adminCheckedProgress).equal(0);

    // check the form
    const res5 = await request(app).get(`/${path}/${formId}`).set('Authorization', `Bearer ${clientAdminJwT}`);
    expect(res5.status).equal(200);
    expect(res5.body.data._id).equal(formId);
    expect(res5.body.data.status).equal(formStatus.error);
    expect(res5.body.data.adminCheckedCount).equal(0); // new def: count approved: true only
    expect(res5.body.data.adminCheckedProgress).equal(0); // new def: count approved: true only

    // check count 1 incomplete meter in the form list
    const res6 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${userJwt}`);
    expect(res6.body.data.length).equal(1);
    expect(res6.body.data[0].meters.length).equal(1);
    expect(res6.body.meta.meter.incomplete).equal(1);
  })

  it('should update the form status to "check-again" by User', async () => {
    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${clientAdminJwT}`);
    expect(res1.status).equal(200);
    expect(res1.body.data).to.be.an('array');

    const formId = res1.body.data[0]._id;

    // create meter to the form
    const meterPostDto = generateMeterPostDto(formId, 'Meter 2');

    const postMeterRes = await request(app).post(`/meter`)
      .set('Authorization', `Bearer ${clientAdminJwT}`)
      .send(meterPostDto);
    expect(postMeterRes.status).equal(200);
    const meterId = postMeterRes.body.data;

    // check meter is added to the form
    const getFormRes2 = await request(app).get(`/${path}/${formId}`)
      .set('Authorization', `Bearer ${userJwt}`);
    expect(getFormRes2.status).equal(200);

    const form2 = getFormRes2.body.data;
    expect(form2.materialFieldsCount).equal(8);
    expect(form2.inputtedFieldsCount).equal(8);
    expect(form2.fieldsTotal).equal(form2.materialFieldsCount * 2);
    expect(form2.inputProgress).equal(0.5); // 8 / 16 (materialFieldsCount * 2)
    expect(form2.meters.length).equal(2);
    expect(form2.meters).contain(meterId);

    // save the new meter
    const correctInputs = [
      [{ answer: 'ans 3' }, { answer: 'ans 4' }],
      {
        answer: [
          [123, 100.23, 'Tom'], [234, 234.56, 'John']
        ],
        unit: ["L", "L", "N/A"],
      }
    ];
    const putMeterRes = await request(app).put(`/meter/${meterId}`)
      .set('Authorization', `Bearer ${clientAdminJwT}`)
      .send({
        inputs: correctInputs,
        submitted: false,
      });
    expect(putMeterRes.status).equal(200);
    expect(putMeterRes.body.data).equal(true);

    // save the form
    const res2 = await request(app).put(`/${path}/${formId}`)
      .set('Authorization', `Bearer ${userJwt}`)
      .send({
        submitted: false,
      });
    expect(res2.status).equal(200);

    const res3 = await request(app).get(`/${path}/${formId}`).set('Authorization', `Bearer ${userJwt}`);
    expect(res3.status).equal(200);
    expect(res3.body.data._id).equal(formId);
    expect(res3.body.data.status).equal(formStatus.error);

    // submit the form
    const res4 = await request(app).put(`/${path}/${formId}`)
      .set('Authorization', `Bearer ${userJwt}`)
      .send({
        submitted: true,
        nextStatus: formStatus.checkAgain,
      });
    expect(res4.status).equal(200);

    // client admin should get a notification
    const getUserNotificationRes1 = await request(app).get(`/auth/me/notification`)
      .set('Authorization', `Bearer ${clientAdminJwT}`);
    expect(getUserNotificationRes1.status).equal(200);
    expect(getUserNotificationRes1.body.data).to.be.an('array');
    expect(getUserNotificationRes1.body.data.length).equal(2);
    expect(getUserNotificationRes1.body.meta.count).equal(getUserNotificationRes1.body.data.length);

    const decodedClientAdmin: any = jwt.decode(clientAdminJwT);
    const notification1 = getUserNotificationRes1.body.data[0];
    expect(notification1.notificationTemplate.uniqueId).equal(createUserSubmitFormTemplateDto.uniqueId);
    expect(notification1.receiver).equal(decodedClientAdmin._id);
    expect(notification1.receiverType).equal(ReceiverType.user);
    expect(notification1.payload.formId).equal(formId);

    // 100% user complete schedule & 0% admin check progress
    const getCompanyRes1 = await request(app).get(`/company`)
      .set('Authorization', `Bearer ${clientAdminJwT}`);
    const company1 = getCompanyRes1.body.data[0];
    expect(company1.materialFieldsCount).equal(2 + 6);
    expect(company1.inputtedFieldsCount).equal((2 + 6) * 2);
    expect(company1.fieldsTotal).equal((2 + 6) * 2);
    expect(company1.inputProgress).equal(1);
    expect(company1.adminCheckedCount).equal(0);
    expect(company1.adminCheckedProgress).equal(0);

    // check the form
    const res5 = await request(app).get(`/${path}/${formId}`).set('Authorization', `Bearer ${userJwt}`);
    expect(res5.status).equal(200);
    expect(res5.body.data._id).equal(formId);
    expect(res5.body.data.status).equal(formStatus.checkAgain);
    expect(res5.body.data.adminCheckedCount).equal(0);
    expect(res5.body.data.adminCheckedProgress).equal(0);

    // check count 2 incomplete meter in the form list
    const res6 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${userJwt}`);
    expect(res6.body.data.length).equal(1);
    expect(res6.body.data[0].meters.length).equal(2);
    expect(res6.body.meta.meter.incomplete).equal(2);;
  })

  it('should update the form status to "completed" by Client Admin', async () => {
    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${clientAdminJwT}`);
    expect(res1.status).equal(200);
    expect(res1.body.data).to.be.an('array');

    const formId = res1.body.data[0]._id;

    // approve meter
    const getMeterRes1 = await request(app).get(`/meter`).set('Authorization', `Bearer ${clientAdminJwT}`);
    expect(getMeterRes1.status).equal(200);

    const correctInputs = [
      [{ answer: 'ans 3' }, { answer: 'ans 4' }],
      {
        answer: [
          [123, 100.23, 'Tom'], [234, 234.56, 'John']
        ],
        unit: ["L", "L", "N/A"],
      }
    ];
    for (let i = 0; i < getMeterRes1.body.data.length; i++) {
      const meter = getMeterRes1.body.data[i];
      const updateMeterRes1 = await request(app).put(`/meter/${meter._id}`)
        .set('Authorization', `Bearer ${clientAdminJwT}`)
        .send({
          inputs: correctInputs,
          submitted: false,
          approved: true,
        });
      expect(updateMeterRes1.status).equal(200);
      expect(updateMeterRes1.body.data).equal(true);

      // save the form
      const res2 = await request(app).put(`/${path}/${formId}`)
        .set('Authorization', `Bearer ${clientAdminJwT}`)
        .send({
          submitted: false,
        });
      expect(res2.status).equal(200);

      const res3 = await request(app).get(`/${path}/${formId}`).set('Authorization', `Bearer ${clientAdminJwT}`);
      expect(res3.status).equal(200);
      expect(res3.body.data._id).equal(formId);
      expect(res3.body.data.status).equal(formStatus.checkAgain);
      expect(res3.body.data.adminCheckedCount).equal(i + 1);
      expect(res3.body.data.adminCheckedProgress).equal(_.round((i + 1) / getMeterRes1.body.data.length, 2));
    }

    // submit the form
    const res4 = await request(app).put(`/${path}/${formId}`)
      .set('Authorization', `Bearer ${clientAdminJwT}`)
      .send({
        submitted: true,
        nextStatus: formStatus.completed,
      });
    expect(res4.status).equal(200);

    const res5 = await request(app).get(`/${path}/${formId}`).set('Authorization', `Bearer ${clientAdminJwT}`);
    expect(res5.status).equal(200);
    expect(res5.body.data._id).equal(formId);
    expect(res5.body.data.status).equal(formStatus.completed);

    // check count 0 incomplete meter in the form list
    const res6 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${userJwt}`);
    expect(res6.body.data.length).equal(1);
    expect(res6.body.data[0].meters.length).equal(2);
    expect(res6.body.meta.meter.incomplete).equal(0);
  })

  it('should get matrixInputResult for chart', async () => {
    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${clientAdminJwT}`);
    expect(res1.status).equal(200);
    expect(res1.body.data).to.be.an('array');

    const formId = res1.body.data[0]._id;
    const meterLength = res1.body.data[0].meters.length;

    const res2 = await request(app).get(`/${path}/${formId}/matrixInputResult`).set('Authorization', `Bearer ${clientAdminJwT}`);
    expect(res2.status).equal(200);

    const matrixInputResult = res2.body.data;
    expect(matrixInputResult).to.be.an('array');
    expect(matrixInputResult.length).equal(1);

    expect(matrixInputResult[0].materialId).to.be.an('string');
    expect(matrixInputResult[0].materialName).equal(sampleMatrixMaterial.name);
    expect(matrixInputResult[0].materialUniqueId).equal(sampleMatrixMaterial.uniqueId);

    // data
    expect(matrixInputResult[0].data).to.be.an('array');
    expect(matrixInputResult[0].data.length).equal(4);

    expect(matrixInputResult[0].data[0].row).equal(sampleMatrixMaterial.content[0].rows[0].name);
    expect(matrixInputResult[0].data[0].col).equal(sampleMatrixMaterial.content[0].columns[0].name);
    expect(matrixInputResult[0].data[0].value).equal(123 * meterLength);
    expect(matrixInputResult[0].data[0].unit).equal(sampleMatrixMaterial.content[0].columns[0].outputUnit);

    expect(matrixInputResult[0].data[1].row).equal(sampleMatrixMaterial.content[0].rows[0].name);
    expect(matrixInputResult[0].data[1].col).equal(sampleMatrixMaterial.content[0].columns[1].name);
    expect(matrixInputResult[0].data[1].value).equal(100.23 * 1000 * meterLength);
    expect(matrixInputResult[0].data[1].unit).equal(sampleMatrixMaterial.content[0].columns[1].outputUnit);

    expect(matrixInputResult[0].data[2].row).equal(sampleMatrixMaterial.content[0].rows[1].name);
    expect(matrixInputResult[0].data[2].col).equal(sampleMatrixMaterial.content[0].columns[0].name);
    expect(matrixInputResult[0].data[2].value).equal(234 * meterLength);
    expect(matrixInputResult[0].data[2].unit).equal(sampleMatrixMaterial.content[0].columns[0].outputUnit);

    expect(matrixInputResult[0].data[3].row).equal(sampleMatrixMaterial.content[0].rows[1].name);
    expect(matrixInputResult[0].data[3].col).equal(sampleMatrixMaterial.content[0].columns[1].name);
    expect(matrixInputResult[0].data[3].value).equal(234.56 * 1000 * meterLength);
    expect(matrixInputResult[0].data[3].unit).equal(sampleMatrixMaterial.content[0].columns[1].outputUnit);

    // groupByRow
    expect(matrixInputResult[0].groupByRow).to.be.an('array');
    expect(matrixInputResult[0].groupByRow.length).equal(2);

    expect(matrixInputResult[0].groupByRow[0].row).equal(sampleMatrixMaterial.content[0].rows[0].name);
    expect(matrixInputResult[0].groupByRow[0][sampleMatrixMaterial.content[0].columns[0].name].value).equal(123 * meterLength);
    expect(matrixInputResult[0].groupByRow[0][sampleMatrixMaterial.content[0].columns[0].name].unit).equal(sampleMatrixMaterial.content[0].columns[0].outputUnit);
    expect(matrixInputResult[0].groupByRow[0][sampleMatrixMaterial.content[0].columns[1].name].value).equal(100.23 * 1000 * meterLength);
    expect(matrixInputResult[0].groupByRow[0][sampleMatrixMaterial.content[0].columns[1].name].unit).equal(sampleMatrixMaterial.content[0].columns[1].outputUnit);

    expect(matrixInputResult[0].groupByRow[1].row).equal(sampleMatrixMaterial.content[0].rows[1].name);
    expect(matrixInputResult[0].groupByRow[1][sampleMatrixMaterial.content[0].columns[0].name].value).equal(234 * meterLength);
    expect(matrixInputResult[0].groupByRow[1][sampleMatrixMaterial.content[0].columns[0].name].unit).equal(sampleMatrixMaterial.content[0].columns[0].outputUnit);
    expect(matrixInputResult[0].groupByRow[1][sampleMatrixMaterial.content[0].columns[1].name].value).equal(234.56 * 1000 * meterLength);
    expect(matrixInputResult[0].groupByRow[1][sampleMatrixMaterial.content[0].columns[1].name].unit).equal(sampleMatrixMaterial.content[0].columns[1].outputUnit);

    // groupByCol
    expect(matrixInputResult[0].groupByCol).to.be.an('array');
    expect(matrixInputResult[0].groupByCol.length).equal(2);

    expect(matrixInputResult[0].groupByCol[0].col).equal(sampleMatrixMaterial.content[0].columns[0].name);
    expect(matrixInputResult[0].groupByCol[0][sampleMatrixMaterial.content[0].rows[0].name].value).equal(123 * meterLength);
    expect(matrixInputResult[0].groupByCol[0][sampleMatrixMaterial.content[0].rows[0].name].unit).equal(sampleMatrixMaterial.content[0].columns[0].outputUnit);
    expect(matrixInputResult[0].groupByCol[0][sampleMatrixMaterial.content[0].rows[1].name].value).equal(234 * meterLength);
    expect(matrixInputResult[0].groupByCol[0][sampleMatrixMaterial.content[0].rows[1].name].unit).equal(sampleMatrixMaterial.content[0].columns[0].outputUnit);

    expect(matrixInputResult[0].groupByCol[1].col).equal(sampleMatrixMaterial.content[0].columns[1].name);
    expect(matrixInputResult[0].groupByCol[1][sampleMatrixMaterial.content[0].rows[0].name].value).equal(100.23 * 1000 * meterLength);
    expect(matrixInputResult[0].groupByCol[1][sampleMatrixMaterial.content[0].rows[0].name].unit).equal(sampleMatrixMaterial.content[0].columns[1].outputUnit);
    expect(matrixInputResult[0].groupByCol[1][sampleMatrixMaterial.content[0].rows[1].name].value).equal(234.56 * 1000 * meterLength);
    expect(matrixInputResult[0].groupByCol[1][sampleMatrixMaterial.content[0].rows[1].name].unit).equal(sampleMatrixMaterial.content[0].columns[1].outputUnit);
  })

  it('should get 100% progress of company', async () => {
    const res1 = await request(app).get(`/company`)
      .set('Authorization', `Bearer ${superAdminJwt}`);
    const company = res1.body.data[0];

    expect(company.materialFieldsCount).equal(2 + 6);
    expect(company.inputtedFieldsCount).equal((2 + 6) * 2);
    expect(company.fieldsTotal).equal((2 + 6) * 2);
    expect(company.inputProgress).equal(1);
    expect(company.adminCheckedCount).equal(2);
    expect(company.adminCheckedProgress).equal(1);
  })

  it('should able to lock the form', async function () {
    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${superAdminJwt}`);
    expect(res1.status).equal(200);
    expect(res1.body.data).to.be.an('array');

    const formId = res1.body.data[0]._id;

    const res2 = await request(app).put(`/${path}/${formId}/lock`)
      .set('Authorization', `Bearer ${superAdminJwt}`)
      .send({ locked: true });
    expect(res2.status).equal(200);

    const res3 = await request(app).get(`/${path}/${formId}`)
      .set('Authorization', `Bearer ${superAdminJwt}`);
    expect(res3.status).equal(200);
    const form = res3.body.data;

    expect(form.editingUser).to.be.not.null;
    expect(form.locked).to.be.not.null;
  });

  it('should return error when other user locked the form', async () => {
    const res = await request(app)
      .post('/auth')
      .send({ email: sampleCompanies[0].admin.email, password: sampleCompanies[0].admin.password });
    const jwtToken = res.body.data;

    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${superAdminJwt}`);
    expect(res1.status).equal(200);
    expect(res1.body.data).to.be.an('array');

    const formId = res1.body.data[0]._id;

    const res2 = await request(app).put(`/${path}/${formId}/lock`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ locked: true });
    expect(res2.status).equal(500);
  })

  it('should able to unlock the form', async () => {
    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${superAdminJwt}`);
    expect(res1.status).equal(200);
    expect(res1.body.data).to.be.an('array');

    const formId = res1.body.data[0]._id;

    const res2 = await request(app).put(`/${path}/${formId}/lock`)
      .set('Authorization', `Bearer ${superAdminJwt}`)
      .send({ locked: false });
    expect(res2.status).equal(200);

    const res3 = await request(app).get(`/${path}/${formId}`)
      .set('Authorization', `Bearer ${superAdminJwt}`);
    expect(res3.status).equal(200);
    const form = res3.body.data;

    expect(form.editingUser).to.be.null;
    expect(form.locked).to.be.null;
  })

  it('should able to lock the form by other user', async function () {
    const res = await request(app)
      .post('/auth')
      .send({ email: sampleCompanies[0].admin.email, password: sampleCompanies[0].admin.password });
    const jwtToken = res.body.data;

    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${superAdminJwt}`);
    expect(res1.status).equal(200);
    expect(res1.body.data).to.be.an('array');

    const formId = res1.body.data[0]._id;

    const res2 = await request(app).put(`/${path}/${formId}/lock`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ locked: true });
    expect(res2.status).equal(200);

    const res3 = await request(app).put(`/${path}/${formId}/lock`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ locked: false });
    expect(res3.status).equal(200);
  })

  it('should not allow to edit because of Financial Year Report Date passed', async () => {
    // create company
    const res = await request(app).post(`/company`)
      .set('Authorization', `Bearer ${superAdminJwt}`)
      .send(sampleCompanies[1]);
    const companyId = res.body.data;

    const res1 = await request(app)
      .post('/auth')
      .send({ email: sampleCompanies[1].admin.email, password: sampleCompanies[1].admin.password });
    const clientAdmin2JwT = res1.body.data;

    MockDate.set('2022-01-01');

    // create form
    const res2 = await request(app).post(`/form`)
      .set('Authorization', `Bearer ${superAdminJwt}`)
      .send({
        ...sampleFormPostDto,
        company: companyId,
        financialYear: '2022-03-31',
      });
    expect(res2.status).equal(200);

    MockDate.reset();

    const formId2 = res2.body.data;

    const res3 = await request(app).put(`/${path}/${formId2}`)
      .set('Authorization', `Bearer ${clientAdmin2JwT}`)
      .send({
        submitted: false,
      });
    expect(res3.status).equal(500);
    expect(res3.body.message).equal("The Financial Year Report Date is passed. You're not allowed to edit");

    // super admin can update
    // const res4 = await request(app).put(`/${path}/${formId2}`)
    //   .set('Authorization', `Bearer ${superAdminJwt}`)
    //   .send({
    //     submitted: false,
    //   });
    // expect(res4.status).equal(200);
  })

  it('should get notifications (filled record) of form', async () => {
    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${superAdminJwt}`);
    expect(res1.status).equal(200);
    expect(res1.body.data).to.be.an('array');

    const formId = res1.body.data[0]._id;

    // set company's logo
    const putCompanyRes = await request(app)
      .put(`/company/${res1.body.data[0].company._id}`)
      .set('Authorization', `Bearer ${superAdminJwt}`)
      .attach('logo', nodePath.join(__dirname, '../../upload/test', 'test-logo-1.jpg'));
    expect(putCompanyRes.status).equal(200);

    const res2 = await request(app).get(`/${path}/${formId}/notification`).set('Authorization', `Bearer ${superAdminJwt}`);
    expect(res2.status).equal(200);
    expect(res2.body.data).to.be.an('array');

    for (const notification of res2.body.data) {
      expect(notification.receiver).to.be.an('string')
      expect(notification.receiverType).equal(ReceiverType.form);

      expect(notification.createdBy._id).to.be.an('string');
      expect(notification.createdBy.email).to.be.an('string');
      expect(notification.createdBy.company._id).to.be.an('string');
      expect(notification.createdBy.company.logo.url).to.be.an('string');
    }
  })

  it('should get matrix materials by company & financial year', async () => {
    const res1 = await request(app).get(`/company`)
      .set('Authorization', `Bearer ${superAdminJwt}`);
    const company = res1.body.data[0];

    const res2 = await request(app).get(`/company/${company._id}/financialYear/${company.yearEnd}/material`)
      .set('Authorization', `Bearer ${superAdminJwt}`);

    expect(res2.status).equal(200);
    expect(res2.body.data).to.be.an('array');
    expect(res2.body.data[0].uniqueId).equal(sampleMatrixMaterial.uniqueId)
    expect(res2.body.data[0].type).equal(qnaType.matrix);
  })

  it('should create form with other form template', async () => {
    // get material
    const getMaterialsRes = await request(app).get(`/material`)
      .set('Authorization', `Bearer ${superAdminJwt}`);    
    
    // create form template
    const formTemplateDto: FormTemplatePostDto = {
      name: 'Test Form',
      uniqueId: 'test-form',
      materials: [getMaterialsRes.body.data[0]._id], 
    }

    const postFormTemplateRes = await request(app).post(`/form-template`)
      .set('Authorization', `Bearer ${superAdminJwt}`)
      .send(formTemplateDto);

    // create form
    const formPostDto: FormPostDto = {
      formTemplate: postFormTemplateRes.body.data,
      company: sampleFormPostDto.company,
      financialYear: sampleFormPostDto.financialYear,
      assignees: null
    }

    const res1 = await request(app).post(`/${path}`)
      .set('Authorization', `Bearer ${superAdminJwt}`)
      .send(formPostDto);
    expect(res1.status).equal(200);
  })

  it('should get the form list sort by updatedAt asc', async () => {
    const res1 = await request(app).get(`/${path}?sort[updatedAt]=1`).set('Authorization', `Bearer ${superAdminJwt}`);
    expect(res1.status).equal(200);
    expect(res1.body.data).to.be.an('array');
    expect(res1.body.data.length).equal(3);

    let compareDate = dayjs(res1.body.data[0].updatedAt);

    for (let i = 1; i < res1.body.data.length; i++) {
      expect(compareDate.isBefore(dayjs(res1.body.data[i].updatedAt))).equal(true);
      compareDate = dayjs(res1.body.data[i].updatedAt);
    }
  })

  it('should get the form list sort by updatedAt desc', async () => {
    const res1 = await request(app).get(`/${path}?sort[updatedAt]=-1`).set('Authorization', `Bearer ${superAdminJwt}`);
    expect(res1.status).equal(200);
    expect(res1.body.data).to.be.an('array');
    expect(res1.body.data.length).equal(3);

    let compareDate = dayjs(res1.body.data[0].updatedAt);

    for (let i = 1; i < res1.body.data.length; i++) {
      expect(compareDate.isAfter(dayjs(res1.body.data[i].updatedAt))).equal(true);
      compareDate = dayjs(res1.body.data[i].updatedAt);
    }
  })

  it('should get the form list sort by inputProgress asc', async () => {
    const res1 = await request(app).get(`/${path}?sort[inputProgress]=1`).set('Authorization', `Bearer ${superAdminJwt}`);
    expect(res1.status).equal(200);
    expect(res1.body.data).to.be.an('array');
    expect(res1.body.data.length).equal(3);

    let compareInputProgress = res1.body.data[0].inputProgress;

    for (let i = 1; i < res1.body.data.length; i++) {
      expect(res1.body.data[i].inputProgress).greaterThanOrEqual(compareInputProgress);
      compareInputProgress = res1.body.data[i].inputProgress;
    }
  })

  it('should get the form list sort by inputProgress desc', async () => {
    const res1 = await request(app).get(`/${path}?sort[inputProgress]=-1`).set('Authorization', `Bearer ${superAdminJwt}`);
    expect(res1.status).equal(200);
    expect(res1.body.data).to.be.an('array');
    expect(res1.body.data.length).equal(3);

    let compareInputProgress = res1.body.data[0].inputProgress;

    for (let i = 1; i < res1.body.data.length; i++) {
      expect(res1.body.data[i].inputProgress).lessThanOrEqual(compareInputProgress);
      compareInputProgress = res1.body.data[i].inputProgress;
    }
  })

  it('should get the form list sort by adminCheckedProgress asc', async () => {
    const res1 = await request(app).get(`/${path}?sort[adminCheckedProgress]=1`).set('Authorization', `Bearer ${superAdminJwt}`);
    expect(res1.status).equal(200);
    expect(res1.body.data).to.be.an('array');
    expect(res1.body.data.length).equal(3);

    let compareAdminCheckedProgress = res1.body.data[0].adminCheckedProgress;

    for (let i = 1; i < res1.body.data.length; i++) {
      expect(res1.body.data[i].adminCheckedProgress).greaterThanOrEqual(compareAdminCheckedProgress);
      compareAdminCheckedProgress = res1.body.data[i].adminCheckedProgress;
    }
  })

  it('should get the form list sort by adminCheckedProgress desc', async () => {
    const res1 = await request(app).get(`/${path}?sort[adminCheckedProgress]=-1`).set('Authorization', `Bearer ${superAdminJwt}`);
    expect(res1.status).equal(200);
    expect(res1.body.data).to.be.an('array');
    expect(res1.body.data.length).equal(3);

    let compareAdminCheckedProgress = res1.body.data[0].adminCheckedProgress;

    for (let i = 1; i < res1.body.data.length; i++) {
      expect(res1.body.data[i].adminCheckedProgress).lessThanOrEqual(compareAdminCheckedProgress);
      compareAdminCheckedProgress = res1.body.data[i].adminCheckedProgress;
    }
  })

  it('should should reset form status by Client Admin or User', async () => {
    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${clientAdminJwT}`);
    expect(res1.status).equal(200);
    expect(res1.body.data).to.be.an('array');

    const formId = res1.body.data[0]._id;
    
    const res2 = await request(app).put(`/${path}/${formId}/resetStatus`)
      .set('Authorization', `Bearer ${clientAdminJwT}`).send();
    expect(res2.status).equal(403);
    
    const res3 = await request(app).put(`/${path}/${formId}/resetStatus`)
      .set('Authorization', `Bearer ${userJwt}`).send();
    expect(res3.status).equal(403);
  })

  it('should reset form status to "in-progress" by Super Admin', async () => {
    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${superAdminJwt}`);
    expect(res1.status).equal(200);
    expect(res1.body.data).to.be.an('array');
    expect(res1.body.data[0].status).equal('completed')

    const formId = res1.body.data[0]._id;
    
    const res2 = await request(app).put(`/${path}/${formId}/resetStatus`)
      .set('Authorization', `Bearer ${superAdminJwt}`).send();
    expect(res2.status).equal(200);

    const res3 = await request(app).get(`/${path}/${formId}`).set('Authorization', `Bearer ${superAdminJwt}`);
    expect(res3.status).equal(200);
    expect(res3.body.data.status).equal('in-progress');
  })

  it('should able to delete a form', async () => {
    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${superAdminJwt}`);
    expect(res1.status).equal(200);
    expect(res1.body.data).to.be.an('array');

    const formId = res1.body.data[0]._id;

    const res2 = await request(app).delete(`/${path}/${formId}`)
      .set('Authorization', `Bearer ${superAdminJwt}`)
    expect(res2.body.data).is.true;

    const res3 = await request(app).get(`/${path}/${formId}`)
      .set('Authorization', `Bearer ${superAdminJwt}`);
    expect(res3.status).equal(500);
  })

  it('should not delete a expired form', async () => {
    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${superAdminJwt}`);
    expect(res1.status).equal(200);
    
    const formId = res1.body.data[0]._id;

    const res2 = await request(app).delete(`/${path}/${formId}`)
      .set('Authorization', `Bearer ${superAdminJwt}`)
    expect(res2.status).equal(500);
    expect(res2.body.message).equal("Today is outside reporting period. You can't create the form");
  })

  it('should have 2 add form log', async () => {
      const result = await mongoose.model('user_activity_logs').find({
          resource: 'form',
          action: 'add'
      }).exec()
      expect(result.length).equal(3);
  })

  it('should have 15 edit form log', async () => {
      const result = await mongoose.model('user_activity_logs').find({
          resource: 'form',
          action: 'edit'
      }).exec()
      expect(result.length).equal(15);
  })

  it('should have 1 delete form log', async () => {
      const result = await mongoose.model('user_activity_logs').find({
          resource: 'form',
          action: 'delete'
      }).exec()
      expect(result.length).equal(1);
  })

  it('should have 2 assign form log', async () => {
    const result = await mongoose.model('user_activity_logs').find({
      resource: 'form',
      action: 'assign'
    }).exec()
    expect(result.length).equal(2);
  })

  it('should have 4 submit form log', async () => {
    const result = await mongoose.model('user_activity_logs').find({
      resource: 'form',
      action: 'submit'
    }).exec()
    expect(result.length).equal(4);
  })

  it('should have 1 complete form log', async () => {
    const result = await mongoose.model('user_activity_logs').find({
      resource: 'form',
      action: 'complete'
    }).exec()
    expect(result.length).equal(1);
  })

  after(async () => {
    await shutdown();
  });
})