import { Authorized, Body, CurrentUser, Delete, Get, JsonController, Param, Post, Put, QueryParams, UploadedFile } from 'routing-controllers';
import type { SetRequired } from 'type-fest';
import _ from 'lodash';
import mongoose from 'mongoose';
import dayjs from 'dayjs';
import { ICurrentUser, Roles } from '../auth/interfaces/auth';
import { FormGetParams, FormLockPostDto, FormNotificationGetParams, FormPostDto, FormPutDto } from './interfaces/dto';
import FormService from './service';
import FormTemplateService from '../form-template/service';
import CompanyService from '../company/service';
import MeterService from '../meter/service';
import BookmarkService from '../bookmark/service';
import WorkflowService from '../workflow/service';
import AuthService from '../auth/service';
import NotificationService from '../notification/service';
import UserActivityLogService from '../user-activity-log/service';
import { formStatus } from './interfaces/form';
import { ReceiverType } from '../notification/interfaces/notification';
import { qnaType, inputType } from '../material/interfaces/materialForm';
import { addFormEvent, assignFormEvent, completeFormEvent, deleteFormEvent, editFormEvent, submitFormEvent } from '../user-activity-log/template/form';

const path = 'form';
const LOCK_SEC = 30 * 1000;

@JsonController()
class FormController {
    private service: FormService;
    private formTemplateService: FormTemplateService;
    private companyService: CompanyService;
    private meterService: MeterService;
    private bookmarkService: BookmarkService;
    private workflowService: WorkflowService;
    private authService: AuthService;
    private notificationService: NotificationService;
    private userActivityLogService: UserActivityLogService;

    constructor() {
        this.service = new FormService();
        this.formTemplateService = new FormTemplateService();
        this.companyService = new CompanyService();
        this.meterService = new MeterService();
        this.bookmarkService = new BookmarkService();
        this.workflowService = new WorkflowService();
        this.authService = new AuthService();
        this.notificationService = new NotificationService();
        this.userActivityLogService = new UserActivityLogService();
    }

    @Authorized()
    @Get(`/${path}`)
    async getAll(
        @QueryParams() query: FormGetParams,
        @CurrentUser() user: ICurrentUser,
    ) {
        const { page, limit, search, filters, bookmarked, sort } = query;

        const searchValue: any = {
            ...filters,
            $or: [
                { 'formTemplate.name': new RegExp(search, 'i') },
                { 'formTemplate.uniqueId': new RegExp(search, 'i') },
            ]
        }

        if (user.role !== Roles.superAdmin) {
            searchValue.company = user.company._id.toString();
        }

        if (user.role === Roles.user) {
            searchValue['assignees'] = { $in: [new mongoose.mongo.ObjectId(user._id), null] }
        }

        if (typeof bookmarked === 'boolean') {
            const bookmarkedDocs = await this.bookmarkService.getAllUserBookmarked(user._id, 'form');
            const bookmarkedFormIds = bookmarkedDocs.map((bookmarkedDoc) => new mongoose.mongo.ObjectId(bookmarkedDoc.documentId));

            if (bookmarked) {
                searchValue['_id'] = { $in: bookmarkedFormIds }
            } else {
                searchValue['_id'] = { $nin: bookmarkedFormIds }
            }
        }

        const result = await this.service.read(
            page,
            limit,
            ['company', 'editingUser', 'assignees'],
            searchValue,
            sort,
        );
        const count = await this.service.count(searchValue);

        const incompleteMeterCount = await this.meterService.count({
            ...searchValue,
            approved: { $ne: true },
        })

        return {
            status: 'success',
            data: result,
            meta: { count, page, meter: {incomplete: incompleteMeterCount} }
        };
    }

    @Authorized()
    @Get(`/${path}/:id/notification`)
    async getFormNotification(
        @QueryParams() query: FormNotificationGetParams,
        @Param('id') id: string,
        @CurrentUser() user: ICurrentUser,
    ) {
        const { page, limit, filters } = query;

        const form = await this.service.readOne(id);
        if (!form) throw new Error("Form not exists");

        if (user.role !== Roles.superAdmin && user.company._id !== form.company) {
            throw new Error("Forbidden");
        }

        const searchValue = {
            ...filters,
            receiver: new mongoose.mongo.ObjectId(id),
            receiverType: ReceiverType.form,
        }

        const result = await this.notificationService.read(
            page,
            limit,
            [
                'notificationTemplate',
                {
                    path: 'createdBy',
                    populate: {
                        path: 'company',
                        populate: {
                            path: 'logo',
                        }
                    }
                }
            ],
            searchValue,
            { createdAt: -1, }
        )
        const count = await this.notificationService.count(searchValue);

        return { status: 'success', data: result, meta: { count, page } };
    }

    @Authorized()
    @Get(`/${path}/:id/matrixInputResult`)
    async getFormMaterial(
        @Param('id') id: string,
        @CurrentUser() user: ICurrentUser,
    ) {
        const form = await this.service.readOne(id, ['company', 'editingUser', 'assignees', 'formTemplate.materials']);
        if (!form) throw new Error("Form not exists");

        if (user.role !== Roles.superAdmin && user.company._id !== form.company._id) {
            throw new Error("Forbidden");
        }

        if (user.role === Roles.user && Array.isArray(form.assignees) && !form.assignees.map(user => user._id).includes(user._id)) {
            throw new Error("You are not assigned to edit this form");
        }

        const matrixMaterials = form.formTemplate.materials.filter((material) => {
            return material.type === qnaType.matrix;
        })

        let result = [];
        for (const matrixMaterial of matrixMaterials) {
            const nonNumberInputColCount = matrixMaterial.content[0].columns.filter((column) => {
                return column.inputType !== inputType.number;
            }).length

            if (nonNumberInputColCount === matrixMaterial.content[0].columns.length) {
                continue;
            }

            const inputResult = await this.meterService.getMaterialInputResult({
                companyId: form.company._id,
                formId: id,
                financialYear: form.financialYear,
                materialId: matrixMaterial._id,
            })

            const groupByRow = this.meterService.inputResultGroupByRow(inputResult);
            const groupByCol = this.meterService.inputResultGroupByCol(inputResult);

            result.push({
                materialId: matrixMaterial._id,
                materialName: matrixMaterial.name,
                materialUniqueId: matrixMaterial.uniqueId,
                data: inputResult,
                groupByRow,
                groupByCol,
            })
        }

        return { status: 'success', data: result };
    }

    @Authorized()
    @Get(`/${path}/:id`)
    async getOne(
        @Param('id') id: string,
        @CurrentUser() user: ICurrentUser,
    ) {
        const result = await this.service.readOne(id, ['company', 'editingUser', 'assignees']);
        if (!result) throw new Error("Form not exists");

        if (user.role !== Roles.superAdmin && user.company._id !== result.company._id) {
            throw new Error("Forbidden");
        }

        if (user.role === Roles.user && Array.isArray(result.assignees) && !result.assignees.map(user => user._id).includes(user._id)) {
            throw new Error("You are not assigned to edit this form");
        }

        return { status: 'success', data: result };
    }

    @Authorized([Roles.superAdmin])
    @Post(`/${path}`)
    async post(
        @Body() body: FormPostDto,
        @CurrentUser() user: ICurrentUser,
    ) {
        const company = await this.companyService.readOne(body.company);
        if (!company) {
            throw new Error('Company not found');
        }

        const formTemplate = await this.formTemplateService.readOne(body.formTemplate);
        if (!formTemplate) {
            throw new Error('Form Template not found');
        }

        // Not allow to create if today is after financial year end date
        if (dayjs().isAfter(dayjs(body.financialYear))) {
            throw new Error("Today is outside reporting period. You can't create the form");
        }

        const count = await this.service.count({
            "formTemplate.uniqueId": formTemplate.uniqueId,
            company: new mongoose.mongo.ObjectId(body.company),
            financialYear: body.financialYear
        })

        if (count > 0) {
            throw new Error('This form is created');
        }

        let assignees: any[] | null = body.assignees;
        if (Array.isArray(body.assignees)) {
            assignees = []
            for (const userId of body.assignees) {
                const assignUser = await this.authService.readOne(userId);

                if (assignUser.company !== body.company) {
                    throw new Error("One of the assignees is not belong to the company");
                }

                assignees.push(new mongoose.mongo.ObjectId(userId))
            }
        } else {
            assignees = null;
        }

        const result = await this.service.createForm({
            ...body,
            assignees: assignees,
            formTemplate,
        });

        // send assign message
        if (Array.isArray(body.assignees)) {
            if (body.assignees.length > 0) {
                await Promise.all(body.assignees.map((assigneeId) => {
                    return this.notificationService.trigger({
                        uniqueId: 'assign-user-to-form',
                        receiver: assigneeId,
                        receiverType: ReceiverType.user,
                        payload: {
                            formId: result,
                            formName: formTemplate.name,
                            url: `/forms/user/kpi-summary/${result}`,
                        },
                        createdBy: user._id,
                    })
                }))
            }
        } else {
            // assigned to all
            // get user list
            const companyUsers = await this.authService.read(1, 0, 'company', {
                company: body.company,
                role: Roles.user,
            });

            await Promise.all(companyUsers.map((companyUser) => {
                return this.notificationService.trigger({
                    uniqueId: 'assign-user-to-form',
                    receiver: companyUser._id,
                    receiverType: ReceiverType.user,
                    payload: {
                        formId: result,
                        formName: formTemplate.name,
                        url: `/forms/user/kpi-summary/${result}`,
                    },
                    createdBy: user._id,
                })
            }))
        }

        await this.userActivityLogService.create({
            userId: user._id,
            resourceId: result,
            data: body,
            ...addFormEvent,
        });

        return { status: 'success', data: result };
    }

    @Authorized()
    @Put(`/${path}/:id`)
    async put(
        @Param('id') id: string,
        @Body() body: SetRequired<Partial<FormPutDto>, 'submitted'>,
        @CurrentUser() user: ICurrentUser,
    ) {
        const form = await this.service.readOne(id, 'formTemplate.materials');
        if (!form) throw new Error("Form not exists");

        if (user.role !== Roles.superAdmin && user.company._id !== form.company) {
            throw new Error("Forbidden");
        }

        if (dayjs().isAfter(dayjs(form.financialYear), 'day')) {
            throw new Error("The Financial Year Report Date is passed. You're not allowed to edit");
        }

        if (form.editingUser !== null && form.editingUser !== user._id) {
            throw new Error("Someone is editing this form. You can't edit it.");
        }

        if (user.role === Roles.user && Array.isArray(form.assignees) && !form.assignees.includes(user._id)) {
            throw new Error("You are not assigned to edit this form");
        }

        if (user.role === Roles.user && ([formStatus.submitted, formStatus.checkAgain, formStatus.completed].includes(form.status))) {
            throw new Error('This form is submitted. You are not allowed to update this form.');
        }

        if (body.submitted && !Object.values(formStatus).includes(body.nextStatus)) {
            throw new Error('You need to provide next form status')
        }

        // meter validation
        const meters = await this.meterService.findByFormId(id);
        let approved = true;

        if (body.submitted) {
            for (const meter of meters) {
                const validation = this.meterService.validateInputs(meter.inputs, form.formTemplate.materials, body.submitted);

                if (!validation) {
                    throw new Error("Can't pass the validation, some of the meters do not have a valid type or are incomplete")
                }

                if (meter.approved === null && (body.nextStatus === formStatus.error)) {
                    throw new Error("You must select the approval of all meters");
                }

                if (!meter.approved) {
                    approved = false;
                }
            }
        }

        // status validation
        if (body.submitted) {
            if (!approved && body.nextStatus === formStatus.completed) {
                throw new Error("Some meters have error. This form can't be completed")
            }

            const isAcceptNextFormStatus = this.workflowService.isAcceptNextFormStatus(form.status, body.nextStatus);
            const isAllowToChangeFormStatus = this.workflowService.isAllowToChangeFormStatus(body.nextStatus, user.role);

            if (!isAcceptNextFormStatus || !isAllowToChangeFormStatus) {
                throw new Error("You can't update the form")
            }
        }

        let result: boolean;
        if (user.role === Roles.user) {
            result = await this.service.updateByUser({
                _id: id,
                status: body.submitted ? body.nextStatus : form.status,
            })

            if (body.submitted && body.nextStatus === formStatus.checkAgain) {
                await this.meterService.resetApprovalByFormId(id);
            }
        } else {
            result = await this.service.updateByAdmin({
                _id: id,
                status: body.submitted ? body.nextStatus : form.status,
                assignees: body.assignees
            })
        }

        await this.service.updateUserInputProgress(id);
        await this.service.updateAdminCheck(id);

        await this.service.updateAttachmentsCount(id);

        // log / filled record
        await this.notificationService.trigger({
            uniqueId: 'update-form-record',
            receiver: id,
            receiverType: ReceiverType.form,
            payload: {},
            createdBy: user._id,
        })

        // send assign message to user
        if (Array.isArray(body.assignees)) {
            if (body.assignees.length > 0) {
                const newAssignees = _.differenceWith(body.assignees, form.assignees, _.isEqual)

                await Promise.all(newAssignees.map((newAssigneeId) => {
                    return this.notificationService.trigger({
                        uniqueId: 'assign-user-to-form',
                        receiver: newAssigneeId,
                        receiverType: ReceiverType.user,
                        payload: {
                            formId: id,
                            formName: form.formTemplate.name,
                            url: `/forms/user/kpi-summary/${id}`,
                        },
                        createdBy: user._id,
                    })
                }))

                await this.userActivityLogService.create({
                    userId: user._id,
                    resourceId: id,
                    data: body.assignees,
                    ...assignFormEvent,
                })
            }
        } else {
            if (form.assignees !== null && body.assignees === null) {
                // assigned to all
                // get user list                
                const companyUsers = await this.authService.read(1, 0, 'company', {
                    company: form.company,
                    role: Roles.user,
                });

                await Promise.all(companyUsers.map((companyUser) => {
                    return this.notificationService.trigger({
                        uniqueId: 'assign-user-to-form',
                        receiver: companyUser._id,
                        receiverType: ReceiverType.user,
                        payload: {
                            formId: id,
                            formName: form.formTemplate.name,
                            url: `/forms/user/kpi-summary/${result}`,
                        },
                        createdBy: user._id,
                    })
                }))

                await this.userActivityLogService.create({
                    userId: user._id,
                    resourceId: id,
                    data: null,
                    ...assignFormEvent,
                })
            }
        }

        // send submitted message from user to client admin
        if (body.submitted && user.role === Roles.user && [formStatus.submitted, formStatus.checkAgain].includes(body.nextStatus)) {
            const clientAdmins = await this.authService.read(1, 0, null, {
                role: Roles.clientAdmin,
                company: new mongoose.mongo.ObjectId(form.company),
            })

            await Promise.all(clientAdmins.map((clientAdmin) => {
                return this.notificationService.trigger({
                    uniqueId: 'user-submit-form-message',
                    receiver: clientAdmin._id.toString(),
                    receiverType: ReceiverType.user,
                    payload: {
                        formId: id,
                        formName: form.formTemplate.name,
                        url: `/forms/user/kpi-summary/${id}`,
                    },
                    createdBy: user._id,
                })
            }))
        }

        if (body.submitted && body.nextStatus === formStatus.error) {
            const updatedForm = await this.service.readOne(id);

            if (updatedForm.assignees === null) {
                // send to all user in company
                const users = await this.authService.read(1, 0, null, {
                    role: Roles.user,
                    company: new mongoose.mongo.ObjectId(form.company),
                })

                await Promise.all(users.map((normalUser) => {
                    return this.notificationService.trigger({
                        uniqueId: 'client-admin-reject-form-message',
                        receiver: normalUser._id.toString(),
                        receiverType: ReceiverType.user,
                        payload: {
                            formId: id,
                            formName: form.formTemplate.name,
                            url: `/forms/user/kpi-summary/${id}`,
                        },
                        createdBy: user._id,
                    })
                }))
            } else {
                // send to assignees                
                await Promise.all(updatedForm.assignees.map((assigneeId) => {
                    return this.notificationService.trigger({
                        uniqueId: 'client-admin-reject-form-message',
                        receiver: assigneeId,
                        receiverType: ReceiverType.user,
                        payload: {
                            formId: id,
                            formName: form.formTemplate.name,
                            url: `/forms/user/kpi-summary/${id}`,
                        },
                        createdBy: user._id,
                    })
                }))
            }
        }

        const newForm = await this.service.readOne(id);

        await this.userActivityLogService.create({
            userId: user._id,
            resourceId: id,
            data: newForm,
            ...editFormEvent,
        });

        // log when submit the form
        if (body.submitted) {
            await this.userActivityLogService.create({
                userId: user._id,
                resourceId: id,
                data: null,
                ...submitFormEvent,
            });
        }

        // log when complete the form
        if (body.submitted && body.nextStatus === formStatus.completed) {
            await this.userActivityLogService.create({
                userId: user._id,
                resourceId: id,
                data: null,
                ...completeFormEvent,
            });
        }

        return { status: 'success', data: result };
    }

    @Authorized()
    @Put(`/${path}/:id/lock`)
    async lockForm(
        @Param('id') id: string,
        @Body() body: FormLockPostDto,
        @CurrentUser() user: ICurrentUser,
    ) {
        const form = await this.service.readOne(id);
        if (!form) throw new Error("Form not exists");

        if (user.role !== Roles.superAdmin && user.company._id !== form.company) {
            throw new Error("Forbidden");
        }

        if (
            form.editingUser !== null && form.editingUser !== user._id
            && form.locked && dayjs().diff(dayjs(form.locked)) < LOCK_SEC
        ) {
            throw new Error("Someone is editing this form. You can't edit it.");
        }

        const result = await this.service.update(id, {
            editingUser: body.locked ? user._id : null,
            locked: body.locked ? new Date() : null,
        });

        return { status: 'success', data: result };
    }

    @Authorized([Roles.superAdmin])
    @Put(`/${path}/:id/resetStatus`)
    async resetFormStatus(
        @Param('id') id: string,
        @CurrentUser() user: ICurrentUser,
    ) {
        const form = await this.service.readOne(id);
        if (!form) throw new Error("Form not exists");

        if (
            form.editingUser !== null && form.editingUser !== user._id
            && form.locked && dayjs().diff(dayjs(form.locked)) < LOCK_SEC
        ) {
            throw new Error("Someone is editing this form. You can't reset form status.");
        }

        // reset the Form status to "User in progress" (The original status)
        const result = await this.service.update(id, {
            status: formStatus.inProgress
        });

        const newForm = await this.service.readOne(id);

        await this.userActivityLogService.create({
            userId: user._id,
            resourceId: id,
            data: newForm,
            ...editFormEvent,
        });

        return { status: 'success', data: result };
    }

    @Authorized([Roles.superAdmin, Roles.clientAdmin])
    @Delete(`/${path}/:id`)
    async remove(
        @Param('id') id: string,
        @CurrentUser() user: ICurrentUser,
    ) {
        const form = await this.service.readOne(id);
        if (!form) throw new Error("Form not exists");

        if (user.role !== Roles.superAdmin && user.company._id !== form.company) {
            throw new Error("Forbidden");
        }

        // Not allow to create if today is after financial year end date
        if (dayjs().isAfter(dayjs(form.financialYear))) {
            throw new Error("Today is outside reporting period. You can't create the form");
        }

        await this.meterService.deleteByFormId(id);

        const result = await this.service.delete(id);

        await this.userActivityLogService.create({
            userId: user._id,
            resourceId: id,
            data: form,
            ...deleteFormEvent,
        });

        return { status: 'success', data: result };
    }
}

export default FormController;