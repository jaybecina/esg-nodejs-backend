import { Authorized, Body, CurrentUser, Delete, Get, JsonController, Param, Post, Put, QueryParams } from 'routing-controllers';
import mongoose from 'mongoose';

import { ICurrentUser, Roles } from '../auth/interfaces/auth';
import { CalculationGetParams, CalculationPostDto } from './interfaces/dto';
import CalculationService from './service';
import ReportService from "../report/service";
import UserActivityLogService from '../user-activity-log/service';
import { addCalculationEvent, deleteCalculationEvent, editCalculationEvent } from '../user-activity-log/template/calculation';

const path = 'calculation';

@JsonController()
class CalculationController {
    private service: CalculationService;
    private reportService: ReportService;
    private userActivityLogService: UserActivityLogService;

    constructor() {
        this.service = new CalculationService();
        this.reportService = new ReportService();
        this.userActivityLogService = new UserActivityLogService();
    }

    @Get(`/${path}`)
    async getAll(
        @QueryParams() query: CalculationGetParams,
    ) {
        const { page, limit, search, filters, sort } = query;

        const searchValue = {
            latest: true,
            ...filters,
            $or: [
              { name: new RegExp(search, 'i') },
              { uniqueId: new RegExp(search, 'i') },
            ]
          }

        const result = await this.service.read(page, limit, ['unit'], searchValue, sort);
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

    @Authorized([Roles.superAdmin])
    @Post(`/${path}`)
    async post(
      @Body({ validate: true }) body: CalculationPostDto,
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
          ...addCalculationEvent,
        });

        return { status: 'success', data: result };
    }

    @Authorized([Roles.superAdmin])
    @Put(`/${path}/:id`)
    async put(
      @Param('id') id: string, @Body() body: CalculationPostDto,
      @CurrentUser() user: ICurrentUser,
    ) {
        const result = await this.service.updateWithVersioning(id, body);

        await this.reportService.replaceCalculationId(id, result);

        await this.userActivityLogService.create({
          userId: user._id,
          resourceId: id,
          data: {
            newId: result,
            ...body,
          },
          ...editCalculationEvent,
        });

        return { status: 'success', data: result };
    }

    @Authorized([Roles.superAdmin])
    @Delete(`/${path}/:id`)
    async remove(
      @Param('id') id: string,
      @CurrentUser() user: ICurrentUser,
    ) {
      // can't delete if using in the report
      const count = await this.reportService.count({
        calculations: {$in: [new mongoose.mongo.ObjectId(id)]}
      })

      if (count > 0) {
        throw new Error("This calculation is using on the report and can't be deleted");
      }

      const calculation = await this.service.readOne(id);

      const result = await this.service.delete(id);

      await this.userActivityLogService.create({
        userId: user._id,
        resourceId: id,
        data: calculation,
        ...deleteCalculationEvent,
      });

      return { status: 'success', data: result };
    }
}

export default CalculationController;
