import { Authorized, Body, CurrentUser, Delete, Get, JsonController, Param, Post, Put, QueryParams, UploadedFile, UploadedFiles } from 'routing-controllers';
import _ from 'lodash';
import type { RequireAtLeastOne } from 'type-fest';
import mongoose from 'mongoose';
import dayjs from 'dayjs';
import { MeterAddAttachmentsDto, MeterAttachmentUpdateDto, MeterGetParams, MeterPostDto, MeterPutDto } from './interfaces/dto';
import MeterService from './service';
import FormService from '../form/service';
import UploadService from '../upload/service';
import AuthService from '../auth/service';
import UserActivityLogService from '../user-activity-log/service';
import { ICurrentUser, Roles } from '../auth/interfaces/auth';
import { IFileObject } from '../upload/interfaces/upload';
import { MeterAttachmentData, MeterPushAttachmentsData } from './interfaces/meter';
import { addMeterEvent, deleteMeterEvent, editMeterEvent } from '../user-activity-log/template/meter';

const path = 'meter';

@JsonController()
class MeterController {
    private service: MeterService;
    private formService: FormService;
    private uploadService: UploadService;
    private authService: AuthService;
    private userActivityLogService: UserActivityLogService;

    constructor() {
        this.service = new MeterService();
        this.formService = new FormService();
        this.uploadService = new UploadService();
        this.authService = new AuthService();
        this.userActivityLogService = new UserActivityLogService();
    }

    @Authorized()
    @Get(`/${path}`)
    async getAll(
        @QueryParams() query: MeterGetParams,
        @CurrentUser() user: ICurrentUser,
    ) {
        const { page, limit, search, filters } = query;

        const searchValue: any = {
            ...filters,
            $or: [
                { name: new RegExp(search, 'i') },
            ]
        }

        if (user.role !== Roles.superAdmin) {
            searchValue.company = user.company._id.toString();
        }

        if (user.role === Roles.user) {
            searchValue['assignees'] = { $in: [new mongoose.mongo.ObjectId(user._id), null] }
        }

        const result = await this.service.read(page, limit, ['assignees', 'attachments.file'], searchValue);
        const count = await this.service.count(searchValue);
        const incompleteCount = await this.service.count({
            ...searchValue,
            finished: false,
        })

        return { status: 'success', data: result, meta: { count, incomplete: incompleteCount, page } };
    }

    @Authorized()
    @Get(`/${path}/:id`)
    async getOne(
        @Param('id') id: string,
        @CurrentUser() user: ICurrentUser,
    ) {
        const result = await this.service.readOne(id, ['form', 'assignees', 'attachments.file']);
        if (!result) throw new Error("Form not exists");

        if (user.role !== Roles.superAdmin && user.company._id !== result.company) {
            throw new Error("Forbidden");
        }

        return { status: 'success', data: result };
    }

    @Authorized([Roles.superAdmin, Roles.clientAdmin])
    @Post(`/${path}`)
    async post(
        @Body() body: MeterPostDto,
        @CurrentUser() user: ICurrentUser,
    ) {
        const form = await this.formService.readOne(body.form);
        if (!form) throw new Error('Form not found.');

        if (user.role !== Roles.superAdmin && user.company._id !== form.company) {
            throw new Error("Forbidden");
        }

        // Not allow to create if today is after financial year end date
        if (dayjs().isAfter(dayjs(form.financialYear))) {
            throw new Error("Today is outside reporting period. You can't create a meter");
        }

        const isUniqueMeterName = await this.service.isUniqueMeterName(body.form, body.name)
        if (!isUniqueMeterName) {
            throw new Error(`The meter name (${body.name}) is used`);
        }

        let assignees: any[] = body.assignees;
        if (Array.isArray(body.assignees)) {
            assignees = []
            for (const userId of body.assignees) {
                const assignUser = await this.authService.readOne(userId);

                if (assignUser.company !== form.company) {
                    throw new Error("One of the assignees is not belong to the company");
                }

                assignees.push(new mongoose.mongo.ObjectId(userId))
            }
        }

        const data = {
            ...body,
            form: form._id,
            company: form.company,
            financialYear: form.financialYear,
            assignees: assignees
        }

        try {
            const result = await this.service.createMeter(data);

            await this.formService.addMeter(form._id, [result]);
            await this.formService.updateUserInputProgress(form._id);
            await this.formService.updateFieldsTotal(form._id);
            await this.formService.updateAdminCheck(form._id);

            await this.userActivityLogService.create({
                userId: user._id,
                resourceId: result,
                data: data,
                ...addMeterEvent,
            });

            return { status: 'success', data: result };
        } catch (error) {
            throw new Error("Can't create new meter");
        }
    }

    @Authorized()
    @Put(`/${path}/:id`)
    async put(
        @Param('id') id: string,
        @Body({ validate: true }) body: RequireAtLeastOne<Partial<MeterPutDto>, 'submitted'>,
        @CurrentUser() user: ICurrentUser,
    ) {
        if (typeof body.submitted !== 'boolean') {
            throw new Error("Please save or submit when updating the meter");
        }

        if (body.submitted) {
            throw new Error("Meter level sumbit is depracated, please use form level submission");
        }

        const meter = await this.service.readOne(id, {
            path: 'form',
            populate: {
                path: 'formTemplate.materials',
            }
        });
        if (!meter) throw new Error("Meter not exists");

        if (user.role !== Roles.superAdmin && user.company._id !== meter.company) {
            throw new Error("Forbidden");
        }

        if (dayjs().isAfter(dayjs(meter.financialYear), 'day')) {
            throw new Error("The Financial Year Report Date is passed. You're not allowed to edit");
        }

        // assignees = empty array = no "User" can update
        if (user.role === Roles.user && meter.assignees !== null && !meter.assignees.find((assignee) => assignee === user._id)) {
            throw new Error('You are not allowed to update this meter.');
        }

        if (user.role === Roles.user && meter.finished) {
            throw new Error('This meter is submitted. You are not allowed to update this meter.');
        }

        const isUniqueMeterName = await this.service.isUniqueMeterName(meter.form._id, body.name, id)
        if (!isUniqueMeterName) {
            throw new Error(`The meter name (${body.name}) is used`);
        }

        if (meter.form.editingUser && meter.form.editingUser !== user._id) {
            throw new Error('Someone is editing. You are not allowed to update this meter.');
        }

        if (Array.isArray(body.assignees)) {
            for (const userId of body.assignees) {
                const assignUser = await this.authService.readOne(userId);

                if (assignUser.company !== meter.company) {
                    throw new Error("One of the assignees is not belong to the company");
                }
            }
        }

        let result = false;

        switch (user.role) {
            case Roles.user:
                result = await this.service.updateByUser({
                    ...body,
                    finished: body.submitted,
                    _id: id,
                }, meter.form.formTemplate.materials);

                break;
            /**
             * Super Admin should have the same permission as client admin
             * let's merge two method to updateByAdmin.
             **/
            case Roles.clientAdmin:
            case Roles.superAdmin:
                result = await this.service.updateByClientAdmin({
                    ...body,
                    _id: id,
                    finished: meter.finished,
                    checked: body.submitted,
                    approved: body.approved,
                    errorReason: body.errorReason,
                }, meter.form.formTemplate.materials);

                break;
            // case Roles.superAdmin:
            //     result = await this.service.updateBySuperAdmin({
            //         ...body,
            //         _id: id,
            //         finished: meter.finished,
            //         checked: body.submitted,
            //         approved: body.approved,
            //         errorReason: body.errorReason,
            //     });

            //     break;
            default:
                throw new Error("Can't update the meter")
        }

        const newMeter = await this.service.readOne(id);
        await this.userActivityLogService.create({
            userId: user._id,
            resourceId: id,
            data: newMeter,
            ...editMeterEvent,
        });

        return { status: 'success', data: result };
    }

    @Authorized()
    @Put(`/${path}/:id/attachments`)
    async putNewAttachments(
        @Param('id') id: string,
        @Body() body: Partial<MeterAddAttachmentsDto>,
        @UploadedFiles("attachments") attachments: IFileObject[],
        @CurrentUser() user: ICurrentUser,
    ) {
        if (body.descriptions.length !== attachments.length) {
            throw new Error("Number of attachments isn't equal to number of descriptions");
        }

        const meter = await this.service.readOne(id);
        if (!meter) throw new Error("Meter not exists");

        if (user.role !== Roles.superAdmin && user.company._id !== meter.company) {
            throw new Error("Forbidden");
        }

        if (user.role !== Roles.superAdmin && dayjs().isAfter(dayjs(meter.financialYear), 'day')) {
            throw new Error("The Financial Year Report Date is passed. You're not allowed to edit");
        }

        if (user.role === Roles.user && meter.finished) {
            throw new Error('This meter is submitted. You are not allowed to update this meter.');
        }

        const meterAttachments: MeterAttachmentData[] = [];

        for (let i = 0; i < attachments.length; i++) {
            const newFile = await this.uploadService.uploadFile(attachments[i], user._id, `/meter/${id}`, false);
            const isThisFileIsUploadedBefore = await this.service.isThisFileIsUploadedBefore(id, newFile.name);

            if (isThisFileIsUploadedBefore) {
                throw new Error(`${newFile.name} has been uploaded. You can't upload twice.`);
            }

            meterAttachments.push({
                description: body.descriptions[i],
                file: newFile._id,
            })
        }

        const data: MeterPushAttachmentsData = {
            _id: id,
            attachments: meterAttachments,
        }

        const result = await this.service.pushAttachments(data);

        return { status: 'success', data: result };
    }

    @Authorized()
    @Put(`/${path}/:id/attachments/:attachmentId`)
    async putAttachment(
        @Param('id') id: string,
        @Param('attachmentId') attachmentId: string,
        @Body() body: Partial<MeterAttachmentUpdateDto>,
        @CurrentUser() user: ICurrentUser,
    ) {
        const meter = await this.service.readOne(id);
        if (!meter) throw new Error("Meter not exists");

        if (user.role !== Roles.superAdmin && user.company._id !== meter.company) {
            throw new Error("Forbidden");
        }

        if (user.role !== Roles.superAdmin && dayjs().isAfter(dayjs(meter.financialYear), 'day')) {
            throw new Error("The Financial Year Report Date is passed. You're not allowed to edit");
        }

        if (user.role === Roles.user && meter.finished) {
            throw new Error('This meter is submitted. You are not allowed to update this meter.');
        }

        const result = await this.service.updateAttachmentDescription({
            _id: id,
            attachmentId,
            description: body.description,
        })

        return { status: 'success', data: result };
    }

    @Authorized([Roles.superAdmin, Roles.clientAdmin])
    @Delete(`/${path}/:id`)
    async remove(
        @Param('id') id: string,
        @CurrentUser() user: ICurrentUser,
    ) {
        const meter = await this.service.readOne(id, {
            path: 'form',
            populate: {
                path: 'formTemplate.materials',
            }
        });
        if (!meter) throw new Error("Meter not exists");

        if (user.role !== Roles.superAdmin && user.company._id !== meter.company) {
            throw new Error("Forbidden");
        }

        if (user.role === Roles.user && meter.finished) {
            throw new Error("This meter is submitted. You can't delete it.");
        }

        // Not allow to create if today is after financial year end date
        if (dayjs().isAfter(dayjs(meter.form.financialYear))) {
            throw new Error("Today is outside reporting period. You can't update the meter");
        }

        try {
            const result = await this.service.delete(id);

            await this.formService.removeMeter(meter.form, [id]);
            await this.formService.updateUserInputProgress(meter.form._id);
            await this.formService.updateFieldsTotal(meter.form._id);
            await this.formService.updateAdminCheck(meter.form._id);

            await this.userActivityLogService.create({
                userId: user._id,
                resourceId: id,
                data: meter,
                ...deleteMeterEvent,
            });

            return { status: 'success', data: result };
        } catch (error) {
            throw new Error("Can't delete the meter");
        }
    }
}

export default MeterController;