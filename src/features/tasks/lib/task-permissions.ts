import { ROLES } from '@/shared/constants';
import type { TaskRow } from '@/shared/db/app.types';
import { extractCoachingFlag } from '@/features/tasks/lib/coaching-form';

export type ProjectMembershipRole = string | null | undefined;

export function hasFullTaskEditRole(role: ProjectMembershipRole): boolean {
    return role === ROLES.OWNER || role === ROLES.EDITOR || role === ROLES.ADMIN;
}

export function canUpdateTaskProgress(role: ProjectMembershipRole, task?: Partial<TaskRow> | null): boolean {
    if (hasFullTaskEditRole(role)) return true;
    return role === ROLES.COACH
        && task?.origin === 'instance'
        && extractCoachingFlag(task);
}

export function canEditTaskContent(role: ProjectMembershipRole): boolean {
    return hasFullTaskEditRole(role);
}

export function canCreateChildTask(role: ProjectMembershipRole): boolean {
    return hasFullTaskEditRole(role);
}

export function canDeleteTask(role: ProjectMembershipRole, task?: Partial<TaskRow> | null): boolean {
    if (!hasFullTaskEditRole(role)) return false;
    return !task?.cloned_from_task_id;
}

export function canReorderTask(role: ProjectMembershipRole): boolean {
    return hasFullTaskEditRole(role);
}
