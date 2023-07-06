import _ from 'lodash';
import mongoose from 'mongoose';
import { Authorized, Body, CurrentUser, Delete, Get, JsonController, Param, Post, Put, QueryParams, UploadedFile } from 'routing-controllers';
import dayjs from 'dayjs';

import { ControllerResponse } from '../../utils/interfaces';
import { ICurrentUser, IUser, Roles } from '../auth/interfaces/auth';
import { UserGetParams } from '../auth/interfaces/dto';
import AuthService from '../auth/service';
import { IFileObject } from '../upload/interfaces/upload';
import { ICompany } from './interfaces/company';
import { CompanyCreateDto, CompanyGetDto, CompanyGetParams, CompanyUpdateDto } from './interfaces/dto';
import CompanyService from './service';
import UploadService from '../upload/service';
import MeterService from '../meter/service';
import FormService from '../form/service';
import MaterialService from '../material/service';
import UserActivityLogService from '../user-activity-log/service';
import ServerConfig from '../../config/';
import { IForm } from '../form/interfaces/form';
import { qnaType } from '../material/interfaces/materialForm';
import { IContent } from '../content/interfaces/content';
import { getDateOfFinancialYearFromDate } from '../../utils/financialYear';
import { addCompanyEvent, deleteCompanyEvent, editCompanyEvent } from '../user-activity-log/template/company';

const path = 'company';

@JsonController()
class CompanyController {
  private service: CompanyService;
  private authService: AuthService;
  private uploadService: UploadService;
  private meterService: MeterService;
  private formService: FormService;
  private materialService: MaterialService;
  private userActivityLogService: UserActivityLogService;

  constructor() {
    this.service = new CompanyService();
    this.authService = new AuthService();
    this.uploadService = new UploadService();
    this.meterService = new MeterService();
    this.formService = new FormService();
    this.materialService = new MaterialService();
    this.userActivityLogService = new UserActivityLogService();
  }

  @Authorized()
  @Get(`/${path}`)
  async getAll(
    @CurrentUser() user: ICurrentUser,
    @QueryParams() query: CompanyGetParams,
  ): Promise<ControllerResponse<CompanyGetDto[], 'array'>> {
    const { page, limit, search, filters, sort } = query;
    let searchValue;

    if (user.role === Roles.superAdmin) {
      searchValue = {
        ...filters,
        $or: [
          { name: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') },
          { phone: new RegExp(search, 'i') },
        ]
      }
    } else {
      searchValue = {
        _id: new mongoose.mongo.ObjectId(user.company._id),
      }
    }

    const result: (Omit<ICompany, 'admin' | 'defaultLanguage'> & { admin: IUser } & { defaultLanguage: IContent })[]
      = await this.service.read(page, limit, ['admin', 'logo', 'defaultLanguage'], searchValue, sort);
    const count = await this.service.count(searchValue);

    const data = await Promise.all(result.map(async entry => {
      const yearEnd = getDateOfFinancialYearFromDate(dayjs().format('YYYY-MM-DD'), entry.yearEnd).endDate

      const progress = await this.service.getCompanyProgress(entry._id, yearEnd);

      return {
        ...entry,
        ...progress,
      }
    }));

    return { status: 'success', data, meta: { count, page } };
  }

  @Authorized()
  @Get(`/${path}/:id`)
  async getOne(
    @CurrentUser() user: ICurrentUser,
    @Param('id') id: string,
  ): Promise<ControllerResponse<CompanyGetDto, 'single'>> {
    if (user.role !== Roles.superAdmin && user.company._id.toString() !== id) {
      throw new Error("Forbidden");
    }

    const result: (Omit<ICompany, 'admin' | 'defaultLanguage'> & { admin: IUser } & { defaultLanguage: IContent })
      = await this.service.readOne(id, ['admin', 'logo', 'defaultLanguage']);

    if (!result) throw new Error('Entry not found.');

    const yearEnd = getDateOfFinancialYearFromDate(dayjs().format('YYYY-MM-DD'), result.yearEnd).endDate

    const progress = await this.service.getCompanyProgress(result._id, yearEnd);

    const data = {
      ...result,
      ...progress,
    };

    return { status: 'success', data, meta: {} };
  }

  @Authorized([Roles.superAdmin, Roles.clientAdmin])
  @Get(`/${path}/:id/users`)
  async getCompanyUsers(
    @QueryParams() query: UserGetParams,
    @Param('id') id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    const { page, limit, search, filters } = query;

    const searchValue = {
      ...filters,
      company: id,
      $or: [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
      ]
    }

    if (user.role === Roles.clientAdmin) {
      if (id !== user.company._id.toString()) {
        throw {
          statusCode: 403,
          message: "You're not allowed to access other company"
        };
      }
    }

    const users = await this.authService.read(page, limit, 'company', searchValue);
    const count = await this.authService.count(searchValue);
    return { status: 'success', data: users, meta: { count, page } };
  }

  @Authorized()
  @Get(`/${path}/:id/financialYear/:year`)
  async getCompanyFinYearProgress(
    @Param('id') id: string,
    @Param('year') year: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    if (user.role !== Roles.superAdmin && user.company._id !== id) {
      throw new Error("Forbidden");
    }

    const result = await this.service.getCompanyProgress(id, year);

    return { status: 'success', data: result };
  }

  @Authorized([Roles.superAdmin, Roles.clientAdmin])
  @Get(`/${path}/:id/financialYear/:year/material`)
  async getCompanyFinYearMaterial(
    @Param('id') id: string,
    @Param('year') year: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    if (user.role !== Roles.superAdmin && user.company._id !== id) {
      throw new Error("Forbidden");
    }

    const forms: IForm[] = await this.formService.read(1, 0, null, {
      company: new mongoose.mongo.ObjectId(id),
      financialYear: year,
    })

    const uniqueMaterials = await Promise.all(forms
      .map((form) => form.formTemplate.materials)
      .flat()
      .filter((materialId, index, self) => self.indexOf(materialId) === index) // unique
      .map((materialId) => {
        return this.materialService.readOne(materialId);
      }))

    const matrixMaterials = uniqueMaterials.filter((material) => {
      if (material && 'type' in material) {
        return material.type === qnaType.matrix;
      } else {
        return false;
      }
    })

    return { status: 'success', data: matrixMaterials }
  }

  @Authorized([Roles.superAdmin, Roles.clientAdmin])
  @Get(`/${path}/:id/financialYear/:year/material/:materialId`)
  async getCompanyFinYearMaterialInputs(
    @Param('id') id: string,
    @Param('year') year: string,
    @Param('materialId') materialId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    if (user.role !== Roles.superAdmin && user.company._id !== id) {
      throw new Error("Forbidden");
    }

    const result = await this.meterService.getMaterialInputResult({
      companyId: id,
      financialYear: year,
      materialId,
    })

    const groupByRow = this.meterService.inputResultGroupByRow(result);

    const groupByCol = this.meterService.inputResultGroupByCol(result);

    return { status: 'success', data: result, groupByRow, groupByCol }
  }

  @Authorized([Roles.superAdmin])
  @Post(`/${path}`)
  async post(
    @Body() body: CompanyCreateDto,
    @UploadedFile("logo", { options: ServerConfig.fileUploads.logoUploadOptions }) file: IFileObject,
    @CurrentUser() user: ICurrentUser,
  ) {
    const userObj = { ...body.admin };
    userObj.role = Roles.clientAdmin;

    let companyObj;

    if (file) {
      const logoFile = await this.uploadService.uploadFile(file, user._id, '/logo');
      companyObj = { ...body, logo: logoFile._id, };
    } else {
      companyObj = { ...body }
      companyObj.logo = null;
    }
    delete companyObj.admin;

    const id = await this.service.createWithRegistration(companyObj, userObj);

    await this.userActivityLogService.create({
      userId: user._id,
      resourceId: id,
      data: {
        company: companyObj,
        user: {
          ...userObj,
          password: null,
        },
      },
      ...addCompanyEvent,
    });

    return { status: 'success', data: id };
  }

  @Authorized([Roles.superAdmin])
  @Put(`/${path}/:id`)
  async put(
    @Param('id') id: string,
    @Body() body: Partial<CompanyUpdateDto>,
    @UploadedFile("logo", { options: ServerConfig.fileUploads.logoUploadOptions }) file: IFileObject,
    @CurrentUser() user: ICurrentUser,
  ) {
    let newInfo;

    if (file) {
      const logoFile = await this.uploadService.uploadFile(file, user._id, '/logo');
      newInfo = { ...body, logo: logoFile._id }
    } else {
      newInfo = { ...body };
      if (newInfo.logo !== 'null') {
        delete newInfo.logo;
      } else {
        newInfo.logo = null;
      }
    }

    const result = await this.service.update(id, newInfo);

    await this.userActivityLogService.create({
      userId: user._id,
      resourceId: id,
      data: newInfo,
      ...editCompanyEvent,
    });

    return { status: 'success', data: result };
  }

  @Authorized([Roles.superAdmin])
  @Delete(`/${path}/:id`)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    const company = await this.service.readOne(id);

    const result = await this.service.delete(id);

    await this.userActivityLogService.create({
      userId: user._id,
      resourceId: id,
      data: company,
      ...deleteCompanyEvent,
    });

    return { status: 'success', data: result };
  }
}

export default CompanyController;