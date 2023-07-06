import { IsNumber, MinLength } from 'class-validator';
import { IBaseApiQueryParams } from '../../../utils/interfaces';
import { IUnit } from './unit';

export class UnitCreateDto implements IUnit {
  @MinLength(1)
  input: string;
  @MinLength(1)
  output: string;
  @IsNumber()
  rate: number;
}

export class UnitGetParams implements IBaseApiQueryParams {
  filters: Partial<IUnit>;
  page: number = 1;
  limit: number = 10;
  search?: string;
  sort: {
    updatedAt: -1
  }
}
