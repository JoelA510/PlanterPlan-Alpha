import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { assetService } from '../services/assetService';
import { useToast } from '@shared/ui/use-toast';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@shared/ui/dialog';
import { Input } from '@shared/ui/input';
import { Button } from '@shared/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@shared/ui/select';
import { Textarea } from '@shared/ui/textarea';
import { Loader2 } from 'lucide-react';

const CATEGORIES = ['equipment', 'venue', 'marketing', 'kids', 'other'];
const STATUSES = ['available', 'in_use', 'maintenance', 'lost', 'retired'];

export default function AddAssetModal({ open, onClose, projectId, assetToEdit = null }) {
    const [formData, setFormData] = useState({
        name: assetToEdit?.name || '',
        category: assetToEdit?.category || 'equipment',
        status: assetToEdit?.status || 'available',
        location: assetToEdit?.location || '',
        value: assetToEdit?.value || 0,
        notes: assetToEdit?.notes || '',
    });

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (data) => {
            if (assetToEdit) {
                return assetService.updateAsset(assetToEdit.id, data);
            }
            return assetService.addAsset({ ...data, project_id: projectId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets', projectId] });
            toast({ title: assetToEdit ? 'Asset updated' : 'Asset added' });
            onClose();
        },
        onError: (err) => {
            console.error(err);
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        mutation.mutate(formData);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{assetToEdit ? 'Edit Asset' : 'Add New Asset'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Name</label>
                        <Input
                            required
                            placeholder="e.g. Sound Mixer"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Category</label>
                            <Select
                                value={formData.category}
                                onValueChange={(val) => setFormData({ ...formData, category: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map((c) => (
                                        <SelectItem key={c} value={c}>
                                            {c.charAt(0).toUpperCase() + c.slice(1)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Status</label>
                            <Select
                                value={formData.status}
                                onValueChange={(val) => setFormData({ ...formData, status: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUSES.map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {s.replace('_', ' ').charAt(0).toUpperCase() + s.replace('_', ' ').slice(1)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Location</label>
                            <Input
                                placeholder="Storage Unit A"
                                value={formData.location || ''}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Value ($)</label>
                            <Input
                                type="number"
                                min="0"
                                value={formData.value}
                                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Notes</label>
                        <Textarea
                            placeholder="Optional details..."
                            value={formData.notes || ''}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Asset'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
