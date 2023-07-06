require('dotenv').config();

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import jwt from 'jsonwebtoken';
import server, { shutdown } from '../../../app';
import request from "supertest";
import nodePath from 'path';

chai.use(chaiAsPromised);
chai.should();
const expect = chai.expect;

let app: any;
let token: string;
const path = 'upload';

const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/i;

describe('upload controller', () => {
    before(async () => {
        app = await server();
        const response = await request(app).post('/auth/superadmin?secret=dijMz13OsM')
        token = response.body.data;
    });

    it('should upload a file', async function () {
        const res = await request(app).post(`/${path}`)
            .set('Authorization', `Bearer ${token}`)
            .attach('files', nodePath.join(__dirname, 'test-logo-1.jpg'));

        const decoded: any = jwt.decode(token);

        expect(res.status).equal(200);
        expect(res.body.data.length).equal(1);
        expect(res.body.data[0].size).gte(1);
        expect(res.body.data[0].createdBy).equal(decoded._id);
        expect(res.body.data[0].mimetype).equal('image/jpeg');
        expect(res.body.data[0].url).match(urlRegex);
    });

    it('should upload multiple files', async function () {
        const res = await request(app).post(`/${path}`)
            .set('Authorization', `Bearer ${token}`)
            .attach('files', nodePath.join(__dirname, 'test-logo-1.jpg'))
            .attach('files', nodePath.join(__dirname, 'test-logo-2.jpg'));

        const decoded: any = jwt.decode(token);

        expect(res.status).equal(200);

        expect(res.body.data.length).equal(2);
        for (const uploadInfo of res.body.data) {
            expect(uploadInfo.size).gte(1);
            expect(uploadInfo.createdBy).equal(decoded._id);
            expect(uploadInfo.mimetype).equal('image/jpeg');
            expect(uploadInfo.url).match(urlRegex);
        }
    });

    after(async () => {
        await shutdown();
    });
})