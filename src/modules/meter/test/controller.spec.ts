require('dotenv').config();

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import request from "supertest";
import nodePath from 'path';
import jwt from 'jsonwebtoken';
import MockDate from 'mockdate';
import mongoose from 'mongoose';

import server, { shutdown } from '../../../app';

import { FormPostDto } from '../../form/interfaces/dto';
import { generateFormPostDto, getComingFinancialYearEndDate } from '../../form/test/sample';
import { sampleCompanies } from "../../company/test/sample";
import { sampleMaterials } from "../../material/test/sample";
import { sampleFormTemplates } from "../../form-template/test/sample";
import { MeterPostDto } from '../interfaces/dto';
import { userSample } from '../../auth/test/sample'
import Meter from '../interfaces/entitles';
import { requiredNotificationTemplateDtoArr } from '../../notification-template/test/sample';

chai.use(chaiAsPromised);
chai.should();
const expect = chai.expect;

let app: any;
let superAdminJwt: string;
let clientAdminJwT: string;
let userJwt: string;

let formId;

const path = 'meter';

describe('meter controller', () => {
  let sampleFormPostDto: FormPostDto;

  const meterPostDto: MeterPostDto = {
    form: '', // will update to form ID
    name: 'Meter 1',
    assignees: null
  }

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

    // create required notification template
    for (const dto of requiredNotificationTemplateDtoArr) {
      const postNotificationTemplateRes = await request(app).post(`/notification-template`)
        .set('Authorization', `Bearer ${superAdminJwt}`)
        .send(dto);
      expect(postNotificationTemplateRes.status).equal(200);
    }
  })

  it('should create meter successfully and get the meter', async () => {
    // create form
    const res1 = await request(app).post(`/form`)
      .set('Authorization', `Bearer ${superAdminJwt}`)
      .send(sampleFormPostDto);
    expect(res1.status).equal(200);

    formId = res1.body.data;
    meterPostDto.form = formId;

    // create meter
    const res2 = await request(app).post(`/${path}`)
      .set('Authorization', `Bearer ${superAdminJwt}`)
      .send(meterPostDto);
    expect(res2.status).equal(200);

    // create meter 2
    const decoded: any = jwt.decode(userJwt);
    const res3 = await request(app).post(`/${path}`)
      .set('Authorization', `Bearer ${superAdminJwt}`)
      .send({
        ...meterPostDto,
        name: 'Meter 2',
        assignees: [decoded._id]
      });
    expect(res3.status).equal(200);

    const res4 = await request(app).get(`/${path}/${res2.body.data}`)
      .set('Authorization', `Bearer ${superAdminJwt}`);
    expect(res4.status).equal(200);
    const meter = res4.body.data;

    expect(meter._id).to.be.a('string');
    expect(meter.form._id).equal(meterPostDto.form);
    expect(meter.company).equal(meter.form.company);
    expect(meter.financialYear).equal(meter.form.financialYear);
    expect(meter.name).equal(meterPostDto.name);
    expect(meter.assignees).equal(meterPostDto.assignees);
    expect(meter.inputs).to.be.instanceof(Array);
    expect(meter.inputs.length).equal(0);
    expect(meter.approved).to.be.null;
    expect(meter.errorReason).equal('');
    expect(meter.finished).to.be.false;
    expect(meter.checked).to.be.false;
    expect(meter.attachments).to.be.instanceof(Array);
    expect(meter.attachments.length).equal(0);

    const res5 = await request(app).get(`/${path}/${res3.body.data}`)
      .set('Authorization', `Bearer ${superAdminJwt}`);
    expect(res5.status).equal(200);
    const meter2 = res5.body.data;

    expect(meter2._id).to.be.a('string');
    expect(meter2.form._id).equal(meterPostDto.form);
    expect(meter2.company).equal(meter2.form.company);
    expect(meter2.financialYear).equal(meter2.form.financialYear);
    expect(meter2.name).equal('Meter 2');
    expect(meter2.assignees.length).equal(1);
    expect(meter2.assignees[0]._id).include(decoded._id);
    expect(meter2.inputs).to.be.instanceof(Array);
    expect(meter2.inputs.length).equal(0);
    expect(meter2.approved).to.be.null;
    expect(meter2.errorReason).equal('');
    expect(meter2.finished).to.be.false;
    expect(meter2.checked).to.be.false;
    expect(meter2.attachments).to.be.instanceof(Array);
    expect(meter2.attachments.length).equal(0);

    const getFormRes = await request(app).get(`/form/${meterPostDto.form}`).set('Authorization', `Bearer ${superAdminJwt}`);
    expect(getFormRes.status).equal(200);
    expect(getFormRes.body.data.meters.length).equal(2);
    expect(getFormRes.body.data.meters[0]).equal(meter._id);
    expect(getFormRes.body.data.meters[1]).equal(meter2._id);
    expect(getFormRes.body.data.attachmentsCount).equal(0);
  })

  it('should not create meter by user', async () => {
    const res3 = await request(app).post(`/${path}`)
      .set('Authorization', `Bearer ${userJwt}`)
      .send({
        ...meterPostDto,
        name: 'Meter Error',
        assignees: null
      });
    console.log(res3.status);
    console.log(res3.body);
    
    expect(res3.status).equal(403);
  })

  it('should not create meter with same name', async () => {
    const res = await request(app).post(`/${path}`)
      .set('Authorization', `Bearer ${superAdminJwt}`)
      .send({
        ...meterPostDto,
        name: 'Meter 2',
      });
    expect(res.status).equal(500);
    expect(res.body.message).equal(`The meter name (Meter 2) is used`);
  })

  it('should get array of meter', async () => {
    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${superAdminJwt}`);
    expect(res1.status).equal(200);
    expect(res1.body.data).to.be.an('array');
    expect(res1.body.data.length).equal(2);
    expect(res1.body.meta.count).equal(res1.body.data.length);
    expect(res1.body.meta.incomplete).equal(2);
    expect(res1.body.meta.page).equal(1);

    for (const meter of res1.body.data) {
      expect(meter._id).to.be.a('string');
    }
  })

  it('should not update duplicate meter name', async () => {
    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${userJwt}`);
    expect(res1.status).equal(200);
    const meterId = res1.body.data[0]._id;

    const res2 = await request(app).put(`/${path}/${meterId}`)
      .set('Authorization', `Bearer ${userJwt}`)
      .send({
        name: 'Meter 2',
        inputs: [],
        submitted: false
      });
    expect(res2.status).equal(500);
    expect(res2.body.message).equal(`The meter name (Meter 2) is used`);
  })

  it('should update meter by User', async () => {
    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${userJwt}`);
    expect(res1.status).equal(200);
    const meterId = res1.body.data[0]._id;

    const res2 = await request(app).put(`/${path}/${meterId}`)
      .set('Authorization', `Bearer ${userJwt}`)
      .send({
        name: 'Meter 1 - user',
        inputs: [],
        submitted: false
      });
    expect(res2.status).equal(200);
    expect(res2.body.data).equal(true);

    const getMeterRes1 = await request(app).get(`/${path}/${meterId}`)
      .set('Authorization', `Bearer ${userJwt}`);
    expect(getMeterRes1.status).equal(200);
    expect(getMeterRes1.body.data._id).equal(meterId);
    expect(getMeterRes1.body.data.name).equal('Meter 1 - user');
    expect(getMeterRes1.body.data.inputs).to.be.instanceof(Array);
    expect(getMeterRes1.body.data.inputs.length).equal(0);
    expect(getMeterRes1.body.data.finished).equal(false);
    expect(getMeterRes1.body.data.checked).equal(false);

    const correctInputs = [
      [{ answer: 'ans 1' }, { answer: 'ans2' }],
      {
        answer: [
          [123, 100.23, 'Name 1'], [234, 234.56, 'Name 2']
        ],
        unit: ["L", "L", "N/A"],
      }
    ];

    // save inputs
    const res3 = await request(app).put(`/${path}/${meterId}`)
      .set('Authorization', `Bearer ${userJwt}`)
      .send({
        inputs: [
          correctInputs[0],
          {
            answer: [
              ['', '', 'Name 1'], ['', '', 'Name 2']
            ],
            unit: ["L", "L", "N/A"],
          }
        ],
        submitted: false,
      });
    expect(res3.status).equal(200);
    expect(res3.body.data).equal(true);

    const getMeterRes2 = await request(app).get(`/${path}/${meterId}`)
      .set('Authorization', `Bearer ${userJwt}`);
    expect(getMeterRes2.status).equal(200);
    expect(getMeterRes2.body.data._id).equal(meterId);
    expect(getMeterRes2.body.data.inputs).to.be.instanceof(Array);
    expect(getMeterRes2.body.data.inputs.length).equal(2);
    expect(getMeterRes2.body.data.finished).equal(false);
    expect(getMeterRes2.body.data.checked).equal(false);
    expect(getMeterRes2.body.data.inputs[0]).deep.equal(correctInputs[0]);
    expect(getMeterRes2.body.data.inputs[1]).deep.equal({
      answer: [
        ['', '', 'Name 1'], ['', '', 'Name 2']
      ],
      unit: ["L", "L", "N/A"],
    });

    // submit inputs
    const res4 = await request(app).put(`/${path}/${meterId}`)
      .set('Authorization', `Bearer ${userJwt}`)
      .send({
        inputs: correctInputs,
        submitted: false,
      });
    expect(res4.status).equal(200);
    expect(res4.body.data).equal(true);

    // Fake this meter is submitted on form level
    await Meter.updateOne({ _id: meterId }, { finished: true });

    const getMeterRes3 = await request(app).get(`/${path}/${meterId}`)
      .set('Authorization', `Bearer ${userJwt}`);
    expect(getMeterRes3.status).equal(200);
    expect(getMeterRes3.body.data._id).equal(meterId);
    expect(getMeterRes3.body.data.inputs).to.be.instanceof(Array);
    expect(getMeterRes3.body.data.inputs.length).equal(2);
    expect(getMeterRes3.body.data.finished).equal(true);
    expect(getMeterRes3.body.data.checked).equal(false);
    expect(getMeterRes3.body.data.inputs).deep.equal(correctInputs);

    // not allow to update after submitted
    const res5 = await request(app).put(`/${path}/${meterId}`)
      .set('Authorization', `Bearer ${userJwt}`)
      .send({
        submitted: false,
      });
    expect(res5.status).equal(500);
    expect(res5.body.message).equal('This meter is submitted. You are not allowed to update this meter.');
  })

  it('should update meter and not approve by Client Admin', async () => {
    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${clientAdminJwT}`);
    expect(res1.status).equal(200);
    expect(res1.body.meta.incomplete).equal(1);

    const meterId = res1.body.data[0]._id;

    // need approved: true/false
    const res4 = await request(app).put(`/${path}/${meterId}`)
      .set('Authorization', `Bearer ${clientAdminJwT}`)
      .send({
        submitted: true,
      });
    expect(res4.status).equal(500);
    expect(res4.body.message).equal('Meter level sumbit is depracated, please use form level submission');

    const correctInputs = [
      [{ answer: 'ans 3' }, { answer: 'ans 4' }],
      {
        answer: [
          [123, 100.23, 'Tom'], [234, 234.56, 'John']
        ],
        unit: ["L", "L", "N/A"],
      }
    ];

    const res5 = await request(app).put(`/${path}/${meterId}`)
      .set('Authorization', `Bearer ${clientAdminJwT}`)
      .send({
        inputs: correctInputs,
        submitted: false,
      });
    expect(res5.status).equal(200);
    expect(res5.body.data).equal(true);

    const getMeterRes1 = await request(app).get(`/${path}/${meterId}`)
      .set('Authorization', `Bearer ${clientAdminJwT}`);
    expect(getMeterRes1.status).equal(200);
    expect(getMeterRes1.body.data._id).equal(meterId);
    expect(getMeterRes1.body.data.finished).equal(true);
    expect(getMeterRes1.body.data.checked).equal(false);
    expect(getMeterRes1.body.data.inputs).deep.equal(correctInputs);
    expect(getMeterRes1.body.data.approved).equal(null);
    expect(getMeterRes1.body.data.errorReason).equal('');

    const res6 = await request(app).put(`/${path}/${meterId}`)
      .set('Authorization', `Bearer ${clientAdminJwT}`)
      .send({
        inputs: correctInputs,
        submitted: false,
        approved: false,
      });
    expect(res6.status).equal(500);
    expect(res6.body.message).equal('Please provide an error reason');

    const decoded: any = jwt.decode(userJwt);

    const res7 = await request(app).put(`/${path}/${meterId}`)
      .set('Authorization', `Bearer ${clientAdminJwT}`)
      .send({
        inputs: correctInputs,
        assignees: [decoded._id],
        submitted: false,
        approved: false,
        errorReason: 'Please upload attachments'
      });
    expect(res7.status).equal(200);
    expect(res7.body.data).equal(true);

    const getMeterRes2 = await request(app).get(`/${path}/${meterId}`)
      .set('Authorization', `Bearer ${clientAdminJwT}`);
    expect(getMeterRes2.status).equal(200);
    expect(getMeterRes2.body.data._id).equal(meterId);
    expect(getMeterRes2.body.data.finished).equal(false);
    // expect(getMeterRes2.body.data.checked).equal(true); // We dont rely on checked field
    expect(getMeterRes2.body.data.inputs).deep.equal(correctInputs);
    expect(getMeterRes2.body.data.approved).equal(false);
    expect(getMeterRes2.body.data.errorReason).equal('Please upload attachments');
    expect(getMeterRes2.body.data.assignees[0]._id).equal(decoded._id);
  })

  it('should add attachments', async () => {
    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${userJwt}`);
    expect(res1.status).equal(200);
    const meterId = res1.body.data[0]._id;

    const res2 = await request(app).put(`/${path}/${meterId}/attachments`)
      .set('Authorization', `Bearer ${userJwt}`)
      .attach('attachments', nodePath.join(__dirname, '../../upload/test', 'test-logo-1.jpg'))
      .attach('attachments', nodePath.join(__dirname, '../../upload/test', 'test-logo-2.jpg'))
      .field('descriptions[]', 'attachments descriptions 1')
      .field('descriptions[]', 'attachments descriptions 2');
    expect(res2.status).equal(200);
    expect(res2.body.data).equal(true);

    const getMeterRes1 = await request(app).get(`/${path}/${meterId}`)
      .set('Authorization', `Bearer ${userJwt}`);
    expect(getMeterRes1.status).equal(200);
    expect(getMeterRes1.body.data._id).equal(meterId);
    expect(getMeterRes1.body.data.attachments).to.be.instanceof(Array);
    expect(getMeterRes1.body.data.attachments.length).equal(2);

    for (let i = 0; i < getMeterRes1.body.data.attachments.length; i++) {
      const attachment = getMeterRes1.body.data.attachments[i];
      expect(attachment._id).to.be.a('string');
      expect(attachment.file._id).to.be.a('string');
      expect(attachment.file.url).to.be.a('string');
      expect(attachment.description).equal(`attachments descriptions ${i + 1}`);
    }
  })

  it('should count 2 attachments in form level', async () => {
    // save the form
    const res2 = await request(app).put(`/form/${meterPostDto.form}`)
      .set('Authorization', `Bearer ${superAdminJwt}`)
      .send({
        submitted: false,
        assignees: null
      });
    
    const getFormRes = await request(app).get(`/form/${meterPostDto.form}`).set('Authorization', `Bearer ${superAdminJwt}`);
    expect(getFormRes.status).equal(200);
    expect(getFormRes.body.data.attachmentsCount).equal(2);
  })

  it('should not allow to upload same file twice', async () => {
    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${userJwt}`);
    expect(res1.status).equal(200);    
    const meterId = res1.body.data[0]._id;

    const res2 = await request(app).put(`/${path}/${meterId}/attachments`)
      .set('Authorization', `Bearer ${userJwt}`)
      .attach('attachments', nodePath.join(__dirname, '../../upload/test', 'test-logo-1.jpg'))
      .field('descriptions[]', 'new attachments descriptions 1')
    expect(res2.status).equal(500);
    expect(res2.body.message).equal("test-logo-1.jpg has been uploaded. You can't upload twice.");
  })

  it('should update meter again by User', async () => {
    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${userJwt}`);
    expect(res1.status).equal(200);
    const meterId = res1.body.data[0]._id;

    // remove an attachment
    const getMeterRes1 = await request(app).get(`/${path}/${meterId}`)
      .set('Authorization', `Bearer ${userJwt}`);
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

    const removeAttachment = getMeterRes1.body.data.attachments[0];
    const res2 = await request(app).put(`/${path}/${meterId}`)
      .set('Authorization', `Bearer ${userJwt}`)
      .send({
        inputs: correctInputs,
        submitted: false,
        removeAttachments: [removeAttachment._id],
      });
    expect(res2.status).equal(200);
    expect(res2.body.data).equal(true);

    const getMeterRes2 = await request(app).get(`/${path}/${meterId}`)
      .set('Authorization', `Bearer ${userJwt}`);
    expect(getMeterRes2.status).equal(200);
    expect(getMeterRes2.body.data.finished).equal(false);
    expect(getMeterRes2.body.data.checked).equal(false);
    expect(getMeterRes2.body.data.approved).equal(false);
    expect(getMeterRes2.body.data.attachments).to.be.instanceof(Array);
    expect(getMeterRes2.body.data.attachments.length).equal(1);
  })

  it('should update the description of meter attachment', async () => {
    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${userJwt}`);
    expect(res1.status).equal(200);
    const meter = res1.body.data[0]

    const res2 = await request(app).put(`/${path}/${meter._id}/attachments/${meter.attachments[0]._id}`)
      .set('Authorization', `Bearer ${userJwt}`)
      .send({
        description: 'updated description',
      })
    expect(res2.status).equal(200);

    const res3 = await request(app).get(`/${path}/${meter._id}`).set('Authorization', `Bearer ${userJwt}`);
    expect(res3.status).equal(200);
    expect(res3.body.data.attachments[0].description).equal('updated description');
  })

  it('should update meter and approve by Client Admin', async () => {
    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${clientAdminJwT}`);
    expect(res1.status).equal(200);
    const meterId = res1.body.data[0]._id;

    const correctInputs = [
      [{ answer: 'ans 3' }, { answer: 'ans 4' }],
      {
        answer: [
          [123, 100.23, 'Tom'], [234, 234.56, 'John']
        ],
        unit: ["L", "L", "N/A"],
      }
    ];

    const res2 = await request(app).put(`/${path}/${meterId}`)
      .set('Authorization', `Bearer ${clientAdminJwT}`)
      .send({
        inputs: correctInputs,
        submitted: false,
        approved: true,
      });
    expect(res2.status).equal(200);
    expect(res2.body.data).equal(true);

    const getMeterRes1 = await request(app).get(`/${path}/${meterId}`)
      .set('Authorization', `Bearer ${clientAdminJwT}`);
    expect(getMeterRes1.status).equal(200);
    expect(getMeterRes1.body.data.finished).equal(true);
    // expect(getMeterRes1.body.data.checked).equal(false); // We don't rely on checked
    expect(getMeterRes1.body.data.approved).equal(true);
  })

  it('should update meter and approve by Client Admin', async () => {
    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${clientAdminJwT}`);
    expect(res1.status).equal(200);
    const meterId = res1.body.data[0]._id;

    const correctInputs = [
      [{ answer: 'ans 3' }, { answer: 'ans 4' }],
      {
        answer: [
          [123, 100.23, 'Tom'], [234, 234.56, 'John']
        ],
        unit: ["L", "L", "N/A"],
      }
    ];

    // not approve
    const res2 = await request(app).put(`/${path}/${meterId}`)
      .set('Authorization', `Bearer ${clientAdminJwT}`)
      .send({
        inputs: correctInputs,
        submitted: false,
        approved: false,
        errorReason: 'test error reason',
      });
    expect(res2.status).equal(200);
    expect(res2.body.data).equal(true);

    const getMeterRes1 = await request(app).get(`/${path}/${meterId}`)
      .set('Authorization', `Bearer ${clientAdminJwT}`);
    expect(getMeterRes1.status).equal(200);
    expect(getMeterRes1.body.data.finished).equal(false);
    // expect(getMeterRes1.body.data.checked).equal(false); // We don't rely on checked
    expect(getMeterRes1.body.data.approved).equal(false);
    expect(getMeterRes1.body.data.errorReason).equal('test error reason');

    // approve
    const res3 = await request(app).put(`/${path}/${meterId}`)
      .set('Authorization', `Bearer ${clientAdminJwT}`)
      .send({
        inputs: correctInputs,
        submitted: false,
        approved: true,
      });
    expect(res3.status).equal(200);
    expect(res3.body.data).equal(true);

    const getMeterRes2 = await request(app).get(`/${path}/${meterId}`)
      .set('Authorization', `Bearer ${clientAdminJwT}`);
    expect(getMeterRes2.status).equal(200);
    expect(getMeterRes2.body.data.finished).equal(true);
    // expect(getMeterRes1.body.data.checked).equal(false); // We don't rely on checked
    expect(getMeterRes2.body.data.approved).equal(true);
  })

  it('should not allow to create / edit because of Financial Year Report Date passed', async () => {
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

    const formId2 = res2.body.data;

    // create meter
    const res3 = await request(app).post(`/${path}`)
      .set('Authorization', `Bearer ${clientAdmin2JwT}`)
      .send({
        ...meterPostDto,
        form: formId2,
      });

    expect(res3.status).equal(200);
    const meterId = res3.body.data;

    MockDate.reset();

    // create meter
    const postExpiredMeterRes = await request(app).post(`/${path}`)
      .set('Authorization', `Bearer ${clientAdmin2JwT}`)
      .send({
        ...meterPostDto,
        form: formId2,
      });
    
    expect(postExpiredMeterRes.status).equal(500);
    expect(postExpiredMeterRes.body.message).equal("Today is outside reporting period. You can't create a meter");


    const res4 = await request(app).put(`/${path}/${meterId}`)
      .set('Authorization', `Bearer ${clientAdmin2JwT}`)
      .send({
        name: 'Meter 1A',
        submitted: false,
      });
    expect(res4.status).equal(500);
    expect(res4.body.message).equal("The Financial Year Report Date is passed. You're not allowed to edit");

    // super admin can update
    // const res5 = await request(app).put(`/${path}/${meterId}`)
    //   .set('Authorization', `Bearer ${superAdminJwt}`)
    //   .send({
    //     name: 'Meter 1A - user',
    //     submitted: false,
    //   });
    // expect(res5.status).equal(200);
  })

  it('should count incomplete meter', async () => {
    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${userJwt}`);
    expect(res1.status).equal(200);
    expect(res1.body.meta.incomplete).equal(1);
  })

  it('should not delete meter by User', async () => {
    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${userJwt}`);
    expect(res1.status).equal(200);
    const meterId = res1.body.data[1]._id;

    const res2 = await request(app).delete(`/${path}/${meterId}`)
      .set('Authorization', `Bearer ${userJwt}`);
    expect(res2.status).equal(403);
  })

  it('should not delete a expired meter', async () => {
    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${superAdminJwt}`);
    expect(res1.status).equal(200);
    const meterId = res1.body.data[2]._id;

    const res2 = await request(app).delete(`/${path}/${meterId}`)
      .set('Authorization', `Bearer ${superAdminJwt}`);
    expect(res2.status).equal(500);
    expect(res2.body.message).equal("Today is outside reporting period. You can't update the meter");
  })

  it('should delete meter', async () => {
    const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${clientAdminJwT}`);
    expect(res1.status).equal(200);
    const meterId = res1.body.data[1]._id;

    const res2 = await request(app).delete(`/${path}/${meterId}`)
      .set('Authorization', `Bearer ${clientAdminJwT}`);    
    expect(res2.status).equal(200);
    expect(res2.body.data).equal(true);

    const getMeterRes1 = await request(app).get(`/${path}/${meterId}`)
      .set('Authorization', `Bearer ${clientAdminJwT}`);
    expect(getMeterRes1.status).equal(500);

    const getFormRes = await request(app).get(`/form/${res1.body.data[1].form}`).set('Authorization', `Bearer ${superAdminJwt}`);
    expect(getFormRes.status).equal(200);
    expect(getFormRes.body.data.meters.length).equal(1);
    expect(getFormRes.body.data.meters).not.include(meterId);
    expect(getFormRes.body.data.materialFieldsCount).equal(8);
    expect(getFormRes.body.data.inputtedFieldsCount).equal(8);
    expect(getFormRes.body.data.fieldsTotal).equal(8);
    expect(getFormRes.body.data.inputProgress).equal(1);
    expect(getFormRes.body.data.adminCheckedCount).equal(1);
    expect(getFormRes.body.data.adminCheckedProgress).equal(1);
    expect(getFormRes.body.data.attachmentsCount).equal(2);
  })

  it('should have 2 add meter log', async () => {
      const result = await mongoose.model('user_activity_logs').find({
          resource: 'meter',
          action: 'add'
      }).exec()
      expect(result.length).equal(3);
  })

  it('should have 9 edit meter log', async () => {
      const result = await mongoose.model('user_activity_logs').find({
          resource: 'meter',
          action: 'edit'
      }).exec()
      expect(result.length).equal(9);
  })

  it('should have 1 delete meter log', async () => {
      const result = await mongoose.model('user_activity_logs').find({
          resource: 'meter',
          action: 'delete'
      }).exec()
      expect(result.length).equal(1);
  })

  after(async () => {
    await shutdown();
  });
})