import mongoose from "mongoose";
import { recurisveObjectIdStringifyer } from ".";
import _ from 'lodash';

class crudService {
  private entities: mongoose.Model<any>;

  constructor(_entities: mongoose.Model<any>) {
    this.entities = _entities;
  }

  public async create<T>(data: T) {
    const result = await this.entities.create(data);
    return result._id.toString();
  }

  public async read(page = 1, limit = 15, populate = null, searchValue = {}, sort = null) {
    const filteredsearchValue = this.fullTextSearchFilters(searchValue);

    const entities = await this.entities.find(filteredsearchValue)
      .populate(populate).limit(limit).skip(limit * (page - 1)).sort(sort).lean();
    return recurisveObjectIdStringifyer(entities);
  }

  public async readOne(id: string, populate = null) {
    const _id = new mongoose.mongo.ObjectId(id);
    const entities = await this.entities.findById(_id).populate(populate).lean();
    return recurisveObjectIdStringifyer(entities);
  }

  public async count<T extends { [any: string]: any }>(query: T = {} as T) {
    const filteredsearchValue = this.fullTextSearchFilters(query || {});

    const count = await this.entities.countDocuments(filteredsearchValue);
    return count;
  }

  public async update<T extends Object>(id: string, data: T) {
    const _id = new mongoose.mongo.ObjectId(id);
    const filteredData = this.omitId(data);
    const result = await this.entities.updateOne({ _id }, { $set: filteredData });
    return result.acknowledged;
  }

  public async delete(id: string) {
    const _id = new mongoose.mongo.ObjectId(id);
    const result = await this.entities.deleteOne({ _id });
    return result.acknowledged;
  }

  private fullTextSearchFilters(filters: { [any: string]: any }) {
    if ('search' in filters && !_.isNil(filters.search)) {
      return {
        $text: {
          $search: filters.search,
        },
        ..._.omit(filters, 'search'),
      }
    }

    return filters;
  }

  public omitId<T extends Object>(data: T) {
    return _.omit(data, ['_id', 'id'])
  }
}

export default crudService;