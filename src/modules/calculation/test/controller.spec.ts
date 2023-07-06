import chai, { should } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import request from "supertest";
import mongoose from 'mongoose';

import server, { shutdown } from '../../../app';

import { sampleMatrixMaterial } from '../../material/test/sample';
import { CalculationPostDto } from '../interfaces/dto';
import { pointerMethod } from '../../pointer/interfaces/pointer'

chai.use(chaiAsPromised);
chai.should();
const expect = chai.expect;

let app: any;
let superAdminJwt: string;

const path = 'calculation';

describe('calculation controller', () => {
    before(async () => {
        app = await server();
        const response = await request(app).post('/auth/superadmin?secret=dijMz13OsM')
        superAdminJwt = response.body.data;

        // create material
        const postMaterialRes = await request(app).post(`/material`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send(sampleMatrixMaterial);
        expect(postMaterialRes.status).equal(200);
    })

    it('should create calculation with material', async () => {
        // get material
        const res1 = await request(app).get(`/material`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(res1.status).equal(200);

        // get material pointer
        const material = res1.body.data[0];
        const res2 = await request(app).get(`/material/${material._id}/pointer`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(res2.status).equal(200);

        const data: CalculationPostDto = {
            name: 'test calculation',
            uniqueId: 'test-calculation',
            unit: 'm',
            expression: [
                res2.body.data[0],
                {
                    "text": "+",
                    "method": "operator"
                },
                res2.body.data[1],
            ]
        }

        // create calculation
        const res3 = await request(app).post(`/${path}`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send(data);
        expect(res3.status).equal(200);
        expect(res3.body.data).to.be.an('string');

        // get calculation
        const res4 = await request(app).get(`/${path}/${res3.body.data}`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(res4.status).equal(200);

        const calculation = res4.body.data;
        expect(calculation._id).to.be.an('string');
        expect(calculation.name).equal(data.name);
        expect(calculation.uniqueId).equal(data.uniqueId);
        expect(calculation.version).equal(1);
        expect(calculation.latest).equal(true);
        expect(calculation.unit).equal(data.unit);
        expect(calculation.expression).to.be.an('array');
        expect(calculation.expression.length).equal(3);
    })

    it('should get calculation list', async () => {
        const res1 = await request(app).get(`/${path}`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(res1.status).equal(200);

        expect(res1.body.data).to.be.an('array');
        expect(res1.body.data.length).equal(1);
        expect(res1.body.meta.count).equal(res1.body.data.length);
        expect(res1.body.meta.page).equal(1);

        for (const calculation of res1.body.data) {
            expect(calculation._id).to.be.a('string');
        }
    })

    it('should update calculation and update calculation id in report', async () => {
        // get material
        const res1 = await request(app).get(`/material`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(res1.status).equal(200);

        // get material pointer
        const material = res1.body.data[0];
        const res2 = await request(app).get(`/material/${material._id}/pointer`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(res2.status).equal(200);

        // get calculation id
        const res3 = await request(app).get(`/${path}`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(res3.status).equal(200);

        const id = res3.body.data[0]._id;

        const postReportRes1 = await request(app).post(`/report`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                name: 'env-report',
                calculations: [
                    id,
                ],
            });
        expect(postReportRes1.status).equal(200);

        // check the report has calculation id
        const getEnvReportRes1 = await request(app).get(`/report/env-report`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(getEnvReportRes1.status).equal(200);
        expect(getEnvReportRes1.body.data[0].calculations[0]).equal(id);

        // update calculation
        const data: CalculationPostDto = {
            name: 'test calculation updated',
            uniqueId: 'test-calculation-updated',
            unit: 'm',
            expression: [
                res2.body.data[0],
                {
                    "text": "-",
                    "method": "operator"
                },
                res2.body.data[1],
            ]
        }

        const res4 = await request(app).put(`/${path}/${id}`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send(data);
        expect(res4.status).equal(200);

        // get calculation
        const res5 = await request(app).get(`/${path}`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(res5.status).equal(200);

        const newId = res5.body.data[0]._id;

        const res6 = await request(app).get(`/${path}/${newId}`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(res6.status).equal(200);

        const calculation = res6.body.data;
        expect(calculation._id).to.be.an('string');
        expect(calculation.name).equal(data.name);
        expect(calculation.uniqueId).equal(data.uniqueId);
        expect(calculation.version).equal(2);
        expect(calculation.latest).equal(true);
        expect(calculation.unit).equal(data.unit);
        expect(calculation.expression).to.be.an('array');
        expect(calculation.expression.length).equal(3);

        // check the report has new calculation id
        const getEnvReportRes2 = await request(app).get(`/report/env-report`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(getEnvReportRes2.status).equal(200);
        expect(getEnvReportRes2.body.data[0].calculations[0]).equal(newId)
    })

    it('should reject if duplicated uniqueId', async function () {
        const res2 = await request(app).post(`/${path}`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                name: 'test calculation updated',
                uniqueId: 'test-calculation-updated',
                unit: 'm',
                expression: [
                    {
                        "text": "1",
                        "method": "number"
                    },
                    {
                        "text": "+",
                        "method": "operator"
                    },
                    {
                        "text": "1",
                        "method": "number"
                    },
                ]
            });

        expect(res2.status).equal(500);
        expect(res2.body.message).equal('This unique id is used');
    })

    it('should reject if that calculation is using on the report', async () => {
        const res1 = await request(app).get(`/${path}`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(res1.status).equal(200);

        const id = res1.body.data[0]._id;

        const postReportRes1 = await request(app).post(`/report`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                name: 'env-report',
                calculations: [
                    id,
                ],
            });
        expect(postReportRes1.status).equal(200);

        // delete
        const res2 = await request(app).delete(`/${path}/${id}`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(res2.status).equal(500);
        expect(res2.body.message).equal("This calculation is using on the report and can't be deleted");

        // reset
        const postReportRes2 = await request(app).post(`/report`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                name: 'env-report',
                calculations: [],
            });
        expect(postReportRes2.status).equal(200);
    })

    it('should create base calculation without unit', async () => {
        const data: CalculationPostDto = {
            name: 'simple plus calculation',
            uniqueId: 'simple-plus-calculation',
            unit: '',
            expression: [
                {
                    "text": "1",
                    "method": pointerMethod.number,
                },
                {
                    "text": "+",
                    "method": pointerMethod.operator,
                },
                {
                    "text": "2",
                    "method": pointerMethod.number,
                },
            ]
        }

        // create calculation
        const res3 = await request(app).post(`/${path}`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send(data);
        expect(res3.status).equal(200);
        expect(res3.body.data).to.be.an('string');
    })

    it('should update calculation without unit', async () => {
        // get calculation id
        const res3 = await request(app).get(`/${path}`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(res3.status).equal(200);

        const id = res3.body.data[1]._id;

        const data: CalculationPostDto = {
            name: 'simple plus calculation',
            uniqueId: 'simple-plus-calculation',
            unit: '',
            expression: [
                {
                    "text": "3",
                    "method": pointerMethod.number,
                },
                {
                    "text": "+",
                    "method": pointerMethod.operator,
                },
                {
                    "text": "2",
                    "method": pointerMethod.number,
                },
            ]
        }

        const res4 = await request(app).put(`/${path}/${id}`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send(data);
        expect(res4.status).equal(200);

        const res5 = await request(app).get(`/${path}`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(res5.status).equal(200);
        expect(res5.body.data.length).equal(2);
        expect(res5.body.data[1].unit).equal('');
    })

    it('should delete calculation', async () => {
        const res1 = await request(app).get(`/${path}`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(res1.status).equal(200);

        const id = res1.body.data[0]._id;

        // delete
        const res2 = await request(app).delete(`/${path}/${id}`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(res2.status).equal(200);

        // check
        const res3 = await request(app).get(`/${path}`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(res3.status).equal(200);
        expect(res3.body.data).to.be.an('array');
        expect(res3.body.data.length).equal(1);
    })

    it('should have 2 add calculation log', async () => {
        const result = await mongoose.model('user_activity_logs').find({
            resource: 'calculation',
            action: 'add'
        }).exec()

        expect(result.length).equal(2);
    })

    it('should have 2 edit calculation log', async () => {
        const result = await mongoose.model('user_activity_logs').find({
            resource: 'calculation',
            action: 'edit'
        }).exec()

        expect(result.length).equal(2);
    })

    it('should have 1 delete calculation log', async () => {
        const result = await mongoose.model('user_activity_logs').find({
            resource: 'calculation',
            action: 'delete'
        }).exec()

        expect(result.length).equal(1);
    })

    after(async () => {
        await shutdown();
    });
})