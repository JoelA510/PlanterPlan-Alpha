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
import { Switch } from '@/shared/ui/switch';
import { BookTemplate, Loader2 } from 'lucide-react';

interface CreateTemplateModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: { title: string; description: string; isPublished: boolean }) => Promise<void>;
}

export default function CreateTemplateModal({ open, onClose, onSubmit }: CreateTemplateModalProps) {
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isPublished, setIsPublished] = useState(false);

    const handleSubmit = async () => {
        if (!title.trim()) return;
        setLoading(true);
        try {
            await onSubmit({ title: title.trim(), description: description.trim(), isPublished });
            setTitle('');
            setDescription('');
            setIsPublished(false);
            onClose();
        } catch (error) {
            console.error('Failed to create template:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white border-slate-200">
                <DialogHeader className="p-8 bg-brand-600 text-white">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <BookTemplate className="w-6 h-6" />
                        New Template
                    </DialogTitle>
                    <DialogDescription className="text-brand-100 text-base">
                        Create a reusable template for your projects.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="template-title" className="text-slate-700 font-semibold">
                            Template Name
                        </Label>
                        <Input
                            id="template-title"
                            placeholder="e.g. Church Plant Roadmap"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="h-12 border-slate-200 focus:ring-brand-500/20 focus:border-brand-500 rounded-xl"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="template-description" className="text-slate-700 font-semibold">
                            Description
                        </Label>
                        <Textarea
                            id="template-description"
                            placeholder="What is this template for?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="min-h-[120px] border-slate-200 focus:ring-brand-500/20 focus:border-brand-500 rounded-xl resize-none"
                        />
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <Label htmlFor="template-published" className="font-medium">Published</Label>
                            <p className="text-xs text-slate-500 mt-0.5">Published templates are visible to all users in the library.</p>
                        </div>
                        <Switch
                            id="template-published"
                            checked={isPublished}
                            onCheckedChange={setIsPublished}
                        />
                    </div>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || !title.trim()}
                        className="w-full bg-brand-600 hover:bg-brand-700 text-white h-12 text-lg font-semibold rounded-xl"
                    >
                        {loading ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            'Create Template'
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
