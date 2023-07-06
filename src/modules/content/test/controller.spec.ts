require('dotenv').config();

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import slugify from 'slugify';
import request from "supertest";
import mongoose from 'mongoose';

import server, { shutdown } from '../../../app';
import { ContentCreateDto } from '../interfaces/dto';
import { translationSample, translationZhHantSample } from './sample';

chai.use(chaiAsPromised);
chai.should();
const expect = chai.expect;

let app: any;
let jwt: string;
const path = 'content';

describe('content controller', () => {
  const sample: ContentCreateDto = {
    title: 'Testing content',
    thumbnail: 'https://images.unsplash.com/photo-1664230388413-5e90d32b8d68?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2338&q=80',
    content: 'This is an orange',
    intro: 'Just an orange',
    customFields: {
      color: 'orange',
    }
  };

  before(async () => {
    app = await server();
    const response = await request(app).post('/auth/superadmin?secret=dijMz13OsM')
    jwt = response.body.data;
  });

  it('should successfully create a document with slug generation', async function () {
    const res1 = await request(app).post(`/${path}`).send(sample);
    expect(res1.status).equal(403);

    const res2 = await request(app).post(`/${path}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send(sample);
    expect(res2.status).equal(200);

    const res3 = await request(app).get(`/${path}/${res2.body.data}`)
    expect(res3.body.data.slug).equal(slugify(sample.title));
  });

  it('should successfully create 2 translations', async () => {
    const res1 = await request(app).post(`/${path}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send(translationSample);
    expect(res1.status).equal(200);

    const res2 = await request(app).post(`/${path}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send(translationZhHantSample);
    expect(res2.status).equal(200);
  })

  it('should not allow to create duplicate translation', async () => {
    const res1 = await request(app).post(`/${path}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send(translationSample);
    expect(res1.status).equal(500);
    expect(res1.body.message).equal("Can't create duplicate translation");
  })

  it('should return array data when get all documents', async function () {
    const res1 = await request(app).get(`/${path}`).send(sample);
    expect(res1.body.data.length).gt(0);
  });

  it('should return object match with sample data when get one document', async function () {
    const res1 = await request(app).get(`/${path}`);
    const id = res1.body.data[0]._id;
    const res2 = await request(app).get(`/${path}/${id}`);
    expect(res2.body.data.title).is.eq(sample.title);
  });

  it('should return boolean data when update', async function () {
    const res1 = await request(app).get(`/${path}`);
    const id = res1.body.data[0]._id;
    const update = { customFields: { color: 'red' } };
    const res2 = await request(app).put(`/${path}/${id}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send(update);
    expect(res2.body.data).is.true;

    const res3 = await request(app).get(`/${path}/${id}`);
    expect(res3.body.data.customFields.color).eq(update.customFields.color);
  });

  it('should not allow to change to existing translation', async () => {
    const res1 = await request(app).get(`/${path}`);
    const translationContentId = res1.body.data[1]._id;

    const res2 = await request(app).put(`/${path}/${translationContentId}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        title: translationZhHantSample.title,
      });
    expect(res2.status).equal(500);
    expect(res2.body.message).equal("Can't create duplicate translation");

    const res3 = await request(app).put(`/${path}/${translationContentId}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        ...translationSample,
        title: translationZhHantSample.title,
      });
    expect(res3.status).equal(500);
    expect(res3.body.message).equal("Can't create duplicate translation");
  })

  it('should delete content', async () => {
    const res1 = await request(app).get(`/${path}`);
    const translationContentId = res1.body.data[0]._id;

    // delete
    const res2 = await request(app).delete(`/${path}/${translationContentId}`)
      .set('Authorization', `Bearer ${jwt}`);
    expect(res2.status).equal(200);

    // check
    const res3 = await request(app).get(`/${path}`)
      .set('Authorization', `Bearer ${jwt}`);
    expect(res3.status).equal(200);
    expect(res3.body.data).to.be.an('array');
    expect(res3.body.data.length).equal(2);
  })

  it('should delete translation content', async () => {
    const res1 = await request(app).get(`/${path}`);
    const translationContentId = res1.body.data[0]._id;

    // delete
    const res2 = await request(app).delete(`/${path}/${translationContentId}`)
      .set('Authorization', `Bearer ${jwt}`);
    expect(res2.status).equal(200);

    // check
    const res3 = await request(app).get(`/${path}`)
      .set('Authorization', `Bearer ${jwt}`);
    expect(res3.status).equal(200);
    expect(res3.body.data).to.be.an('array');
    expect(res3.body.data.length).equal(1);
  })

  it('should have 1 add content log', async () => {
    // exclude translation
    const result = await mongoose.model('user_activity_logs').find({
      resource: 'content',
      action: 'add'
    }).exec();
    expect(result.length).equal(1);
  })

  it('should have 1 edit content log', async () => {
    // exclude translation
    const result = await mongoose.model('user_activity_logs').find({
      resource: 'content',
      action: 'edit'
    }).exec();
    expect(result.length).equal(1);
  })

  it('should have 1 delete content log', async () => {
    // exclude translation
    const result = await mongoose.model('user_activity_logs').find({
      resource: 'content',
      action: 'delete'
    }).exec();
    expect(result.length).equal(1);
  })

  after(async () => {
    await shutdown();
  });
});