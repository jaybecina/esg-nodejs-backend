import { Authorized, Body, CurrentUser, Delete, Get, JsonController, Param, Post, Put, QueryParams } from 'routing-controllers';
import { ICurrentUser, Roles } from '../auth/interfaces/auth';
import { FormTemplateGetParams, FormTemplatePostDto } from './interfaces/dto';
import FromTemplateService from './service'
import MaterialService from "../material/service";
import UserActivityLogService from '../user-activity-log/service';
import { addFormTemplateEvent, deleteFormTemplateEvent, editFormTemplateEvent } from '../user-activity-log/template/formTemplate';

const path = 'form-template';

@JsonController()
class FormTemplateController {
    private service: FromTemplateService;
    private materialService: MaterialService;
    private userActivityLogService: UserActivityLogService;

    constructor() {
        this.service = new FromTemplateService();
        this.materialService = new MaterialService();
        this.userActivityLogService = new UserActivityLogService();
    }

    @Authorized([Roles.superAdmin])
    @Get(`/${path}`)
    async getAll(@QueryParams() query: FormTemplateGetParams) {
        const { page, limit, search, filters, sort } = query;

        const searchValue = {
            ...filters,
            $or: [
                { name: new RegExp(search, 'i') },
                { uniqueId: new RegExp(search, 'i') },
            ]
        }

        const result = await this.service.read(page, limit, null, searchValue, sort);
        const count = await this.service.count(searchValue);

        return { status: 'success', data: result, meta: { count, page } };
    }

    @Authorized([Roles.superAdmin])
    @Get(`/${path}/:id`)
    async getOne(@Param('id') id: string) {
        const result = await this.service.readOne(id);
        if (!result) throw new Error('Entry not found.');

        return { status: 'success', data: result, meta: {} };
    }

    @Authorized([Roles.superAdmin])
    @Post(`/${path}`)
    async post(
        @Body() body: FormTemplatePostDto,
        @CurrentUser() user: ICurrentUser,
    ) {
        // ensure all materials are latest
        const oldMaterials = await this.materialService.findNotLatestMaterials(body.materials);
        if (oldMaterials.length > 0) {
            const oldMaterialsNameString = oldMaterials
                .map((material) => material.name)
                .join(', ');
            throw new Error(`${oldMaterialsNameString} are not latest materials`);
        }

        const result = await this.service.create(body);

        await this.userActivityLogService.create({
            userId: user._id,
            resourceId: result,
            data: body,
            ...addFormTemplateEvent,
        });

        return { status: 'success', data: result };
    }

    @Authorized([Roles.superAdmin])
    @Put(`/${path}/:id`)
    async put(
        @Param('id') id: string,
        @Body({ validate: true }) body: FormTemplatePostDto,
        @CurrentUser() user: ICurrentUser,
    ) {
        // ensure all materials are latest
        const oldMaterials = await this.materialService.findNotLatestMaterials(body.materials);
        if (oldMaterials.length > 0) {
            const oldMaterialsNameString = oldMaterials
                .map((material) => material.name)
                .join(', ');
            throw new Error(`${oldMaterialsNameString} are not latest materials`);
        }

        const result = await this.service.update(id, body);

        await this.userActivityLogService.create({
            userId: user._id,
            resourceId: id,
            data: body,
            ...editFormTemplateEvent,
        });

        return { status: 'success', data: result };
    }

    @Authorized([Roles.superAdmin])
    @Delete(`/${path}/:id`)
    async delete(
        @Param('id') id: string,
        @CurrentUser() user: ICurrentUser,
    ) {
        const oldFormTemplate = await this.service.readOne(id);

        const result = await this.service.delete(id);

        await this.userActivityLogService.create({
            userId: user._id,
            resourceId: id,
            data: oldFormTemplate,
            ...deleteFormTemplateEvent,
        });

        return { status: 'success', data: result };
    }
}

export default FormTemplateController;
