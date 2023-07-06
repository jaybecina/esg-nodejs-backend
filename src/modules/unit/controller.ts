import mongoose from 'mongoose';
import { Authorized, Body, CurrentUser, Delete, Get, JsonController, Param, Post, Put, QueryParams } from 'routing-controllers';
import { ICurrentUser, Roles } from '../auth/interfaces/auth';
import { UnitCreateDto, UnitGetParams } from './interfaces/dto';
import UnitService from './service';
import UserActivityLogService from '../user-activity-log/service';
import { addUnitEvent, deleteUnitEvent, editUnitEvent } from '../user-activity-log/template/unit';

const path = 'unit';

@JsonController()
class UnitController {
  private service: UnitService;
  private userActivityLogService: UserActivityLogService;

  constructor() {
    this.service = new UnitService();
    this.userActivityLogService = new UserActivityLogService();
  }

  @Get(`/${path}`)
  async getAll(
    @QueryParams() query: UnitGetParams,
  ) {
    const { page, limit, search, filters, sort } = query;

    const searchValue = {
      ...filters,
      $or: [
        { input: new RegExp(search, 'i') },
        { output: new RegExp(search, 'i') },
      ]
    }

    const result = await this.service.read(page, limit, null, searchValue, sort);
    const count = await this.service.count(searchValue);
    return { status: 'success', data: result, meta: { count, page } };
  }

  @Get(`/${path}/:id`)
  async getOne(@Param('id') id: string) {
    const result = await this.service.readOne(id);
    return { status: 'success', data: result };
  }

  @Authorized([Roles.superAdmin])
  @Post(`/${path}`)
  async post(
    @Body({ validate: true }) body: UnitCreateDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const uniqueCount = await this.service.count({
      input: body.input,
      output: body.output,
    })

    if (uniqueCount > 0) {
      throw new Error("This unit is created");
    }

    const result = await this.service.create(body);

    await this.userActivityLogService.create({
      userId: user._id,
      resourceId: result,
      data: result,
      ...addUnitEvent,
    });

    return { status: 'success', data: result };
  }

  @Authorized([Roles.superAdmin])
  @Put(`/${path}/:id`)
  async put(
    @Param('id') id: string,
    @Body() body: Partial<UnitCreateDto>,
    @CurrentUser() user: ICurrentUser,
  ) {
    const uniqueCount = await this.service.count({
      _id: { $ne: new mongoose.mongo.ObjectId(id) },
      input: body.input,
      output: body.output,
    })

    if (uniqueCount > 0) {
      throw new Error("This unit is duplicated");
    }

    const result = await this.service.update(id, body);

    await this.userActivityLogService.create({
      userId: user._id,
      resourceId: id,
      data: body,
      ...editUnitEvent,
    });

    return { status: 'success', data: result };
  }

  @Authorized([Roles.superAdmin])
  @Delete(`/${path}/:id`)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    const unit = await this.service.readOne(id);

    const result = await this.service.delete(id);

    await this.userActivityLogService.create({
      userId: user._id,
      resourceId: id,
      data: unit,
      ...deleteUnitEvent,
    });

    return { status: 'success', data: result };
  }
}

export default UnitController;