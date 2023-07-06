import { Authorized, Body, BodyParam, CurrentUser, Delete, Get, JsonController, Param, Post, Put, QueryParam, QueryParams } from 'routing-controllers';
import { ICurrentUser, Roles } from '../auth/interfaces/auth';
import { NotificationPostDto } from './interfaces/dto';
import { ReceiverType } from './interfaces/notification';
import NotificationService from './service';

const path = 'notification';

@JsonController()
class NotificationController {
    private service: NotificationService;

    constructor() {
        this.service = new NotificationService();
    }

    @Authorized([Roles.superAdmin])
    @Post(`/${path}`)
    async post(
        @CurrentUser() user: ICurrentUser,
        @Body() body: NotificationPostDto,
    ) {
        const notification = await this.service.trigger({
            uniqueId: body.uniqueId,
            receiver: body.receiver,
            receiverType: ReceiverType.user,
            payload: body.payload,
            createdBy: user._id,
        })

        return { status: 'success', data: notification._id.toString() };
    }
}

export default NotificationController
