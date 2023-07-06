import mongoose from 'mongoose';
import { Authorized, Body, CurrentUser, Delete, Get, JsonController, Param, Post, QueryParams } from 'routing-controllers';
import { ICurrentUser } from '../auth/interfaces/auth';
import { BookmarkCreateDto, BookmarkGetParams } from './interfaces/dto';
import BookmarkService from './service';

const path = 'bookmark';

@JsonController()
class BookmarkController {
  private service: BookmarkService;

  constructor() {
    this.service = new BookmarkService();
  }

  @Authorized()
  @Get(`/${path}`)
  async getAll(
    @CurrentUser() user: ICurrentUser,
    @QueryParams() query: BookmarkGetParams,
  ) {
    const { page, limit, search, filters } = query;

    const searchValue = {
      search,
      ...filters,
      userId: user._id,
    }

    const result = await this.service.read(page, limit, null, searchValue);
    const count = await this.service.count(searchValue);
    return { status: 'success', data: result, meta: { count, page } };
  }

  @Authorized()
  @Post(`/${path}`)
  async post(
    @CurrentUser() user: ICurrentUser,
    @Body({ validate: true }) body: BookmarkCreateDto
  ) {
    const userId = new mongoose.mongo.ObjectId(user._id);
    const data = { ...body, userId };
    const result = await this.service.create(data);
    return { status: 'success', data: result };
  }

  @Authorized()
  @Delete(`/${path}/:id`)
  async remove(
    @CurrentUser() user: ICurrentUser,
    @Param('id') id: string,
  ) {
    const result = await this.service.deleteOwnBookmark(id, user._id);
    return { status: 'success', data: result };
  }
}

export default BookmarkController;