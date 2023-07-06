require('dotenv').config();

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import request from "supertest";
import server, { shutdown } from '../../../app';

chai.use(chaiAsPromised);
chai.should();
const expect = chai.expect;

let app: any;
let superAdminJwt: string;

const path = 'location';

const list = [
    'Global',
    'China',
    'Hong Kong',
]

describe('location controller', () => {
    before(async () => {
        app = await server();
        const response = await request(app).post('/auth/superadmin?secret=dijMz13OsM')
        superAdminJwt = response.body.data;
    })

    it('should get locations', async () => {
        const res1 = await request(app).get(`/${path}`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(res1.status).equal(200);
        expect(res1.body.data).to.be.an('array');
        expect(res1.body.data.length).equal(3);

        for (let i = 0; i < res1.body.data.length; i++) {
            expect(res1.body.data[i]).equal(list[i]);
        }
    })

    after(async () => {
        await shutdown();
    });
})