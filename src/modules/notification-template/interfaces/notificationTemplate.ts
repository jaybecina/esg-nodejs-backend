export enum NotificationLevel {
    info = 'info',
    warning = 'warning',
}

export interface INotificationTemplate {
    _id: string,
    name: string,
    uniqueId: string,
    description: string,
    level: NotificationLevel,
    label: string,
    header: string,
    content: string,
    variables: string[],
}
