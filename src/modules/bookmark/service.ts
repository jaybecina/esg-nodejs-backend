import mongoose from "mongoose";
import { recurisveObjectIdStringifyer } from "../../utils";
import crudService from '../../utils/crudService';
import entities from './interfaces/entities';

class BookmarkService extends crudService {
  constructor() {
    super(entities);
  }

  public async getAllUserBookmarked(userId: string, collectionName: string) {
    const result = await entities.find({
      userId: new mongoose.mongo.ObjectId(userId),
      collectionName,
    }).lean();

    return recurisveObjectIdStringifyer(result);
  }

  public async deleteOwnBookmark(id: string, userId: string) {
    const _id = new mongoose.mongo.ObjectId(id);
    const _userId = new mongoose.mongo.ObjectId(userId);
    const result = await entities.deleteOne({ _id, _userId });
    return result.acknowledged;
  }
}

export default BookmarkService;