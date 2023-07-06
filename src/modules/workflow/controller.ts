import { Authorized, Body, CurrentUser, Delete, Get, JsonController, Param, Post, Put, QueryParams, UploadedFile } from 'routing-controllers';
import WorkflowService from './service';
const path = 'workflow';

@JsonController()
class WorkflowController {
    private service: WorkflowService;

    constructor() {
        this.service = new WorkflowService();
    }

    @Authorized()
    @Get(`/${path}`)
    async getAll() {
        const workflow = this.service.getWorkflow();

        return { status: 'success', data: workflow }
    }

    @Authorized()
    @Get(`/${path}/permissions`)
    async getAllPermissions() {
        const permissions = this.service.getPermissions();

        return { status: 'success', data: permissions }
    }
}

export default WorkflowController;
