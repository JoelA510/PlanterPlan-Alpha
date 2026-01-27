import { useCallback, useState } from 'react';
import { useTaskForm } from '@features/tasks/hooks/useTaskForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@shared/ui/dialog';
import { Button } from '@shared/ui/button';
import { Label } from '@shared/ui/label';
import { Input } from '@shared/ui/input';
import { Textarea } from '@shared/ui/textarea';
import { useProjectMutations } from '@features/projects/hooks/useProjectMutations';
import { toIsoDate } from '@shared/lib/date-engine';

export default function EditProjectModal({ project, isOpen, onClose }) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const { updateProject: updateProjectMutation, deleteProject } = useProjectMutations({
        tasks: [],
        fetchTasks: () => window.location.reload()
    });

    const currentSettings = project.settings || {};

    const initialState = {
        title: project.title || project.name || '',
        description: project.description || '',
        start_date: toIsoDate(project.start_date || project.created_at),
        location: project.location || '',
        due_soon_threshold: currentSettings.due_soon_threshold || '3',
    };

    const validate = useCallback((data) => {
        const errors = {};
        if (!data.title?.trim()) errors.title = 'Title is required';
        if (!data.start_date) errors.start_date = 'Start date is required';
        return errors;
    }, []);

    const {
        formData,
        errors,
        isSubmitting,
        handleChange,
        handleSubmit
    } = useTaskForm(initialState, validate);

    const onSubmit = async (data) => {
        const oldStartDate = toIsoDate(project.start_date || project.created_at);
        const { due_soon_threshold, ...rest } = data;

        const updateData = {
            ...rest,
            settings: {
                ...currentSettings,
                due_soon_threshold: parseInt(due_soon_threshold, 10) || 3
            }
        };

        await updateProjectMutation(project.id, updateData, oldStartDate);
        onClose();
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
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                className={errors.title ? 'border-red-500' : ''}
                            />
                            {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={2}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="location">Location</Label>
                            <Input
                                id="location"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
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
                                name="due_soon_threshold"
                                value={formData.due_soon_threshold}
                                onChange={handleChange}
                                min="1"
                                max="30"
                            />
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
                            name="start_date"
                            value={formData.start_date}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={onClose} type="button">Cancel</Button>
                        <Button onClick={(e) => handleSubmit(e, onSubmit)} disabled={isSubmitting}>
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
                                        size="xs"
                                        className="h-8 text-slate-600 bg-white hover:bg-slate-50 border-red-200"
                                        onClick={() => setShowDeleteConfirm(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="xs"
                                        className="h-8"
                                        onClick={async () => {
                                            await deleteProject(project.id);
                                            window.location.href = '/dashboard'; // Force redirect
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
