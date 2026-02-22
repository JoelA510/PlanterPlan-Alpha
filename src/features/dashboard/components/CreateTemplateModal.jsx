import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Label } from '@/shared/ui/label';
import { Loader2, FileText, BookTemplate, Layers } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { motion } from 'framer-motion';

const TEMPLATE_CATEGORIES = [
    {
        id: 'checklist',
        name: 'Task Checklist',
        description: 'A reusable set of tasks for recurring activities',
        icon: FileText,
    },
    {
        id: 'workflow',
        name: 'Workflow Template',
        description: 'Multi-phase process with dependencies and milestones',
        icon: Layers,
    },
    {
        id: 'blueprint',
        name: 'Project Blueprint',
        description: 'Full project structure to clone into new instances',
        icon: BookTemplate,
    },
];

export default function CreateTemplateModal({ open, onClose, onCreate }) {
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        template: '',
    });

    const handleCreate = async (e) => {
        if (e) e.preventDefault();

        // Validate
        const newErrors = {};
        if (!formData.title.trim()) {
            newErrors.title = 'Template name is required';
        }
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setLoading(true);
        try {
            await onCreate({
                title: formData.title.trim(),
                description: formData.description.trim(),
                template: formData.template || 'checklist',
                origin: 'template',
            });

            // Reset form
            setFormData({ title: '', description: '', template: '' });
            setErrors({});
            onClose();
        } catch (error) {
            console.error('[CreateTemplateModal] Failed to create template:', error);
            setErrors({ root: error.message || 'Failed to create template.' });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setErrors({});
        setFormData({ title: '', description: '', template: '' });
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-lg bg-card text-card-foreground">
                <DialogHeader>
                    <DialogTitle className="text-xl">Create New Template</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Build a reusable template for future projects and tasks
                    </DialogDescription>
                </DialogHeader>

                {errors.root && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm mb-4">
                        {errors.root}
                    </div>
                )}

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid gap-5 py-4"
                >
                    {/* Category Selection */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Category</Label>
                        <div className="grid grid-cols-3 gap-2">
                            {TEMPLATE_CATEGORIES.map((cat) => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => {
                                        setFormData({ ...formData, template: cat.id });
                                    }}
                                    className={cn(
                                        'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all text-center group cursor-pointer',
                                        'hover:border-brand-300 hover:bg-brand-50/50 dark:hover:bg-brand-900/20',
                                        formData.template === cat.id
                                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/40 ring-1 ring-brand-500/20'
                                            : 'border-border bg-card'
                                    )}
                                >
                                    <div
                                        className={cn(
                                            'w-10 h-10 rounded-lg flex items-center justify-center transition-all',
                                            formData.template === cat.id
                                                ? 'bg-brand-500 shadow-md shadow-brand-500/20'
                                                : 'bg-muted group-hover:bg-brand-100 dark:group-hover:bg-brand-900/50'
                                        )}
                                    >
                                        <cat.icon
                                            className={cn(
                                                'w-5 h-5',
                                                formData.template === cat.id
                                                    ? 'text-white'
                                                    : 'text-muted-foreground group-hover:text-brand-600 dark:group-hover:text-brand-400'
                                            )}
                                        />
                                    </div>
                                    <span className="text-xs font-medium text-card-foreground leading-tight">{cat.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Template Name */}
                    <div className="space-y-2">
                        <Label htmlFor="template-title" className={cn(errors.title && 'text-red-500')}>
                            Template Name *
                        </Label>
                        <Input
                            id="template-title"
                            placeholder="e.g., Sunday Service Prep, Outreach Campaign"
                            value={formData.title}
                            onChange={(e) => {
                                setFormData({ ...formData, title: e.target.value });
                                if (errors.title) setErrors((prev) => ({ ...prev, title: null }));
                            }}
                            className={cn('h-11', errors.title && 'border-red-500 focus-visible:ring-red-500')}
                            autoFocus
                        />
                        {errors.title && (
                            <p className="text-xs text-red-500 mt-1">{errors.title}</p>
                        )}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="template-description">Description</Label>
                        <Textarea
                            id="template-description"
                            placeholder="What is this template used for?"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="resize-none h-20"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end pt-2">
                        <Button
                            onClick={handleCreate}
                            disabled={loading}
                            className="bg-orange-500 hover:bg-orange-600"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Template'
                            )}
                        </Button>
                    </div>
                </motion.div>
            </DialogContent>
        </Dialog>
    );
}
