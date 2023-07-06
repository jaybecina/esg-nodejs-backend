require('dotenv').config();

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import jwt from 'jsonwebtoken';
import request from "supertest";

import server, { shutdown } from '../../../app';
import { Roles } from '../../auth/interfaces/auth';
import { UserRegistrationDto } from '../../auth/interfaces/dto';
import { BookmarkCreateDto } from '../interfaces/dto';

chai.use(chaiAsPromised);
chai.should();
const expect = chai.expect;

let app: any;
let user1Jwt: string;
let user2Jwt: string;
const path = 'bookmark';

describe('bookmark controller', () => {
  const sample: BookmarkCreateDto = {
    collectionName: 'company',
    documentId: '6373aa4a59c30ea33a9cde34',
  }

  const userSample: UserRegistrationDto = {
    password: 'bar123456',
    email: 'foo-company-user-1@gmail.com',
    role: Roles.user,
    name: 'Foo Company User 1',
    phone: '98887888',
    defaultLanguage: '63871a114d9e6ea0860f2ee4', // random ObjectId
  }

  before(async () => {
    app = await server();
    const response = await request(app).post('/auth/superadmin?secret=dijMz13OsM')
    user1Jwt = response.body.data;
    
    const res2 = await request(app).post(`/auth/register`)
      .set('Authorization', `Bearer ${user1Jwt}`)
      .send(userSample);
    user2Jwt = res2.body.data;
  });

  it('should add bookmark with correct user id', async function () {
    const res1 = await request(app).post(`/${path}`)
      .send(sample);
    expect(res1.status).equal(401);

    const res2 = await request(app).post(`/${path}`)
      .set('Authorization', `Bearer ${user1Jwt}`)
      .send(sample);
    expect(res2.status).equal(200);

    const decodedUser1: any = jwt.decode(user1Jwt);
    const res3 = await request(app).get(`/${path}`)
      .set('Authorization', `Bearer ${user1Jwt}`)
      .send(sample);

    expect(res3.body.data[0].userId).equal(decodedUser1._id);
  });

  it('should retrieve bookmarks for current user', async function () {
    // Create bookmark by another user
    const res1 = await request(app).post(`/${path}`)
      .set('Authorization', `Bearer ${user2Jwt}`)
      .send(sample);
    expect(res1.status).equal(200);

    // User 1 & 2 should retrieve 1 bookmark only
    const res2 = await request(app).get(`/${path}`)
      .set('Authorization', `Bearer ${user1Jwt}`)
    expect(res2.body.data.length).equal(1);

    const res3 = await request(app).get(`/${path}`)
      .set('Authorization', `Bearer ${user2Jwt}`)
    expect(res3.body.data.length).equal(1);
  });

  it('should filter bookmark for specific collection', async function() {
    const sample2 = { ...sample, collectionName: 'unit' };
    const res1 = await request(app).post(`/${path}`)
      .set('Authorization', `Bearer ${user1Jwt}`)
      .send(sample2);
    expect(res1.status).equal(200);

    // Can select specific collection on query
    const res2 = await request(app).get(`/${path}`)
      .set('Authorization', `Bearer ${user1Jwt}`)
    expect(res2.body.data.length).equal(2);

    // Can select specific collection on query
    const res3 = await request(app).get(`/${path}?filters[collectionName]=unit`)
      .set('Authorization', `Bearer ${user1Jwt}`)
    expect(res3.body.data.length).equal(1);
  });

  after(async () => {
    await shutdown();
  });
});