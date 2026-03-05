import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { useUpdateProject, useDeleteProject } from '@/features/projects/hooks/useProjectMutations';
import { toIsoDate } from '@/shared/lib/date-engine';
import type { TaskRow } from '@/shared/db/app.types';

const editProjectSchema = z.object({
 title: z.string().min(1, 'Title is required'),
 description: z.string().optional(),
 start_date: z.string().min(1, 'Start date is required'),
 location: z.string().optional(),
 due_soon_threshold: z.coerce.number().min(1).max(30)
});

type EditProjectFormData = z.infer<typeof editProjectSchema>;

interface EditProjectModalProps {
 project: TaskRow;
 isOpen: boolean;
 onClose: () => void;
}

export default function EditProjectModal({ project, isOpen, onClose }: EditProjectModalProps) {
 const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
 const navigate = useNavigate();
 const updateProjectMutation = useUpdateProject();
 const deleteProjectMutation = useDeleteProject();

 // The raw typed database row `settings` might be loose JSON, so explicitly cast what we expect internally
 const currentSettings = project.settings as Record<string, unknown> || {};

 const {
 register,
 handleSubmit,
 formState: { errors, isSubmitting },
 } = useForm<EditProjectFormData>({
 // @ts-expect-error Zod schema mismatches slightly with final form data type
 resolver: zodResolver(editProjectSchema),
 defaultValues: {
 title: project.title || '',
 description: project.description || undefined,
 start_date: toIsoDate(project.start_date || project.created_at) || '',
 location: project.location || undefined,
 due_soon_threshold: typeof currentSettings.due_soon_threshold === 'number' ? currentSettings.due_soon_threshold : 3,
 }
 });

 const onSubmit: SubmitHandler<EditProjectFormData> = async (data) => {
 try {
 const oldStartDate = toIsoDate(project.start_date || project.created_at);
 const { due_soon_threshold, ...rest } = data;

 const updateData = {
 ...rest,
 settings: {
 ...currentSettings,
 due_soon_threshold
 }
 };

 await updateProjectMutation.mutateAsync({ 
 projectId: project.id, 
 updates: updateData as Record<string, unknown>, 
 oldStartDate 
 });
 onClose();
 } catch (error) {
 console.error('[EditProjectModal] Failed to update project:', error);
 // Error is surfaced via parent's toast/error handling
 }
 };

 return (
 <Dialog open={isOpen} onOpenChange={onClose}>
 <DialogContent className="sm:max-w-[500px]">
 <DialogHeader>
 <DialogTitle>Project Settings</DialogTitle>
 </DialogHeader>

 <div className="space-y-6 py-4">
 <div className="space-y-4">
 <Label className="text-sm font-semibold text-slate-500 uppercase tracking-wider">General</Label>
 <div className="grid gap-2">
 <Label htmlFor="title">Project Title</Label>
 <Input
 id="title"
 {...register('title')}
 className={errors.title ? 'border-red-500' : ''}
 />
 {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
 </div>

 <div className="grid gap-2">
 <Label htmlFor="description">Description</Label>
 <Textarea
 id="description"
 {...register('description')}
 rows={2}
 />
 </div>

 <div className="grid gap-2">
 <Label htmlFor="location">Location</Label>
 <Input
 id="location"
 {...register('location')}
 placeholder="e.g. Seattle, WA"
 />
 </div>
 </div>

 <div className="space-y-4">
 <Label className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Configuration</Label>
 <div className="grid gap-2">
 <Label htmlFor="due_soon_threshold">&quot;Due Soon&quot; Threshold (Days)</Label>
 <Input
 type="number"
 id="due_soon_threshold"
 {...register('due_soon_threshold')}
 min="1"
 max="30"
 />
 {errors.due_soon_threshold && <p className="text-sm text-red-500">{errors.due_soon_threshold.message}</p>}
 <p className="text-xs text-slate-500">Tasks due within this many days will be flagged.</p>
 </div>
 </div>

 <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
 <Label htmlFor="start_date" className="block mb-1 font-semibold text-amber-800">
 Launch Date Correction
 </Label>
 <p className="text-xs text-amber-700 mb-2">
 Changing this will shift ALL incomplete tasks in the timeline.
 </p>
 <Input
 type="date"
 id="start_date"
 {...register('start_date')}
 className={errors.start_date ? 'border-red-500' : ''}
 />
 {errors.start_date && <p className="text-sm text-red-500">{errors.start_date.message}</p>}
 </div>

 <div className="flex justify-end gap-3 pt-2">
 <Button variant="outline" onClick={onClose} type="button">Cancel</Button>
 <Button onClick={handleSubmit(onSubmit as (data: unknown) => void)} disabled={isSubmitting}>
 {isSubmitting ? 'Saving...' : 'Save Changes'}
 </Button>
 </div>

 <div className="relative py-4">
 <div className="absolute inset-0 flex items-center">
 <span className="w-full border-t border-slate-200" />
 </div>
 <div className="relative flex justify-center text-xs uppercase">
 <span className="bg-white px-2 text-slate-500">Danger Zone</span>
 </div>
 </div>

 <div className="bg-red-50 p-4 rounded-lg border border-red-200">
 <div className="flex items-center justify-between">
 <div>
 <Label className="block mb-1 font-semibold text-red-800">
 Delete Project
 </Label>
 <p className="text-xs text-red-700">
 Permanently remove this project and all its tasks.
 </p>
 </div>
 {!showDeleteConfirm ? (
 <Button
 variant="destructive"
 size="sm"
 onClick={() => setShowDeleteConfirm(true)}
 >
 Delete Project
 </Button>
 ) : (
 <div className="flex items-center gap-2">
 <span className="text-xs text-red-700 font-medium">Are you sure?</span>
 <Button
 variant="outline"
 size="sm"
 className="h-8 text-slate-600 bg-white hover:bg-slate-50 border-red-200"
 onClick={() => setShowDeleteConfirm(false)}
 >
 Cancel
 </Button>
 <Button
 variant="destructive"
 size="sm"
 className="h-8"
 onClick={async () => {
 await deleteProjectMutation.mutateAsync(project.id);
 navigate('/dashboard', { replace: true });
 }}
 >
 Yes, Delete
 </Button>
 </div>
 )}
 </div>
 </div>
 </div>
 </DialogContent>
 </Dialog>
 );
}
