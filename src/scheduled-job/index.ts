import { CronJob } from 'cron';
import mongoose from 'mongoose';
import dayjs from 'dayjs';
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import customParseFormat from "dayjs/plugin/customParseFormat";

import NotificationService from "../modules/notification/service";
import AuthService from "../modules/auth/service";
import CompanyService from "../modules/company/service";
import { Roles } from '../modules/auth/interfaces/auth';
import { ReceiverType } from '../modules/notification/interfaces/notification';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.tz.setDefault('Asia/Hong_Kong');

const notificationService = new NotificationService();
const authService = new AuthService();
const companyService = new CompanyService();

export const startAllJobs = () => {
    sendMessageRemindDeadlineJob.start();
}

export const sendMessageRemindDeadlineJob = new CronJob({
    cronTime: '5 0 * * *',
    onTick: async () => {
        const dates: string[] = [];
        for (let i = 10; i >= 1; i--) {
            dates.push(dayjs().add(i, 'day').format('YYYY-MM-DD'));
        }

        const superAdmins = await authService.read(1, 0, null, {
            role: Roles.superAdmin,
        });

        const companies = await companyService.read(1, 0, null, {
            submissionDeadline: {
                $in: dates
            }
        });

        for (const company of companies) {
            const clientAdmins = await authService.read(1, 0, null, {
                role: Roles.clientAdmin,
                company: new mongoose.mongo.ObjectId(company._id),
            });

            await Promise.allSettled(clientAdmins.map((clientAdmin) => {
                return notificationService.trigger({
                    uniqueId: 'remind-deadline-of-form-message',
                    receiver: clientAdmin._id.toString(),
                    receiverType: ReceiverType.user,
                    payload: {
                        url: '/forms',
                        days: Math.abs(dayjs().diff(company.submissionDeadline, 'day')) + 1,
                        deadline: company.submissionDeadline,
                    },
                    createdBy: superAdmins[0]._id,
                })
            }))            
        }
    },
    start: false,
    timeZone: 'Asia/Hong_Kong',
})

