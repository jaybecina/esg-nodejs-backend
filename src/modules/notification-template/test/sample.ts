import { NotificationTemplatePostDto } from "../interfaces/dto";
import { NotificationLevel } from "../interfaces/notificationTemplate";

export const createUpdateFormRecordTemplateDto: NotificationTemplatePostDto = {
    name: "Update Form Record",
    uniqueId: "update-form-record",
    description: "When any user has updated the form, add a record in filled record",
    level: NotificationLevel.info,
    label: "",
    header: "{{username}} has updated the form",
    content: "",
    variables: [],
}

export const createVariablesTemplateDto: NotificationTemplatePostDto = {
    name: 'notice with variable',
    uniqueId: 'notice-with-variable',
    description: 'test description',
    level: NotificationLevel.info,
    label: 'NEW',
    header: 'Hello! {{name}}',
    content: '{{name}} joined.',
    variables: ['name']
}

export const createAssignUserTemplateDto: NotificationTemplatePostDto = {
    name: "Assign user to form",
    uniqueId: "assign-user-to-form",
    description: "When any user is assigned the form, add message to user",
    level: NotificationLevel.info,
    label: "NEW",
    header: "{{formName}} is assigned to you",
    content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    variables: ['formName', 'formId', 'url'],
}

export const createUserSubmitFormTemplateDto: NotificationTemplatePostDto = {
    name: "User submit form message",
    uniqueId: "user-submit-form-message",
    description: "When user submit the form, send message to client admin",
    level: NotificationLevel.info,
    label: "NEW",
    header: "{{formName}} is assigned to you",
    content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    variables: ['formName', 'formId', 'url'],
}

export const createClientAdminRejectFormTemplateDto: NotificationTemplatePostDto = {
    name: "Client admin reject form message",
    uniqueId: "client-admin-reject-form-message",
    description: "Send message to user when client admin reject the form",
    level: NotificationLevel.info,
    label: "Remind",
    header: "The {{formName}} data has some errors, please check it again",
    content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    variables: ['url', 'formId', 'formName'],
}

export const createDeadlineRemindTemplateDto: NotificationTemplatePostDto = {
    name: "Remind deadline of form message",
    uniqueId: "remind-deadline-of-form-message",
    description: "Send message to client to remind the deadline of the form is close.",
    level: NotificationLevel.info,
    label: "Remind",
    header: "{{days}} days before deadline {{deadline}} in {{formName}}",
    content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    variables: ['url', 'days', 'deadline']
}

export const requiredNotificationTemplateDtoArr: NotificationTemplatePostDto[] = [
    createUpdateFormRecordTemplateDto,
    createAssignUserTemplateDto,
    createUserSubmitFormTemplateDto,
    createClientAdminRejectFormTemplateDto,
    createDeadlineRemindTemplateDto,
]
