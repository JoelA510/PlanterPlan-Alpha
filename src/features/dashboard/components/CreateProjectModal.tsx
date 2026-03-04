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
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import {
    Plus,
    Target,
    Zap,
    Users,
    ChevronRight,
    ArrowLeft,
    Check,
    Loader2,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

import type { CreateProjectFormData } from '@/shared/db/app.types';

const templates = [
    {
        id: 'new-church',
        title: 'New Church Plant',
        description: 'Comprehensive 24-month structured roadmap',
        icon: Target,
        color: 'text-brand-600',
        bg: 'bg-brand-50',
    },
    {
        id: 'outreach',
        title: 'Community Outreach',
        description: 'Rapid response event planning',
        icon: Zap,
        color: 'text-indigo-600',
        bg: 'bg-indigo-50',
    },
    {
        id: 'training',
        title: 'Leadership Training',
        description: 'Cohorts and multiplication systems',
        icon: Users,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
    },
];

interface CreateProjectModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: CreateProjectFormData) => Promise<void>;
}

export default function CreateProjectModal({ open, onClose, onSubmit }: CreateProjectModalProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<CreateProjectFormData>({
        title: '',
        description: '',
        creator: '', // Will be set by mutation hook
        template: 'new-church',
    });

    const handleNext = () => setStep(2);
    const handleBack = () => setStep(1);

    const handleTemplateSelect = (templateId: string) => {
        setFormData({ ...formData, template: templateId });
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await onSubmit(formData);
            onClose();
        } catch (error) {
            console.error('Failed to create project:', error);
        } finally {
            setLoading(false);
            setStep(1);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-white border-slate-200">
                <DialogHeader className="p-8 bg-brand-600 text-white">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <Plus className="w-6 h-6" />
                        Start New Project
                    </DialogTitle>
                    <DialogDescription className="text-brand-100 text-base">
                        Choose a proven framework to help you grow your mission.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-8">
                    <div className="flex items-center justify-center mb-8">
                        <div className="flex items-center gap-4">
                            {[1, 2].map((i) => (
                                <div key={i} className="flex items-center">
                                    <div
                                        className={cn(
                                            'w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300',
                                            step >= i
                                                ? 'bg-brand-600 text-white shadow-lg shadow-brand-200'
                                                : 'bg-slate-100 text-slate-400'
                                        )}
                                    >
                                        {step > i ? <Check className="w-5 h-5" /> : i}
                                    </div>
                                    {i === 1 && (
                                        <div
                                            className={cn(
                                                'w-20 h-1 mx-2 rounded-full transition-all duration-500',
                                                step > 1 ? 'bg-brand-600' : 'bg-slate-100'
                                            )}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {step === 1 ? (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-6"
                            >
                                <div className="grid grid-cols-1 gap-4">
                                    {templates.map((cat) => (
                                        <div
                                            key={cat.id}
                                            onClick={() => handleTemplateSelect(cat.id)}
                                            className={cn(
                                                'group cursor-pointer p-4 rounded-xl border-2 transition-all duration-300 flex items-center gap-4',
                                                formData.template === cat.id
                                                    ? 'border-brand-600 bg-brand-50 shadow-md ring-1 ring-brand-600/10'
                                                    : 'border-slate-100 hover:border-brand-200 hover:bg-slate-50'
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
                                                    formData.template === cat.id ? 'bg-brand-600 text-white' : cn(cat.bg, cat.color)
                                                )}
                                            >
                                                <cat.icon className="w-6 h-6" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-slate-900">{cat.title}</h4>
                                                <p className="text-sm text-slate-500">{cat.description}</p>
                                            </div>
                                            {formData.template === cat.id && (
                                                <div className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center">
                                                    <Check className="w-4 h-4 text-white" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <Button
                                    onClick={handleNext}
                                    className="w-full bg-brand-600 hover:bg-brand-700 text-white h-12 text-lg font-semibold rounded-xl"
                                >
                                    Continue to Details
                                    <ChevronRight className="ml-2 w-5 h-5" />
                                </Button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <h3 className="text-lg font-bold text-slate-900">Project Details</h3>
                                <div className="space-y-2">
                                    <Label htmlFor="title" className="text-slate-700 font-semibold">
                                        Project Name
                                    </Label>
                                    <Input
                                        id="title"
                                        placeholder="e.g. Hope City Launch"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="h-12 border-slate-200 focus:ring-brand-500/20 focus:border-brand-500 rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description" className="text-slate-700 font-semibold">
                                        Description
                                    </Label>
                                    <Textarea
                                        id="description"
                                        placeholder="What's the vision for this project?"
                                        value={formData.description}
                                        onChange={(e) =>
                                            setFormData({ ...formData, description: e.target.value })
                                        }
                                        className="min-h-[120px] border-slate-200 focus:ring-brand-500/20 focus:border-brand-500 rounded-xl resize-none"
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <Button
                                        variant="outline"
                                        onClick={handleBack}
                                        className="flex-1 border-slate-200 text-slate-600 h-12 rounded-xl"
                                    >
                                        <ArrowLeft className="mr-2 w-5 h-5" />
                                        Back
                                    </Button>
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={loading || !formData.title}
                                        className="flex-[2] bg-brand-600 hover:bg-brand-700 text-white h-12 text-lg font-semibold rounded-xl"
                                    >
                                        {loading ? (
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                        ) : (
                                            'Create Project'
                                        )}
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </DialogContent>
        </Dialog>
    );
}
