import _ from 'lodash';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

import { Authorized, Body, BodyParam, CurrentUser, Delete, Get, JsonController, Param, Post, Put, QueryParam, QueryParams } from 'routing-controllers';
import { UserGetParams, UserLoginDto, UserNotificationGetParams, UserNotificationUpdateDto, UserRegistrationDto, UserUpdateDto } from './interfaces/dto';
import AuthService from './service';
import CompanyService from "../company/service";
import NotificationService from '../notification/service';
import UserActivityLogService from '../user-activity-log/service';
import { ICurrentUser, Roles } from './interfaces/auth';
import { ReceiverType } from '../notification/interfaces/notification';
import { addUserEvent, deleteUserEvent, editUserEvent } from '../user-activity-log/template/user';

const path = 'auth';

@JsonController()
class AuthController {
  private service: AuthService;
  private companyService: CompanyService;
  private notificationService: NotificationService;
  private userActivityLogService: UserActivityLogService;

  constructor() {
    this.service = new AuthService();
    this.companyService = new CompanyService();
    this.notificationService = new NotificationService();
    this.userActivityLogService = new UserActivityLogService();
  }

  @Post(`/${path}/superadmin`)
  async superadmin(@QueryParam('secret') secret: string) {
    if (secret !== 'dijMz13OsM') throw new Error('Unknown error.');
    const body = { email: 'superadmin@gmail.com', password: '123456', role: Roles.superAdmin, name: 'super-admin', phone: '0', defaultLanguage: null };
    const result = await this.service.registration(body);
    return { status: 'success', data: result };
  }

  @Authorized([Roles.superAdmin, Roles.clientAdmin])
  @Post(`/${path}/register`)
  async register(
    @CurrentUser() user: ICurrentUser,
    @Body() body: UserRegistrationDto,
  ) {
    if (user.role !== Roles.superAdmin && user.company._id !== body.company)
      throw new Error('Wrong company ID');

    const result = await this.service.registration(body);

    const newUser: any = jwt.decode(result);

    await this.userActivityLogService.create({
      userId: user._id,
      resourceId: newUser._id,
      data: {
        ...body,
        password: null,
      },
      ...addUserEvent,
    });

    return { status: 'success', data: result };
  }

  @Post(`/${path}/forget-password`)
  async forgetPassword(@BodyParam('email') email: string):
    Promise<{ status: string, data: string | boolean }> {
    const result = await this.service.resetPasswordRequest(email);
    return { status: 'success', data: result };
  }

  @Post(`/${path}/reset-password`)
  async resetPassword(
    @BodyParam('token') token: string,
    @BodyParam('password') password: string,
  ):
    Promise<{ status: string, data: boolean }> {
    const result = await this.service.resetPasswordByToken(token, password);    
    return { status: 'success', data: result };
  }


  @Post(`/${path}`)
  async login(@Body() body: UserLoginDto) {
    const result = await this.service.login(body.email, body.password, body.keepLoggedIn);
    return { status: 'success', data: result };
  }

  @Authorized()
  @Put(`/${path}`)
  async updateSelf(
    @CurrentUser() user: ICurrentUser,
    @Body() body: Partial<UserUpdateDto>
  ) {
    if (user.role !== Roles.superAdmin && body.role && body.role === Roles.superAdmin) {
      throw new Error("You can't update to super admin");
    }

    if (user.role === Roles.superAdmin && body.role && body.role !== Roles.superAdmin) {
      throw new Error("You can't update super admin to other role");
    }

    const result = await this.service.update(user._id, body)

    await this.userActivityLogService.create({
      userId: user._id,
      resourceId: user._id,
      data: {
        ...body,
        password: null,
      },
      ...editUserEvent,
    });

    return { status: 'success', data: result };
  }

  @Authorized()
  @Put(`/${path}/notification/:id`)
  async updateNotification(
    @Param('id') id: string,
    @CurrentUser() user: ICurrentUser,
    @Body() body: UserNotificationUpdateDto,
  ) {
    const notification = await this.notificationService.readOne(id);

    if (user._id !== notification.receiver.toString()) {
      throw new Error("Forbidden");
    }

    const result = await this.notificationService.update(id, {
      read: body.read,
      lastReadAt: body.read ? new Date() : null,
    })
    return { status: 'success', data: result };
  }

  @Authorized()
  @Put(`/${path}/:id`)
  async update(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
    @Body() body: Partial<UserUpdateDto>
  ) {
    if (currentUser.role !== Roles.superAdmin && body.role && body.role === Roles.superAdmin) {
      throw new Error("You can't update to super admin");
    }

    const user = await this.service.readOne(id);

    if (!user) {
      throw new Error("Can't find this user");
    }

    if (user.role === Roles.superAdmin && body.role && body.role !== Roles.superAdmin) {
      throw new Error("You can't update super admin to other role");
    }

    const result = await this.service.update(id, body)

    await this.userActivityLogService.create({
      userId: user._id,
      resourceId: id,
      data: {
        ...body,
        password: null,
      },
      ...editUserEvent,
    });

    return { status: 'success', data: result };
  }

  @Authorized([Roles.superAdmin, Roles.clientAdmin])
  @Get(`/${path}`)
  async getAll(
    @QueryParams() query: UserGetParams,
    @CurrentUser() user: ICurrentUser,
  ) {
    const { page, limit, search, filters, sort } = query;

    const searchValue = {
      ...filters,
      $or: [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
      ]
    }

    if (user.role !== Roles.superAdmin) {
      searchValue.company = user.company._id.toString();
    }

    const users = await this.service.read(page, limit, [
      {
        path: 'company',
        populate: {
          path: 'logo',
        },
      },
      'defaultLanguage',
    ], searchValue, sort);

    const count = await this.service.count(searchValue);
    return { status: 'success', data: users, meta: { count, page } };
  }

  @Authorized()
  @Get(`/${path}/me/notification`)
  async getUserNotifications(
    @QueryParams() query: UserNotificationGetParams,
    @CurrentUser() user: ICurrentUser,
  ) {
    const { page, limit, filters } = query;

    const searchValue = {
      ...filters,
      receiver: new mongoose.mongo.ObjectId(user._id),
      receiverType: ReceiverType.user,
    }

    const result = await this.notificationService.read(
      page,
      limit,
      [
        'notificationTemplate',
        {
          path: 'createdBy',
          populate: {
            path: 'company'
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
  @Get(`/${path}/:id`)
  async getOne(
    @Param('id') id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    if (user.role === Roles.user && user._id !== id) {
      throw new Error("Forbidden");
    }

    const result = await this.service.readOne(id, [
      {
        path: 'company',
        populate: {
          path: 'logo'
        }
      },
      'defaultLanguage',
    ]);
    if (!result) throw new Error("User not exists");
    delete result.hash;

    if (user.role !== Roles.superAdmin && result.role === Roles.superAdmin) {
      throw new Error("Forbidden");
    }

    if (user.role === Roles.clientAdmin && user.company._id !== result.company._id) {
      throw new Error("Forbidden");
    }

    return { status: 'success', data: result };
  }

  @Authorized()
  @Delete(`/${path}/notification/:id`)
  async deleteNotification(
    @Param('id') id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    const notification = await this.notificationService.readOne(id);

    if (user._id !== notification.receiver.toString()) {
      throw new Error("Forbidden");
    }

    const result = await this.notificationService.delete(id)
    return { status: 'success', data: result };
  }

  @Authorized([Roles.superAdmin, Roles.clientAdmin])
  @Delete(`/${path}`)
  async delete(
    @BodyParam('id') id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    const selectedUser = await this.service.readOne(id, 'company');

    /* validation */
    if (selectedUser === null) {
      throw new Error('User is not found');
    }

    if (selectedUser.role === Roles.superAdmin) {
      throw new Error('You are not allowed to delete super admin');
    }

    if (user._id === selectedUser._id) {
      throw new Error('You are not allowed to delete your account');
    }

    if (user.role === Roles.clientAdmin) {
      if (_.isNil(selectedUser.company)) {
        throw new Error('The company of this user is not found');
      }

      if (selectedUser.company._id !== user.company._id) {
        throw new Error('You are not allowed to delete this account');
      }
    }

    // Remove business owner if selectedUser is business owner
    if (selectedUser.company) {
      const company = await this.companyService.readOne(selectedUser.company._id, ['admin']);
      if (!_.isNil(company.admin) && company.admin._id === selectedUser._id) {
        await this.companyService.update(company._id, {
          admin: null,
        })
      }
    }

    const result = await this.service.delete(id);

    await this.userActivityLogService.create({
      userId: user._id,
      resourceId: id,
      data: selectedUser,
      ...deleteUserEvent,
    });

    return { status: 'success', data: result };
  }
}

export default AuthController;