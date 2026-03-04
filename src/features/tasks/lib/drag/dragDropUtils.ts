import { calculateNewPosition } from './positionService';

/** Minimal task shape used by drag/drop calculations. */
export interface DragTask {
    id: string;
    parent_task_id?: string | null;
    position?: number | null;
    origin?: string;
    status?: string;
    title?: string;
    start_date?: string | null;
}

/** DndKit active/over item shape. */
interface DndKitItem {
    id: string;
    data?: {
        current?: {
            type?: string;
            status?: string;
            parentId?: string | null;
            origin?: string;
            isColumn?: boolean;
            [key: string]: unknown;
        };
    };
}

/** Result of calculateDropTarget. */
export interface DropTargetResult {
    isValid: boolean;
    newPos?: number | null;
    newParentId?: string | null;
}

/**
 * Calculates the valid drop target and new position for a dragged task.
 */
export const calculateDropTarget = (
    allTasks: DragTask[],
    active: DndKitItem,
    over: DndKitItem,
    activeOrigin: string | undefined
): DropTargetResult => {
    const activeId = active.id;
    const overId = over.id;
    const activeTask = allTasks.find((t) => t.id === activeId);

    if (!activeTask) return { isValid: false };

    // 1. Determine new parent and origin based on drop target ID
    let newParentId: string | null = null;
    let targetOrigin: string | null | undefined = null;
    const overData = over.data?.current || {};

    if (overData.type === 'container') {
        newParentId = (overData.parentId as string) ?? null;
        targetOrigin = overData.origin;

        if (newParentId && !allTasks.find((t) => t.id === newParentId)) {
            // Trust overData.parentId from valid droppable
        }
    } else {
        const overTask = allTasks.find((t) => t.id === overId);
        if (overTask) {
            newParentId = overTask.parent_task_id ?? null;
            targetOrigin = overTask.origin;
        } else {
            return { isValid: false };
        }
    }

    // 1b. Circular Ancestry Check
    if (newParentId) {
        let ancestorId: string | null = newParentId;
        let depth = 0;
        while (ancestorId && depth < 100) {
            if (ancestorId === activeId) {
                console.warn('Cannot drop a parent into its own child (Circular dependency detected)');
                return { isValid: false };
            }

            const ancestor = allTasks.find((t) => t.id === ancestorId);
            ancestorId = ancestor ? (ancestor.parent_task_id || null) : null;
            depth++;
        }
    }

    // 2. Validate Origin
    if (activeOrigin !== targetOrigin) {
        return { isValid: false };
    }

    // 3. Filter & Sort Siblings
    const siblings = allTasks
        .filter((t) => (t.parent_task_id ?? null) === newParentId && t.origin === activeOrigin)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    const activeIndex = siblings.findIndex((t) => t.id === activeId);
    const overIndex = siblings.findIndex((t) => t.id === overId);

    // 4. Determine prev/next neighbors
    let prevTask: DragTask | undefined;
    let nextTask: DragTask | undefined;
    const isContainerDrop = overData.type === 'container';

    if (isContainerDrop) {
        if (siblings.length > 0) {
            if (activeIndex === -1) {
                prevTask = siblings[siblings.length - 1];
                nextTask = undefined;
            } else {
                prevTask = siblings[siblings.length - 1];
                nextTask = undefined;
            }
        } else {
            prevTask = undefined;
            nextTask = undefined;
        }
    } else {
        if (activeIndex !== -1 && activeIndex < overIndex) {
            prevTask = siblings[overIndex];
            nextTask = siblings[overIndex + 1];
        } else {
            prevTask = siblings[overIndex - 1];
            nextTask = siblings[overIndex];
        }
    }

    const prevPos = prevTask ? (prevTask.position ?? 0) : 0;
    const nextPos = nextTask ? (nextTask.position ?? 0) : null;

    // 5. Calculate New Position
    const newPos = calculateNewPosition(prevPos, nextPos);

    return { isValid: true, newPos, newParentId };
};
