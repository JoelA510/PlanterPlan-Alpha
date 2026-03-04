import { useMutation, useQueryClient } from '@tanstack/react-query'
import { TaskInsert, TaskUpdate, TaskRow, TeamMemberRow } from '@/shared/db/app.types'
import { planter as planterClient } from '@/shared/api/planterClient'

// We use TaskInsert/TaskUpdate but sometimes hooks pass custom subsets
interface TaskMutationPayload extends Partial<TaskUpdate> {
 id: string;
 root_id?: string;
}

export function useCreateTask() {
 const queryClient = useQueryClient()
 return useMutation<TaskRow, Error, TaskInsert | TaskInsert[]>({
 mutationFn: (data) => planterClient.entities.Task.create(data),
 onSettled: (_, _error, variables) => {
 const firstVar = Array.isArray(variables) ? variables[0] : variables;
 const rootId = typeof firstVar === 'object' && firstVar && 'root_id' in firstVar ? firstVar.root_id : undefined;
 if (rootId) {
 queryClient.invalidateQueries({ queryKey: ['projectHierarchy', rootId] })
 } else {
 queryClient.invalidateQueries({ queryKey: ['tasks', 'root'] })
 }
 }
 })
}

type UpdateTaskContext = { 
 previousTasks?: TaskRow[]; 
 previousTaskInfo?: TaskRow; 
 rootId?: string | null; 
 updatedTaskId: string; 
};

export function useUpdateTask() {
 const queryClient = useQueryClient()
 return useMutation<TaskRow, Error, TaskMutationPayload, UpdateTaskContext>({
 mutationFn: (data) => planterClient.entities.Task.update(data.id, data),
 onMutate: async (updatedTask) => {
 const rootId = updatedTask.root_id;
 const targetKey = rootId ? ['projectHierarchy', rootId] : ['tasks', 'root'];

 await queryClient.cancelQueries({ queryKey: targetKey });
 await queryClient.cancelQueries({ queryKey: ['task', updatedTask.id] });

 const previousTasks = queryClient.getQueryData<TaskRow[]>(targetKey);
 const previousTaskInfo = queryClient.getQueryData<TaskRow>(['task', updatedTask.id]);

 if (previousTasks) {
 queryClient.setQueryData<TaskRow[]>(targetKey, (old) => {
 if (!Array.isArray(old)) return old;
 return old.map(task =>
 task.id === updatedTask.id
 ? { ...task, ...updatedTask }
 : task
 );
 });
 }
 if (previousTaskInfo) {
 queryClient.setQueryData<TaskRow>(['task', updatedTask.id], (old) => (old ? { ...old, ...updatedTask } : undefined));
 }

 return { previousTasks, previousTaskInfo, rootId, updatedTaskId: updatedTask.id };
 },
 onError: (_err, _newTodo, context) => {
 if (!context) return;
 const ctx = context;
 const targetKey = ctx.rootId ? ['projectHierarchy', ctx.rootId] : ['tasks', 'root'];
 if (ctx?.previousTasks) {
 queryClient.setQueryData(targetKey, ctx.previousTasks);
 }
 if (ctx?.previousTaskInfo) {
 queryClient.setQueryData(['task', ctx.updatedTaskId], ctx.previousTaskInfo);
 }
 },
 onSettled: (_, _error, variables) => {
 const rootId = variables.root_id;
 if (rootId) {
 queryClient.invalidateQueries({ queryKey: ['projectHierarchy', rootId] })
 } else {
 queryClient.invalidateQueries({ queryKey: ['tasks', 'root'] })
 }
 queryClient.invalidateQueries({ queryKey: ['task', variables.id] })
 }
 })
}

type DeleteTaskContext = { previousTasks?: TaskRow[]; rootId?: string | null; };

export function useDeleteTask() {
 const queryClient = useQueryClient()
 return useMutation<boolean, Error, { id: string, root_id?: string | null }, DeleteTaskContext>({
 mutationFn: (data) => planterClient.entities.Task.delete(data.id),
 onMutate: async (variables) => {
 const { id, root_id: rootId } = variables;
 const targetKey = rootId ? ['projectHierarchy', rootId] : ['tasks', 'root'];

 await queryClient.cancelQueries({ queryKey: targetKey });

 const previousTasks = queryClient.getQueryData<TaskRow[]>(targetKey);

 if (previousTasks) {
 queryClient.setQueryData<TaskRow[]>(targetKey, (old) => {
 if (!Array.isArray(old)) return old;
 return old.filter(task => task.id !== id);
 });
 }

 return { previousTasks, rootId };
 },
 onError: (_err, _variables, context) => {
 if (!context) return;
 const ctx = context;
 const targetKey = ctx.rootId ? ['projectHierarchy', ctx.rootId] : ['tasks', 'root'];
 if (ctx?.previousTasks) {
 queryClient.setQueryData(targetKey, ctx.previousTasks);
 }
 },
 onSettled: (_, _error, variables) => {
 const rootId = variables.root_id;
 if (rootId) {
 queryClient.invalidateQueries({ queryKey: ['projectHierarchy', rootId] })
 } else {
 queryClient.invalidateQueries({ queryKey: ['tasks', 'root'] })
 }
 queryClient.removeQueries({ queryKey: ['task', variables.id] })
 }
 })
}

export function useAssignTaskMember() {
 const queryClient = useQueryClient()
 return useMutation<{ data: TeamMemberRow | undefined, error: Error | null }, Error, { taskId: string, userId: string, root_id?: string | null }>({
 mutationFn: (data) => {
 if (planterClient.entities.Task.addMember) {
 return planterClient.entities.Task.addMember(data.taskId, data.userId, 'viewer');
 }
 throw new Error('Task.addMember is not defined');
 },
 onSuccess: (_, variables) => {
 const rootId = variables.root_id;
 if (rootId) {
 queryClient.invalidateQueries({ queryKey: ['projectHierarchy', rootId] })
 } else {
 queryClient.invalidateQueries({ queryKey: ['tasks', 'root'] })
 }
 }
 })
}
