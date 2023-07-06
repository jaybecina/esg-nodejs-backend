require('dotenv').config();

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import request from "supertest";
import jwt from 'jsonwebtoken';
import server, { shutdown } from '../../../app';
import { requiredNotificationTemplateDtoArr } from '../../notification-template/test/sample';
import { NotificationLevel } from '../../notification-template/interfaces/notificationTemplate';

chai.use(chaiAsPromised);
chai.should();
const expect = chai.expect;

let app: any;
let superAdminJwt: string;

const path = 'notification';

describe('notification controller', () => {
    before(async () => {
        app = await server();
        const response = await request(app).post('/auth/superadmin?secret=dijMz13OsM')
        superAdminJwt = response.body.data;

        // create required notification template
        for (const dto of requiredNotificationTemplateDtoArr) {
            const postNotificationTemplateRes = await request(app).post(`/notification-template`)
                .set('Authorization', `Bearer ${superAdminJwt}`)
                .send(dto);
            expect(postNotificationTemplateRes.status).equal(200);
        }
    })

    it('should create a notification', async () => {
        const res1 = await request(app).post(`/${path}`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                uniqueId: 'remind-deadline-of-form-message',
                level: NotificationLevel.info,
                receiver: '63882c56c9384ca51446dda2',
                payload: {
                    url: '/test',
                    days: 1,
                    deadline: '2022-12-31',
                }
            });
        expect(res1.status).equal(200);
        expect(res1.body.data).to.be.an('string');
    })

    after(async () => {
        await shutdown();
    });
})