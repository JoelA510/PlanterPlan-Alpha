import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Switch } from '@/shared/ui/switch';
import { useUpdateProject, useDeleteProject, useUpdateProjectStatus } from '@/features/projects/hooks/useProjectMutations';
import { toIsoDate } from '@/shared/lib/date-engine';
import { PROJECT_STATUS } from '@/shared/constants/domain';
import type { TaskRow } from '@/shared/db/app.types';
import { toast } from 'sonner';

const editProjectSchema = z.object({
 title: z.string().min(1, 'Title is required'),
 description: z.string().optional(),
 start_date: z.string().min(1, 'Start date is required'),
 due_date: z.string().optional(),
 due_soon_threshold: z.coerce.number().min(1).max(30),
 supervisor_email: z.string().email('Enter a valid email').optional().or(z.literal('')),
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
 const updateStatusMutation = useUpdateProjectStatus();
 const isTemplate = project.origin === 'template';
 const isArchived = project.status === PROJECT_STATUS.ARCHIVED;

 const handleArchiveToggle = async () => {
  const nextStatus = isArchived ? PROJECT_STATUS.IN_PROGRESS : PROJECT_STATUS.ARCHIVED;
  try {
   await updateStatusMutation.mutateAsync({ projectId: project.id, status: nextStatus });
   toast.success(isArchived ? 'Project unarchived.' : 'Project archived.');
   onClose();
  } catch (error) {
   console.error('[EditProjectModal] Failed to toggle archive:', error);
   toast.error('Failed to update archive status.');
  }
 };

 // The raw typed database row `settings` might be loose JSON, so explicitly cast what we expect internally
 const currentSettings = (project.settings as Record<string, unknown>) || {};
 const [isPublished, setIsPublished] = useState(currentSettings.published === true);

 const {
  register,
  handleSubmit,
  formState: { errors, isSubmitting },
 } = useForm<EditProjectFormData>({
  // z.coerce.number() produces an input/output type mismatch in zodResolver's generic — known limitation.
  // @ts-expect-error Zod schema mismatches slightly with final form data type
  resolver: zodResolver(editProjectSchema),
  defaultValues: {
   title: project.title || '',
   description: project.description || undefined,
   start_date: toIsoDate(project.start_date || project.created_at) || '',
   due_date: toIsoDate(project.due_date) || '',
   due_soon_threshold:
    typeof currentSettings.due_soon_threshold === 'number'
     ? currentSettings.due_soon_threshold
     : 3,
   supervisor_email: project.supervisor_email || '',
  },
 });

 const onSubmit = async (data: EditProjectFormData) => {
  try {
   const oldStartDate = toIsoDate(project.start_date || project.created_at);
   const { due_soon_threshold, due_date, supervisor_email, ...rest } = data;

   const updateData = {
    ...rest,
    due_date: due_date ? due_date : null,
    supervisor_email: supervisor_email ? supervisor_email : null,
    settings: {
     ...currentSettings,
     due_soon_threshold,
     ...(isTemplate ? { published: isPublished } : {}),
    },
   };

   const result = await updateProjectMutation.mutateAsync({
    projectId: project.id,
    updates: updateData as Record<string, unknown>,
    oldStartDate,
   });
   if (result.shiftedCount > 0) {
    toast.success(`Project saved. ${result.shiftedCount} task${result.shiftedCount === 1 ? '' : 's'} rescheduled.`);
   } else {
    toast.success('Project settings saved.');
   }
   onClose();
  } catch (error) {
   console.error('[EditProjectModal] Failed to update project:', error);
   // Error is surfaced via parent's toast/error handling
  }
 };

 return (
  <Dialog open={isOpen} onOpenChange={onClose}>
   <DialogContent data-testid="edit-project-modal" className="sm:max-w-[500px]">
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
       <Textarea id="description" {...register('description')} rows={2} />
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
       {errors.due_soon_threshold && (
        <p className="text-sm text-red-500">{errors.due_soon_threshold.message}</p>
       )}
       <p className="text-xs text-slate-500">Tasks due within this many days will be flagged.</p>
      </div>

      {!isTemplate && (
       <div className="grid gap-2">
        <Label htmlFor="supervisor_email">Supervisor Email</Label>
        <Input
         type="email"
         id="supervisor_email"
         placeholder="supervisor@example.com"
         {...register('supervisor_email')}
         className={errors.supervisor_email ? 'border-red-500' : ''}
        />
        {errors.supervisor_email && (
         <p className="text-sm text-red-500">{errors.supervisor_email.message}</p>
        )}
        <p className="text-xs text-slate-500">
         Optional. Receives the monthly Project Status Report on the 2nd of each month.
        </p>
       </div>
      )}

      {isTemplate && (
       <div className="flex items-center justify-between py-2">
        <div>
         <Label htmlFor="published-toggle" className="font-medium">Published</Label>
         <p className="text-xs text-slate-500 mt-0.5">Published templates are visible to all users in the library.</p>
        </div>
        <Switch
         id="published-toggle"
         checked={isPublished}
         onCheckedChange={setIsPublished}
        />
       </div>
      )}
     </div>

     <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 space-y-4">
      <div>
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

      <div>
       <Label htmlFor="due_date" className="block mb-1 font-semibold text-amber-800">
        Project Due Date
       </Label>
       <Input type="date" id="due_date" {...register('due_date')} />
      </div>
     </div>

     <div className="flex justify-end gap-3 pt-2">
      <Button variant="outline" onClick={onClose} type="button">
       Cancel
      </Button>
      <Button onClick={handleSubmit(onSubmit as (data: unknown) => void)} disabled={isSubmitting}>
       {isSubmitting ? 'Saving...' : 'Save Changes'}
      </Button>
     </div>

     {!isTemplate && (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
       <div className="flex items-center justify-between gap-3">
        <div>
         <Label className="block mb-1 font-semibold text-amber-800">
          {isArchived ? 'Unarchive Project' : 'Archive Project'}
         </Label>
         <p className="text-xs text-amber-700">
          {isArchived
           ? 'Restore this project to the active list. No descendants are touched.'
           : 'Hide this project from the active menu and switcher. Reversible; no descendants are touched.'}
         </p>
        </div>
        <Button
         variant="outline"
         size="sm"
         data-testid="archive-project-btn"
         onClick={handleArchiveToggle}
         disabled={updateStatusMutation.isPending}
         className="border-amber-300 text-amber-800 hover:bg-amber-100"
        >
         {updateStatusMutation.isPending
          ? (isArchived ? 'Unarchiving…' : 'Archiving…')
          : (isArchived ? 'Unarchive' : 'Archive')}
        </Button>
       </div>
      </div>
     )}

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
        <Label className="block mb-1 font-semibold text-red-800">Delete Project</Label>
        <p className="text-xs text-red-700">Permanently remove this project and all its tasks.</p>
       </div>
       {!showDeleteConfirm ? (
        <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
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
