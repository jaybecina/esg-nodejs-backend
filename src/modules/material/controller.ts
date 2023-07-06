import { Authorized, Body, CurrentUser, Delete, Get, JsonController, Param, Post, Put, QueryParams } from 'routing-controllers';
import mongoose from 'mongoose';
import _ from 'lodash';
import { ICurrentUser, Roles } from '../auth/interfaces/auth';
import { MaterialGetParams, MaterialPostDto } from './interfaces/dto';
import MaterialService from './service';
import BookmarkService from '../bookmark/service';
import PointerService from '../pointer/service';
import FormTemplateService from '../form-template/service';
import FormService from '../form/service';
import UserActivityLogService from '../user-activity-log/service';
import { qnaType } from './interfaces/materialForm';
import { addMaterialEvent, deleteMaterialEvent, editMaterialEvent } from '../user-activity-log/template/material';

const path = 'material';

@JsonController()
class MaterialController {
    private service: MaterialService;
    private bookmarkService: BookmarkService;
    private pointerService: PointerService;
    private formTemplateService: FormTemplateService;
    private formService: FormService;
    private userActivityLogService: UserActivityLogService;

    constructor() {
        this.service = new MaterialService();
        this.bookmarkService = new BookmarkService();
        this.pointerService = new PointerService();
        this.formTemplateService = new FormTemplateService();
        this.formService = new FormService();
        this.userActivityLogService = new UserActivityLogService();
    }

    @Authorized()
    @Get(`/${path}`)
    async getAll(
        @QueryParams() query: MaterialGetParams,
        @CurrentUser() user: ICurrentUser,
    ) {
        const { page, limit, search, filters, bookmarked, sort } = query;

        const searchValue = {
            latest: true,
            ...filters,
            $or: [
                { name: new RegExp(search, 'i') },
                { uniqueId: new RegExp(search, 'i') },
            ]
        }

        if (typeof bookmarked === 'boolean') {
            const bookmarkedDocs = await this.bookmarkService.getAllUserBookmarked(user._id, 'material');
            const bookmarkedMaterialIds = bookmarkedDocs.map((bookmarkedDoc) => new mongoose.mongo.ObjectId(bookmarkedDoc.documentId));

            if (bookmarked) {
                searchValue['_id'] = { $in: bookmarkedMaterialIds }
            } else {
                searchValue['_id'] = { $nin: bookmarkedMaterialIds }
            }
        }

        const result = await this.service.read(page, limit, null, searchValue, sort);
        const count = await this.service.count(searchValue);

        return { status: 'success', data: result, meta: { count, page } };
    }

    @Authorized()
    @Get(`/${path}/:id`)
    async getOne(@Param('id') id: string) {
        const result = await this.service.readOne(id);
        if (!result) throw new Error('Entry not found.');

        return { status: 'success', data: result, meta: {} };
    }

    @Authorized()
    @Get(`/${path}/:id/pointer`)
    async getPointers(@Param('id') id: string) {
        const material = await this.service.readOne(id);
        if (!material) throw new Error('Entry not found.');

        if (material.type !== qnaType.matrix) {
            return { status: 'success', data: [] };
        }

        const pointers = this.pointerService.generateFunctionPointers(
            id,
            material.uniqueId,
            material.content[0]
        );

        return { status: 'success', data: pointers };
    }


    @Authorized([Roles.superAdmin])
    @Post(`/${path}`)
    async post(
        @Body({ validate: true }) body: MaterialPostDto,
        @CurrentUser() user: ICurrentUser,
    ) {
        const duplicatedUniqueId = await this.service.read(1, 0, null, {
            uniqueId: body.uniqueId,
        })

        if (duplicatedUniqueId.length > 0) {
            throw new Error('This unique id is used')
        }

        const result = await this.service.create(body);

        await this.userActivityLogService.create({
            userId: user._id,
            resourceId: result,
            data: body,
            ...addMaterialEvent,
        });

        return { status: 'success', data: result };
    }

    @Authorized([Roles.superAdmin])
    @Put(`/${path}/:id`)
    async put(
        @Param('id') id: string,
        @Body({ validate: true }) body: MaterialPostDto,
        @CurrentUser() user: ICurrentUser,
    ) {
        const result = await this.service.updateWithVersioning(id, body);

        await this.userActivityLogService.create({
            userId: user._id,
            resourceId: id,
            data: {
                newId: result,
                ...body,
            },
            ...editMaterialEvent,
        });

        return { status: 'success', data: result };
    }

    @Authorized([Roles.superAdmin])
    @Delete(`/${path}/:id`)
    async delete(
        @Param('id') id: string,
        @CurrentUser() user: ICurrentUser,
    ) {
        // count form-template
        const formTemplateCount = await this.formTemplateService.count({
            materials: { $in: [new mongoose.mongo.ObjectId(id)] }
        });
        if (formTemplateCount > 0) {
            throw new Error("This material is using. You can't delete it.");
        }

        // count form
        const formCount = await this.formService.count({
            'formTemplate.materials': { $in: [new mongoose.mongo.ObjectId(id)] }
        })
        if (formCount > 0) {
            throw new Error("This material is using. You can't delete it.");
        }

        const oldMaterial = await this.service.readOne(id);

        const result = await this.service.delete(id);

        await this.userActivityLogService.create({
            userId: user._id,
            resourceId: id,
            data: oldMaterial,
            ...deleteMaterialEvent,
        });

        return { status: 'success', data: result };
    }
}

export default MaterialController;