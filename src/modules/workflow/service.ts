import { formStatus } from '../form/interfaces/form';
import { Roles } from '../auth/interfaces/auth';


class WorkflowService {
    public getWorkflow() {
        // current status: nextStatus[]
        return {
            [formStatus.inProgress]: [formStatus.submitted],
            [formStatus.submitted]: [formStatus.completed, formStatus.error],
            [formStatus.error]: [formStatus.checkAgain],
            [formStatus.checkAgain]: [formStatus.completed, formStatus.error],
            [formStatus.completed]: [] as formStatus[],
        }
    }

    public getPermissions() {
        // which role can change to this formStatus
        // nextStatus: Roles[]
        return {
            [formStatus.inProgress]: [] as Roles[],
            [formStatus.submitted]: [Roles.user, Roles.clientAdmin, Roles.superAdmin],
            [formStatus.error]: [Roles.clientAdmin, Roles.superAdmin],
            [formStatus.checkAgain]: [Roles.user, Roles.clientAdmin, Roles.superAdmin],
            [formStatus.completed]: [Roles.clientAdmin, Roles.superAdmin],
        }
    }

    public isAcceptNextFormStatus(currStatus: formStatus, nextStatus: formStatus): boolean {
        const workflow = this.getWorkflow();
        const nextStatusArray = workflow[currStatus];

        if (!Array.isArray(nextStatusArray)) {
            return false;
        }

        return nextStatusArray.includes(nextStatus);
    }

    public isAllowToChangeFormStatus(nextStatus: formStatus, userRole: Roles): boolean {
        const permissions = this.getPermissions();
        const roleArray = permissions[nextStatus];

        if (!Array.isArray(roleArray)) {
            return false;
        }

        return roleArray.includes(userRole);
    }
}

export default WorkflowService;
