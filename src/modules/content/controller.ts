import { Authorized, Body, CurrentUser, Delete, Get, JsonController, Param, Post, Put, QueryParam } from 'routing-controllers';
import { ICurrentUser, Roles } from '../auth/interfaces/auth';
import { ContentCreateDto } from './interfaces/dto';
import { ContentCategory } from './interfaces/content';
import ContentService from './service';
import UserActivityLogService from '../user-activity-log/service';
import slugify from 'slugify';
import { addContentEvent, deleteContentEvent, editContentEvent } from '../user-activity-log/template/content';

const path = 'content';

@JsonController()
class ContentController {
  private service: ContentService;
  private userActivityLogService: UserActivityLogService;

  constructor() {
    this.service = new ContentService();
    this.userActivityLogService = new UserActivityLogService();
  }

  @Get(`/${path}`)
  async getAll(
    @QueryParam('page', { required: false }) page: number = 1,
    @QueryParam('limit', { required: false }) limit: number = 10,
  ) {
    const result = await this.service.read(page, limit);
    const count = await this.service.count();
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
    @Body() body: ContentCreateDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    if (!body.slug) 
      body.slug = await this.service.generateUniqueSlug(body.title);

    if (body.category === ContentCategory.translation) {
      const count = await this.service.count({
        title: body.title,
        category: ContentCategory.translation,
      })

      if (count > 0) {
        throw new Error("Can't create duplicate translation");
      }
    }

    let data = body;
    if (data.customFields) {
      delete data.customFields[''];
    }

    const result = await this.service.create(data);

    // exclude translation
    if (data.category !== ContentCategory.translation) {
      await this.userActivityLogService.create({
        userId: user._id,
        resourceId: result,
        data: data,
        ...addContentEvent,
      });
    }

    return { status: 'success', data: result };
  }

  @Authorized([Roles.superAdmin])
  @Put(`/${path}/:id`)
  async put(
    @Param('id') id: string,
    @Body() body: Partial<ContentCreateDto>,
    @CurrentUser() user: ICurrentUser,
  ) {
    const originalContent = await this.service.readOne(id);

    if (body.category === ContentCategory.translation || originalContent.category === ContentCategory.translation && !body.category) {
      const contents = await this.service.read(1, 0, null, {
        title: body.title,
        category: ContentCategory.translation,
      })

      if (contents.length > 0) {
        for (const content of contents) {
          if (content._id !== id) {
            throw new Error("Can't create duplicate translation");
          }
        }
      }
    }

    let data = body;
    if (data.customFields) {
      delete data.customFields[''];
    }

    const result = await this.service.update(id, data);

    // exclude translation
    if (data.category !== ContentCategory.translation) {
      await this.userActivityLogService.create({
        userId: user._id,
        resourceId: id,
        data: data,
        ...editContentEvent,
      });
    }

    return { status: 'success', data: result };
  }

  @Authorized([Roles.superAdmin])
  @Delete(`/${path}/:id`)
  async remove(@Param('id') id: string, @CurrentUser() user: ICurrentUser) {
    const content = await this.service.readOne(id);

    const result = await this.service.delete(id);

    // exclude translation
    if (content.category !== ContentCategory.translation) {
      await this.userActivityLogService.create({
        userId: user._id,
        resourceId: id,
        data: content,
        ...deleteContentEvent,
      });
    }

    return { status: 'success', data: result };
  }
}

export default ContentController;