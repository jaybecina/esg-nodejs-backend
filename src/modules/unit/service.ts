import slugify from 'slugify';
import crudService from '../../utils/crudService';
import entities from './interfaces/entities';
import _ from 'lodash';

class ContentService extends crudService {
  constructor() {
    super(entities);
  }

  async convert(value: number, valueUnit: string, targetUnit: string) {
    if (value === 0) {
      return 0;
    }

    if (valueUnit === targetUnit) {
      return value;
    }

    const units = await entities.find({
      $or: [
        { input: valueUnit },
        { output: valueUnit }
      ]
    })

    const foundOutputUnit = units.find((unit) => unit.output === targetUnit);
    const foundInputUnit = units.find((unit) => unit.input === targetUnit);

    if (foundOutputUnit) {
      return _.round(value * foundOutputUnit.rate, 2);
    } else if (foundInputUnit) {
      return _.round(value / foundInputUnit.rate, 2);
    } else {
      return NaN;
    }
  }
}

export default ContentService;