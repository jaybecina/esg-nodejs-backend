require('dotenv').config();

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import mongoose from 'mongoose';
import database from '../../../utils/database';
import Service from '../service';
import NotificationTemplateService from '../../notification-template/service';
import { createUpdateFormRecordTemplateDto, createVariablesTemplateDto } from '../../notification-template/test/sample';
import { ReceiverType } from '../interfaces/notification';

chai.use(chaiAsPromised);
chai.should();
const expect = chai.expect;

describe('notification service', () => {
    let service: Service;
    let notificationTemplateService: NotificationTemplateService;

    before(async () => {
        const dbUri = await database.getUri();
        await mongoose.connect(dbUri);

        service = new Service();
        notificationTemplateService = new NotificationTemplateService();
    });

    it('should trigger a notification without variable & payload', async () => {
        // create notification template
        const notificationTemplateId = await notificationTemplateService.create(createUpdateFormRecordTemplateDto);

        // trigger notification
        const notification = await service.trigger({
            uniqueId: 'update-form-record',
            receiver: '63841a1559ca20189880ebb5',
            receiverType: ReceiverType.form,
            payload: {},
            createdBy: '635a47ca59ee72aaf780e823',
        })

        expect(notification.notificationTemplate.toString()).equal(notificationTemplateId);
        expect(notification.level).equal(createUpdateFormRecordTemplateDto.level);
        expect(notification.receiverType).equal(ReceiverType.form);
        expect(notification.receiver.toString()).equal('63841a1559ca20189880ebb5');
        expect(notification.createdBy.toString()).equal('635a47ca59ee72aaf780e823');
        expect(notification.read).equal(false);
    })

    it('should not trigger a notification with incorrect payload', async () => {
        let error = null;
        let error1 = null;

        // create notification template

        await notificationTemplateService.create(createVariablesTemplateDto);

        // trigger notification without payload
        try {
            await service.trigger({
                uniqueId: createVariablesTemplateDto.uniqueId,
                receiver: '635a47ca59ee72aaf780e823',
                receiverType: ReceiverType.user,
                payload: {},
                createdBy: '635a47ca59ee72aaf780e823',
            })
        } catch (e) {
            error = e;
        }
        expect(error).to.not.be.null;

        // trigger notification without payload
        try {
            await service.trigger({
                uniqueId: createVariablesTemplateDto.uniqueId,
                receiver: '635a47ca59ee72aaf780e823',
                receiverType: ReceiverType.user,
                payload: {
                    hello: 'test'
                },
                createdBy: '635a47ca59ee72aaf780e823',
            })
        } catch (e) {
            error1 = e;
        }        
        expect(error1).to.not.be.null;
    })

    it('should trigger a notification with correct payload', async () => {
        let notification;

        notification = await service.trigger({
            uniqueId: createVariablesTemplateDto.uniqueId,
            receiver: '635a47ca59ee72aaf780e823',
            receiverType: ReceiverType.user,
            payload: {
                name: 'username',
                extra: 'test extra',
            },
            createdBy: '635a47ca59ee72aaf780e823',
        })

        expect(notification.level).equal(createVariablesTemplateDto.level);
        expect(notification.read).equal(false);
        expect(notification.receiverType).equal(ReceiverType.user);
        expect(notification.receiver.toString()).equal('635a47ca59ee72aaf780e823');
        expect(notification.createdBy.toString()).equal('635a47ca59ee72aaf780e823');
        expect(notification.payload.name).equal('username');
        expect(notification.payload.extra).equal('test extra');

    })

    after(async () => {
        await database.reset();
        await database.shutdown();
        await mongoose.disconnect();
    });
})