require('dotenv').config();

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import request from "supertest";
import qs from 'qs';
import mongoose from 'mongoose';

import server, { shutdown } from '../../../app';
import { UnitCreateDto } from '../interfaces/dto';
import { unitSample1 } from "./sample";

chai.use(chaiAsPromised);
chai.should();
const expect = chai.expect;

let app: any;
let jwt: string;
const path = 'unit';

describe('unit controller', () => {
  const fields = ['input', 'output', 'rate'];

  const sample: UnitCreateDto = {
    input: 'cm',
    output: 'm',
    rate: 0.01,
  };

  before(async () => {
    app = await server();
    const response = await request(app).post('/auth/superadmin?secret=dijMz13OsM')
    jwt = response.body.data;
  });

  it('should return 400 if post body not correct', async function () {
    const res2 = await request(app).post(`/${path}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send({});
    expect(res2.status).equal(400);
  })

  it('should successfully create a document', async function () {
    const res1 = await request(app).post(`/${path}`).send(sample);
    expect(res1.status).equal(403);

    const res2 = await request(app).post(`/${path}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send(sample);
    expect(res2.status).equal(200);

    const res3 = await request(app).get(`/${path}/${res2.body.data}`)
    expect(res3.body.data).contains(sample);
  });

  it('should reject if duplicated input & output', async () => {
    const res2 = await request(app).post(`/${path}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send(sample);
    expect(res2.status).equal(500);
    expect(res2.body.message).equal('This unit is created');
  })

  fields.forEach((fieldName) => {
    it(`should get sample data search by ${fieldName} in query string`, async () => {
      const fieldValue = sample[fieldName];

      const res = await request(app).get(`/${path}/?filters[${fieldName}]=${fieldValue}`);
      expect(res.status).equal(200);
      expect(res.body.meta.count).gte(1, "should find at least one unit");

      const result = res.body.data;
      expect(result.length).gte(1, "should find at least one unit");
      expect(result.length).equal(res.body.meta.count);

      result.forEach((unit) => {
        expect(unit).contains(sample);
      })
    })
  })

  it('should get sample data search by multiple fields in query string', async () => {
    const queryString = qs.stringify({
      filters: {
        input: sample.input,
        output: sample.output,
        rate: sample.rate,
      }
    });

    const res = await request(app).get(`/${path}?${queryString}`);
    expect(res.status).equal(200);
    expect(res.body.meta.count).gte(1, "should find at least one unit");

    const result = res.body.data;
    expect(result.length).gte(1, "should find at least one unit");
    expect(result.length).equal(res.body.meta.count);

    result.forEach((unit) => {
      expect(unit).contains(sample);
    })
  })

  it(`should get sample data by full-text search in query string`, async () => {
    const res = await request(app).get(`/${path}?search=${sample.output!.substring(0, 1)}`);
    expect(res.status).equal(200);
    expect(res.body.meta.count).gte(1, "should find at least one unit");

    const result = res.body.data;
    expect(result.length).gte(1, "should find at least one unit");
    expect(result.length).equal(res.body.meta.count);

    result.forEach((unit) => {
      expect(unit.output).to.include(sample.output!.substring(0, 1))
    })
  })

  it('should update the unit', async () => {
    const res = await request(app).get(`/${path}`);
    expect(res.status).equal(200);

    const unit = res.body.data[0];

    const res1 = await request(app).put(`/${path}/${unit._id}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        ...sample,
        input: 'm',
      });
    expect(res1.status).equal(200);

    // check
    const res2 = await request(app).get(`/${path}/${unit._id}`);
    expect(res2.status).equal(200);
    expect(res2.body.data.input).equal('m');

    // reset
    const res3 = await request(app).put(`/${path}/${unit._id}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send(sample);
    expect(res3.status).equal(200);
  })

  it('should reject when update to be duplicated unit', async () => {
    // create new unit
    const res1 = await request(app).post(`/${path}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send(unitSample1);
    expect(res1.status).equal(200);

    const id = res1.body.data;

    const res2 = await request(app).put(`/${path}/${id}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        ...unitSample1,
        input: sample.input,
        output: sample.output,
      });
    expect(res2.status).equal(500);
    expect(res2.body.message).equal('This unit is duplicated');
  })

  it('should delete the unit', async () => {
    const res1 = await request(app).get(`/${path}`)
      .set('Authorization', `Bearer ${jwt}`);
    expect(res1.status).equal(200);
    expect(res1.body.data).to.be.an('array');

    const unitId = res1.body.data[1]._id;

    const res2 = await request(app).delete(`/${path}/${unitId}`)
      .set('Authorization', `Bearer ${jwt}`)
    expect(res2.body.data).is.true;

    const res3 = await request(app).get(`/${path}/${unitId}`)
      .set('Authorization', `Bearer ${jwt}`);
    expect(res3.status).equal(200);
    expect(res3.body.data).equal(null);
  })

  it('should have 2 add unit log', async () => {
      const result = await mongoose.model('user_activity_logs').find({
          resource: 'unit',
          action: 'add'
      }).exec()
      expect(result.length).equal(2);
  })

  it('should have 2 edit unit log', async () => {
      const result = await mongoose.model('user_activity_logs').find({
          resource: 'unit',
          action: 'edit'
      }).exec()
      expect(result.length).equal(2);
  })

  it('should have 1 delete unit log', async () => {
      const result = await mongoose.model('user_activity_logs').find({
          resource: 'unit',
          action: 'delete'
      }).exec()
      expect(result.length).equal(1);
  })

  after(async () => {
    await shutdown();
  });
});