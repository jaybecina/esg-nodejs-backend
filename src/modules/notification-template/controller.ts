import { Authorized, Body, Delete, Get, JsonController, Param, Post, Put, QueryParams } from 'routing-controllers';
import { Roles } from '../auth/interfaces/auth';
import { NotificationTemplateGetParams, NotificationTemplatePostDto } from './interfaces/dto';
import NotificationTemplateService from './service';

const path = 'notification-template';

@JsonController()
class NotificationTemplateController {
    private service: NotificationTemplateService;

    constructor() {
        this.service = new NotificationTemplateService();
    }

    @Authorized()
    @Get(`/${path}`)
    async getAll(@QueryParams() query: NotificationTemplateGetParams) {
        const { page, limit, search, filters } = query;

        const searchValue = {
            ...filters,
            $or: [
                { name: new RegExp(search, 'i') },
                { uniqueId: new RegExp(search, 'i') },
            ]
        }

        const result = await this.service.read(page, limit, null, searchValue);
        const count = await this.service.count(searchValue);
        return { status: 'success', data: result, meta: { count, page } };
    }

    @Authorized()
    @Get(`/${path}/:id`)
    async getOne(@Param('id') id: string) {
        const result = await this.service.readOne(id);
        return { status: 'success', data: result };
    }

    @Authorized([Roles.superAdmin])
    @Post(`/${path}`)
    async post(@Body() body: NotificationTemplatePostDto) {
        const result = await this.service.create(body);
        return { status: 'success', data: result };
    }

    @Authorized([Roles.superAdmin])
    @Put(`/${path}/:id`)
    async put(@Param('id') id: string, @Body() body: Partial<NotificationTemplatePostDto>) {
        const result = await this.service.update(id, body);
        return { status: 'success', data: result };
    }

    @Authorized([Roles.superAdmin])
    @Delete(`/${path}/:id`)
    async remove(@Param('id') id: string) {
        const result = await this.service.delete(id);
        return { status: 'success', data: result };
    }
}

export default NotificationTemplateController;
