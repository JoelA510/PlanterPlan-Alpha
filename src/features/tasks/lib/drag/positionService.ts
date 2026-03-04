import { planter } from '@/shared/api/planterClient';
import { POSITION_STEP } from '@/shared/constants';

const MIN_GAP = 2;

/**
 * Calculates a new position between two existing positions.
 * Returns null if renormalization is needed.
 */
export const calculateNewPosition = (
 prevPos: number | null | undefined,
 nextPos: number | null | undefined
): number | null => {
 const previous = Number(prevPos ?? 0);
 const hasNext = nextPos !== undefined && nextPos !== null;
 const next = hasNext ? Number(nextPos) : previous + POSITION_STEP * 2;

 if (next - previous < MIN_GAP) {
 return null;
 }

 return Math.floor((previous + next) / 2);
};

/** A single task position update record. */
export interface TaskPositionUpdate {
 id: string;
 position: number;
 parent_task_id?: string | null;
 start_date?: string;
 [key: string]: unknown;
}

/**
 * Renormalizes positions for a list of tasks to restore proper spacing.
 */
export const renormalizePositions = async (
 parentId: string | null,
 origin: string,
 userId: string
): Promise<Record<string, unknown>[]> => {
 const filters: Record<string, unknown> = {
 origin,
 creator: userId,
 parent_task_id: parentId || null,
 };

 const tasks = await planter.entities.Task.filter(filters);
 if (!tasks) return [];

 (tasks as Array<Record<string, unknown>>).sort(
 (a, b) => ((a.position as number) || 0) - ((b.position as number) || 0)
 );

 const updatedTasks = (tasks as Array<Record<string, unknown>>).map((task, index) => ({
 ...task,
 position: (index + 1) * POSITION_STEP,
 }));

 const updates = (updatedTasks as any[]).map((task) => ({
 id: task.id as string,
 position: task.position as number,
 }));

 const { error: updateError } = await planter.entities.Task.upsert(updates as any);

 if (updateError) {
 console.error('Renormalization update failed', updateError);
 throw updateError;
 }

 return updatedTasks;
};

/**
 * Updates a single task's position, handling renormalization if necessary.
 */
export const updateTaskPosition = async (
 taskId: string,
 newPosition: number,
 parentId: string | null
): Promise<void> => {
 const updates = {
 position: newPosition,
 parent_task_id: parentId,
 };

 try {
 await planter.entities.Task.update(taskId, updates as any);
 } catch (error) {
 console.error('Failed to update task position:', error);
 throw error;
 }
};

/**
 * Batch updates multiple tasks. Useful for drag & drop with date propagation.
 */
export const updateTasksBatch = async (updates: TaskPositionUpdate[]): Promise<void> => {
 if (!updates || updates.length === 0) return;

 try {
 const updatePromises = updates.map(({ id, ...data }) =>
 planter.entities.Task.update(id, data as any)
 );

 await Promise.all(updatePromises);
 } catch (error) {
 console.error('Failed to batch update tasks:', error);
 throw error;
 }
};
