require('dotenv').config();

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import request from "supertest";
import server, { shutdown } from '../../../app';
import { CalculationPostDto } from '../../calculation/interfaces/dto';
import { constantSample } from '../../constant/test/sample';
import { sampleMatrixMaterial } from '../../material/test/sample';
import { unitSample2 } from '../../unit/test/sample';

import { calcPointerText, pointerBaseMethodArr } from "../interfaces/pointer";

chai.use(chaiAsPromised);
chai.should();
const expect = chai.expect;

let app: any;
let superAdminJwt: string;

const path = 'pointer';

describe('pointer controller', () => {
    before(async () => {
        app = await server();
        const response = await request(app).post('/auth/superadmin?secret=dijMz13OsM')
        superAdminJwt = response.body.data;

        // create material
        const postMaterialRes = await request(app).post(`/material`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send(sampleMatrixMaterial);

        // create constant
        const postConstantRes = await request(app).post(`/constant`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send(constantSample)
    })

    it('should get base pointer', async () => {
        const res1 = await request(app).get(`/${path}`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(res1.status).equal(200);
        expect(res1.body.data).to.be.an('array');
        expect(res1.body.data.length).equal(Object.values(calcPointerText).length);

        for (const basePointer of res1.body.data) {
            expect(basePointer.text).to.be.oneOf(Object.values(calcPointerText))
            expect(basePointer.method).to.be.oneOf(pointerBaseMethodArr)
        }
    })

    it('should get calculation pointer', async () => {
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
        const res3 = await request(app).post(`/calculation`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send(data);
        expect(res3.status).equal(200);
        expect(res3.body.data).to.be.an('string');

        const calculationId = res3.body.data;

        // get calculation pointer
        const getCalculationPointerRes1 = await request(app).get(`/${path}/calculation/${calculationId}`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(getCalculationPointerRes1.status).equal(200);
        
        const calculationPointer = getCalculationPointerRes1.body.data[0];
        expect(calculationPointer.text).equal('test-calculation');
        expect(calculationPointer.method).equal('calculation');
        expect(calculationPointer.calculationUniqueId).equal('test-calculation');
    })

    it('should get constant pointer', async () => {
        // get constant
        const res1 = await request(app).get(`/constant`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(res1.status).equal(200);
        expect(res1.body.data).to.be.an('array');
        expect(res1.body.data.length).equal(1);

        const constant = res1.body.data[0];

        // get constant pointer
        const getConstantPointerRes1 = await request(app).get(`/${path}/constant/${constant._id}`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(getConstantPointerRes1.status).equal(200);
        expect(getConstantPointerRes1.body.data).to.be.an('array');
        expect(getConstantPointerRes1.body.data.length).equal(1);

        const constantPointer = getConstantPointerRes1.body.data[0];
        expect(constantPointer.text).equal(`${constant.uniqueId}_(${constant.year})`);
        expect(constantPointer.method).equal('constant');
        expect(constantPointer.constantUniqueId).equal(constant.uniqueId);
    })

    after(async () => {
        await shutdown();
    });
})
