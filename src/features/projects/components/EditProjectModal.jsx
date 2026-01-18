import { useCallback } from 'react';
import { useTaskForm } from '@features/tasks/hooks/useTaskForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@shared/ui/dialog';
import { Button } from '@shared/ui/button';
import { Label } from '@shared/ui/label';
import { Input } from '@shared/ui/input';
import { Textarea } from '@shared/ui/textarea';
import { useProjectMutations } from '@features/projects/hooks/useProjectMutations';
import { toIsoDate } from '@shared/lib/date-engine';

export default function EditProjectModal({ project, isOpen, onClose }) {
    const { updateProject: updateProjectMutation } = useProjectMutations({
        tasks: [],
        fetchTasks: () => window.location.reload() // Or use context refresh if available
    });

    const initialState = {
        title: project.title || project.name || '',
        description: project.description || '',
        start_date: toIsoDate(project.start_date || project.created_at),
        location: project.location || '',
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
        // Pass oldStartDate to trigger recalculation if needed
        const oldStartDate = toIsoDate(project.start_date || project.created_at);
        await updateProjectMutation(project.id, data, oldStartDate);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Edit Project Settings</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div>
                        <Label htmlFor="title">Project Title</Label>
                        <Input
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            className={errors.title ? 'border-red-500' : ''}
                        />
                        {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
                    </div>

                    <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={3}
                        />
                    </div>

                    <div>
                        <Label htmlFor="location">Location</Label>
                        <Input
                            id="location"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            placeholder="e.g. Seattle, WA"
                        />
                    </div>

                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                        <Label htmlFor="start_date" className="block mb-1 font-semibold text-amber-800">
                            Project Start Date
                        </Label>
                        <p className="text-xs text-amber-700 mb-2">
                            Changing this will shift ALL incomplete tasks by the difference in days.
                        </p>
                        <Input
                            type="date"
                            id="start_date"
                            name="start_date"
                            value={formData.start_date}
                            onChange={handleChange}
                        />
                        {errors.start_date && <p className="text-sm text-red-500 mt-1">{errors.start_date}</p>}
                    </div>

                    <div className="flex justify-end gap-3 mt-4">
                        <Button variant="outline" onClick={onClose} type="button">Cancel</Button>
                        <Button onClick={(e) => handleSubmit(e, onSubmit)} disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
