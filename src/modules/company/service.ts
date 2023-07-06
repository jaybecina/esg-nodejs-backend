import jwt from 'jsonwebtoken';
import _ from 'lodash';
import mongoose from 'mongoose';
import crudService from '../../utils/crudService';
import { UserRegistrationDto } from '../auth/interfaces/dto';
import AuthService from '../auth/service';
import FormService from '../form/service';
import { CompanyCreateDto } from './interfaces/dto';
import entities from './interfaces/entities';

class ContentService extends crudService {
  private formService: FormService;

  constructor() {
    super(entities);
    this.formService = new FormService();
  }

  async createWithRegistration(
    companyObj: CompanyCreateDto,
    adminObj: UserRegistrationDto
  ): Promise<string> {
    const authService = new AuthService();

    try {
      // create company
      const companyId = await this.create(companyObj);

      // create admin
      const user = await authService.registration(adminObj);
      const decodedUser = jwt.decode(user);
      if (typeof (decodedUser) === 'string')
        throw new Error('internal error: wrong payload type');

      // add admin to company
      await this.update(companyId, { admin: decodedUser._id })

      // add company to admin
      await authService.update(decodedUser._id, { company: companyId });

      return companyId;
    } catch (error) {
      throw error;
    }
  }

  async getCompanyProgress(id: string, financialYear: string) {
    const forms = await this.formService.read(1, 0, null, {
      company: new mongoose.mongo.ObjectId(id),
      financialYear,
    });

    const obj = {
      materialFieldsCount: 0,
      inputtedFieldsCount: 0,
      fieldsTotal: 0,
      inputProgress: 0,
      adminCheckedCount: 0,
      meterCount: 0,
    }

    if (forms.length === 0) {
      return {
        materialFieldsCount: 0,
        inputtedFieldsCount: 0,
        fieldsTotal: 0,
        inputProgress: 0,
        adminCheckedCount: 0,
        adminCheckedProgress: 0,
      }
    }

    const sum = forms.reduce((accumulator, form) => {
      accumulator.materialFieldsCount += form.materialFieldsCount;
      accumulator.inputtedFieldsCount += form.inputtedFieldsCount;
      accumulator.fieldsTotal += form.fieldsTotal;
      accumulator.adminCheckedCount += form.adminCheckedCount;
      accumulator.meterCount = _.round(accumulator.meterCount + form.meters.length, 2);

      return accumulator;
    }, obj)

    const result = {
      materialFieldsCount: sum.materialFieldsCount,
      inputtedFieldsCount: sum.inputtedFieldsCount,
      fieldsTotal: sum.fieldsTotal,
      inputProgress: sum.fieldsTotal > 0 ? _.round(sum.inputtedFieldsCount / sum.fieldsTotal, 2) : 0,
      adminCheckedCount: sum.adminCheckedCount,
      adminCheckedProgress: sum.meterCount > 0 ? _.round(sum.adminCheckedCount / sum.meterCount, 2) : 0,
    }

    return result
  }
}

export default ContentService;