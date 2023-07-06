require('dotenv').config();

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import request from "supertest";
import qs from 'qs';
import mongoose from 'mongoose';

import server, { shutdown } from '../../../app';
import { constantSample, constantSample2 } from './sample';

chai.use(chaiAsPromised);
chai.should();
const expect = chai.expect;

let app: any;
let superAdminJwt: string;

// let unit: string;

const path = 'constant';

describe('constant controller', () => {
    before(async () => {
        app = await server();
        const response = await request(app).post('/auth/superadmin?secret=dijMz13OsM')
        superAdminJwt = response.body.data;
    });

    it('should return 400 if post body not correct', async function () {
        const res2 = await request(app).post(`/${path}`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({});
        expect(res2.status).equal(400);
    })

    it('should create constant successfully and get the constant', async () => {
        const res1 = await request(app).post(`/${path}`).send(constantSample);
        expect(res1.status).equal(403);

        const res2 = await request(app).post(`/${path}`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                ...constantSample,
            })
        expect(res2.status).equal(200);
        expect(res2.body.data).to.be.an('string');

        const constantId = res2.body.data;

        const res3 = await request(app).get(`/${path}/${constantId}`).set('Authorization', `Bearer ${superAdminJwt}`);
        expect(res3.status).equal(200);

        const constant = res3.body.data
        expect(constant._id).to.be.an('string');
        expect(constant.name).equal(constantSample.name);
        expect(constant.uniqueId).equal(constantSample.uniqueId);
        expect(constant.year).equal(constantSample.year);
        expect(constant.unit).equal(constantSample.unit);
        expect(constant.remarks).equal(constantSample.remarks);
        expect(constant.meta).to.be.an('array');
        expect(constant.meta.length).equal(3);
        expect(constant.meta[0].location).equal(constantSample.meta[0].location);
        expect(constant.meta[0].value).equal(constantSample.meta[0].value);
        expect(constant.meta[1].location).equal(constantSample.meta[1].location);
        expect(constant.meta[1].value).equal(constantSample.meta[1].value);
    });

    it('should not duplicate unique Id', async () => {
        const res1 = await request(app).post(`/${path}`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                ...constantSample,
            })
        expect(res1.status).equal(500);
        expect(res1.body.message).equal('This unique id is used');

        const res2 = await request(app).post(`/${path}`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                ...constantSample2,
                unit: '',
            })
        expect(res2.status).equal(200);

        const res3 = await request(app).put(`/${path}/${res2.body.data}`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                ...constantSample2,
                name: constantSample.name,
                uniqueId: constantSample.uniqueId,
            });
        expect(res3.status).equal(500);
        expect(res3.body.message).equal('This unique id is used');
    })

    it('should get constant list', async () => {
        const res = await request(app).get(`/${path}`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(res.status).equal(200);
        expect(res.body.data).to.be.an('array');
        expect(res.body.data.length).equal(2);
        expect(res.body.meta.count).equal(2);
    })

    it('should get sample data search by multiple fields in query string', async () => {
        const queryString = qs.stringify({
            filters: {
                name: constantSample.name,
                uniqueId: constantSample.uniqueId,
                year: constantSample.year,
            }
        });

        const res = await request(app).get(`/${path}?${queryString}`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(res.status).equal(200);
        expect(res.body.data.length).equal(1);
        expect(res.body.meta.count).equal(1);
    })

    it(`should get sample data by full-text search in query string`, async () => {
        const res = await request(app).get(`/${path}?search=Mobile`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(res.status).equal(200);
        expect(res.body.meta.count).gte(1);

        const result = res.body.data;
        expect(result.length).equal(res.body.meta.count);
        expect(result[0].name).equal(constantSample.name)
    })

    it(`should update constant`, async () => {
        const res = await request(app).get(`/${path}`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(res.status).equal(200);

        const constantId = res.body.data[0]._id;

        const res1 = await request(app).put(`/${path}/${constantId}`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                ...constantSample,
                name: 'updated',
                unit: '',
            });
        expect(res1.status).equal(200);
        expect(res1.body.data).equal(true);

        const res3 = await request(app).get(`/${path}/${constantId}`).set('Authorization', `Bearer ${superAdminJwt}`);
        expect(res3.status).equal(200);
        expect(res3.body.data.name).equal('updated');

        // reset
        const res4 = await request(app).put(`/${path}/${constantId}`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                ...constantSample,
            });
        expect(res4.status).equal(200);
    })

    it('should not update constant if this constant is using on the calculation', async () => {
        const res = await request(app).get(`/${path}`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(res.status).equal(200);
        expect(res.body.data.length).equal(2);
        const constantId = res.body.data[0]._id;

        // get constant pointer
        const getConstantPointerRes1 = await request(app).get(`/pointer/constant/${constantId}`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(getConstantPointerRes1.status).equal(200);
        const constantPointer = getConstantPointerRes1.body.data[0];

        // create calculation
        const postCalculationRes1 = await request(app).post(`/calculation`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                name: 'test sum calculation',
                uniqueId: 'test-sum-calculation',
                unit: 'Person',
                expression: [
                    constantPointer,
                ]
            });
        expect(postCalculationRes1.status).equal(200);
        const calculationId = postCalculationRes1.body.data;


        const res1 = await request(app).put(`/${path}/${constantId}`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                ...constantSample,
                name: 'mobile-combustion-01 updated',
                uniqueId: 'mobile-combustion-01-updated',
            });

        expect(res1.status).equal(500);
        expect(res1.body.message).equal("Some calculations is using this constant. You can't update the unique id and year.");

        const res2 = await request(app).put(`/${path}/${constantId}`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                ...constantSample,
                year: 2020,
            });

        expect(res2.status).equal(500);
        expect(res2.body.message).equal("Some calculations is using this constant. You can't update the unique id and year.");

    })

    it('should not delete constant if this constant is using on the calculation', async () => {
        const res = await request(app).get(`/${path}`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(res.status).equal(200);

        const constantId = res.body.data[0]._id;

        const res1 = await request(app).delete(`/${path}/${constantId}`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
        expect(res1.status).equal(500);
        expect(res1.body.message).equal("This constant is using on the calculation and can't be deleted");


        // delete calculation
        const getCalculationRes = await request(app).get(`/calculation`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(getCalculationRes.status).equal(200);

        const calculationId = getCalculationRes.body.data[0]._id;
        const deleteCalculationRes = await request(app).delete(`/calculation/${calculationId}`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(deleteCalculationRes.status).equal(200);
    })

    it(`should delete constant`, async () => {
        const res = await request(app).get(`/${path}`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(res.status).equal(200);
        expect(res.body.data.length).equal(2);

        const constantId = res.body.data[0]._id;

        const res1 = await request(app).delete(`/${path}/${constantId}`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
        expect(res1.status).equal(200);
        expect(res1.body.data).equal(true);

        const res2 = await request(app).get(`/${path}`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(res2.status).equal(200);
        expect(res2.body.data.length).equal(1);
    })

    it('should have 2 add constant log', async () => {
        const result = await mongoose.model('user_activity_logs').find({
            resource: 'constant',
            action: 'add'
        }).exec();
        expect(result.length).equal(2);
    })

    it('should have 2 edit constant log', async () => {
        const result = await mongoose.model('user_activity_logs').find({
            resource: 'constant',
            action: 'edit'
        }).exec();
        expect(result.length).equal(2);
    })

    it('should have 1 delete constant log', async () => {
        const result = await mongoose.model('user_activity_logs').find({
            resource: 'constant',
            action: 'delete'
        }).exec();
        expect(result.length).equal(1);
    })

    after(async () => {
        await shutdown();
    });
})
