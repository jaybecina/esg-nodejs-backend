import _ from 'lodash';
import mongoose from 'mongoose';
import { Authorized, Body, CurrentUser, Delete, Get, JsonController, Param, Post, Put, QueryParams } from 'routing-controllers';
import { ICurrentUser, Roles } from '../auth/interfaces/auth';
import { ConstantGetParams, ConstantPostDto } from './interfaces/dto';
import ConstantService from "./service";
import CalculationService from "../calculation/service";
import UserActivityLogService from '../user-activity-log/service';
import { addConstantEvent, deleteConstantEvent, editConstantEvent } from '../user-activity-log/template/constant';

const path = 'constant';

@JsonController()
class ConstantController {
    private service: ConstantService;
    private calculationService: CalculationService;
    private userActivityLogService: UserActivityLogService;

    constructor() {
        this.service = new ConstantService();
        this.calculationService = new CalculationService();
        this.userActivityLogService = new UserActivityLogService();
    }

    @Authorized()
    @Get(`/${path}`)
    async getAll(@QueryParams() query: ConstantGetParams) {
        const { page, limit, search, filters, sort } = query;

        const searchValue = {
            ...filters,
            $or: [
                { name: new RegExp(search, 'i') },
                { uniqueId: new RegExp(search, 'i') },
            ],
        }

        const result = await this.service.read(page, limit, null, searchValue, sort);
        const count = await this.service.count(searchValue);
        return { status: 'success', data: result, meta: { count, page } };
    }

    @Authorized()
    @Get(`/${path}/:id`)
    async getOne(@Param('id') id: string) {
        const result = await this.service.readOne(id);
        return { status: 'success', data: result };
    }

    @Authorized([Roles.superAdmin])
    @Post(`/${path}`)
    async post(
        @Body({ validate: true }) body: ConstantPostDto,
        @CurrentUser() user: ICurrentUser,
    ) {
        const count = await this.service.count({
            uniqueId: body.uniqueId,
        });

        if (count > 0) {
            throw new Error("This unique id is used");
        }

        const result = await this.service.create(body);

        await this.userActivityLogService.create({
          userId: user._id,
          resourceId: result,
          data: body,
          ...addConstantEvent,
        });

        return { status: 'success', data: result };
    }

    @Authorized([Roles.superAdmin])
    @Put(`/${path}/:id`)
    async put(
        @Param('id') id: string,
        @Body({ validate: true }) body: ConstantPostDto,
        @CurrentUser() user: ICurrentUser,
    ) {
        const constant = await this.service.readOne(id);

        if (!constant) {
            throw new Error("Can't find the constant");
        }

        const count = await this.service.count({
            _id: { $ne: new mongoose.mongo.ObjectId(id) },
            uniqueId: body.uniqueId,
        });

        if (count > 0) {
            throw new Error("This unique id is used");
        }

        // not allow to update if calculation
        const calculationCount = await this.calculationService.count({
            expression: {
                $elemMatch: {
                    method: 'constant',
                    constantUniqueId: constant.uniqueId,
                }
            },
            latest: true,
        });

        if (calculationCount > 0) {
            if (constant.uniqueId !== body.uniqueId || constant.year !== body.year) {
                throw new Error("Some calculations is using this constant. You can't update the unique id and year.");
            }
        }

        const result = await this.service.update(id, body);

        await this.userActivityLogService.create({
          userId: user._id,
          resourceId: id,
          data: body,
          ...editConstantEvent,
        });

        return { status: 'success', data: result };
    }

    @Authorized([Roles.superAdmin])
    @Delete(`/${path}/:id`)
    async remove(
        @Param('id') id: string,
        @CurrentUser() user: ICurrentUser,
    ) {
        const constant = await this.service.readOne(id);

        if (!constant) {
            throw new Error("Can't find the constant");
        }

        // Can't delete if using in calculation
        const count = await this.calculationService.count({
            expression: {
                $elemMatch: {
                    method: 'constant',
                    constantUniqueId: constant.uniqueId,
                }
            },
            latest: true,
        })

        if (count > 0) {
            throw new Error("This constant is using on the calculation and can't be deleted");
        }

        const result = await this.service.delete(id);

        await this.userActivityLogService.create({
          userId: user._id,
          resourceId: id,
          data: constant,
          ...deleteConstantEvent,
        });

        return { status: 'success', data: result };
    }
}

export default ConstantController
