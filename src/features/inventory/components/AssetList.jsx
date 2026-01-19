import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetService } from '../services/assetService';
import { useToast } from '@shared/ui/use-toast';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@shared/ui/table';
import { Button } from '@shared/ui/button';
import { Input } from '@shared/ui/input';
import { Badge } from '@shared/ui/badge';
import { Plus, Search, Edit2, Trash2, Loader2, Package } from 'lucide-react';
import AddAssetModal from './AddAssetModal';

const STATUS_COLORS = {
    available: 'bg-emerald-100 text-emerald-800',
    in_use: 'bg-blue-100 text-blue-800',
    maintenance: 'bg-amber-100 text-amber-800',
    lost: 'bg-rose-100 text-rose-800',
    retired: 'bg-slate-100 text-slate-800',
};

export default function AssetList({ projectId }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState(null);

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: assets = [], isLoading } = useQuery({
        queryKey: ['assets', projectId],
        queryFn: () => assetService.getAssets(projectId),
        enabled: !!projectId,
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => assetService.deleteAsset(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets', projectId] });
            toast({ title: 'Asset deleted' });
        },
        onError: () => {
            toast({ title: 'Error deleting asset', variant: 'destructive' });
        }
    });

    // Filter logic
    const filteredAssets = useMemo(() => {
        return assets.filter((asset) => {
            const term = searchTerm.toLowerCase();
            return (
                asset.name.toLowerCase().includes(term) ||
                asset.category.toLowerCase().includes(term) ||
                (asset.location && asset.location.toLowerCase().includes(term))
            );
        });
    }, [assets, searchTerm]);

    const handleEdit = (asset) => {
        setEditingAsset(asset);
        setIsModalOpen(true);
    };

    const handleClose = () => {
        setEditingAsset(null);
        setIsModalOpen(false);
    };

    if (isLoading) return (
        <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        </div>
    );

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Assets & Inventory</h2>
                    <p className="text-sm text-slate-500">Track physical items, value, and location.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="bg-brand-600 hover:bg-brand-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Asset
                </Button>
            </div>

            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search assets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-white"
                        aria-label="Search assets"
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead className="text-right">Value</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredAssets.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                                    <div className="flex flex-col items-center justify-center">
                                        <Package className="w-8 h-8 mb-2 text-slate-300" />
                                        <p>No assets found</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredAssets.map((asset) => (
                                <TableRow key={asset.id}>
                                    <TableCell className="font-medium">{asset.name}</TableCell>
                                    <TableCell className="capitalize">{asset.category}</TableCell>
                                    <TableCell>
                                        <Badge className={STATUS_COLORS[asset.status] || 'bg-slate-100 text-slate-800'} variant="secondary">
                                            {asset.status.replace('_', ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{asset.location || '-'}</TableCell>
                                    <TableCell className="text-right">
                                        {asset.value ? `$${Number(asset.value).toLocaleString()}` : '-'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(asset)} title="Edit" aria-label={`Edit ${asset.name}`}>
                                                <Edit2 className="w-4 h-4 text-slate-500" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    if (window.confirm('Delete this asset?')) deleteMutation.mutate(asset.id);
                                                }}
                                                title="Delete"
                                                aria-label={`Delete ${asset.name}`}
                                            >
                                                <Trash2 className="w-4 h-4 text-rose-500" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <AddAssetModal
                key={editingAsset ? editingAsset.id : 'new'}
                open={isModalOpen}
                onClose={handleClose}
                projectId={projectId}
                assetToEdit={editingAsset}
            />
        </div>
    );
}

AssetList.propTypes = {
    projectId: PropTypes.string.isRequired,
};
