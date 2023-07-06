require('dotenv').config();

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import request from "supertest";
import server, { shutdown } from '../../../app';

import { createUpdateFormRecordTemplateDto } from "./sample";

chai.use(chaiAsPromised);
chai.should();
const expect = chai.expect;

let app: any;
let superAdminJwt: string;
let templateId: string;

const path = 'notification-template';

describe('notification template controller', () => {
    before(async () => {
        app = await server();
        const response = await request(app).post('/auth/superadmin?secret=dijMz13OsM')
        superAdminJwt = response.body.data;
    })


    it('should create update form record notification template successfully and get the template', async () => {
        const res1 = await request(app).post(`/${path}`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send(createUpdateFormRecordTemplateDto);
        expect(res1.status).equal(200);

        templateId = res1.body.data;

        const res2 = await request(app).get(`/${path}/${templateId}`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
        expect(res2.status).equal(200);

        const notificationTemplate = res2.body.data;

        expect(notificationTemplate._id).to.be.a('string');
        expect(notificationTemplate.name).equal(createUpdateFormRecordTemplateDto.name);
        expect(notificationTemplate.uniqueId).equal(createUpdateFormRecordTemplateDto.uniqueId);
        expect(notificationTemplate.description).equal(createUpdateFormRecordTemplateDto.description);
        expect(notificationTemplate.level).equal(createUpdateFormRecordTemplateDto.level);
        expect(notificationTemplate.label).equal(createUpdateFormRecordTemplateDto.label);
        expect(notificationTemplate.header).equal(createUpdateFormRecordTemplateDto.header);
        expect(notificationTemplate.content).equal(createUpdateFormRecordTemplateDto.content);
        expect(notificationTemplate.variables).to.be.instanceof(Array);
        expect(notificationTemplate.variables.length).equal(0);
    })

    it('should get array of template', async () => {
        const res1 = await request(app).get(`/${path}`).set('Authorization', `Bearer ${superAdminJwt}`);
        expect(res1.status).equal(200);
        expect(res1.body.data).to.be.an('array');
        expect(res1.body.data.length).equal(1);
        expect(res1.body.meta.count).equal(res1.body.data.length);
        expect(res1.body.meta.page).equal(1);
    })

    it('should update the template by Super Admin', async () => {
        const res1 = await request(app).put(`/${path}/${templateId}`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                name: 'Updated name',
                variables: ['var1', 'var2'],
            });
        expect(res1.status).equal(200);
        expect(res1.body.data).equal(true);

        const res2 = await request(app).get(`/${path}/${templateId}`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
        expect(res2.status).equal(200);

        const notificationTemplate = res2.body.data;

        expect(notificationTemplate._id).to.be.a('string');
        expect(notificationTemplate.name).equal('Updated name');
        expect(notificationTemplate.uniqueId).equal(createUpdateFormRecordTemplateDto.uniqueId);
        expect(notificationTemplate.description).equal(createUpdateFormRecordTemplateDto.description);
        expect(notificationTemplate.level).equal(createUpdateFormRecordTemplateDto.level);
        expect(notificationTemplate.label).equal(createUpdateFormRecordTemplateDto.label);
        expect(notificationTemplate.header).equal(createUpdateFormRecordTemplateDto.header);
        expect(notificationTemplate.content).equal(createUpdateFormRecordTemplateDto.content);
        expect(notificationTemplate.variables).to.be.instanceof(Array);
        expect(notificationTemplate.variables.length).equal(2);
        expect(notificationTemplate.variables[0]).equal('var1');
        expect(notificationTemplate.variables[1]).equal('var2');

        // reset
        const res3 = await request(app).put(`/${path}/${templateId}`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                name: createUpdateFormRecordTemplateDto.name,
                variables: createUpdateFormRecordTemplateDto.variables,
            });
        expect(res3.status).equal(200);
        expect(res3.body.data).equal(true);
    })

    it('should delete the template by Super Admin', async () => {
        const res1 = await request(app).delete(`/${path}/${templateId}`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(res1.status).equal(200);
        expect(res1.body.data).equal(true);

        const res2 = await request(app).get(`/${path}/${templateId}`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(res2.status).equal(200);
        expect(res2.body.data).equal(null);
    })

    after(async () => {
        await shutdown();
    });
})
