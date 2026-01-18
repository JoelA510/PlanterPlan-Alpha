import React, { useState, useEffect } from 'react';
import { Card } from '@shared/ui/card';
import { Button } from '@shared/ui/button';
import { Progress } from '@shared/ui/progress';
import { Plus, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { budgetService } from '../services/budgetService';
import { useToast } from '@shared/ui/use-toast';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@shared/ui/dialog';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@shared/ui/select';

export default function BudgetWidget({ projectId }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { toast } = useToast();

    const [newItem, setNewItem] = useState({
        description: '',
        category: 'Equipment',
        planned_amount: '',
        status: 'planned'
    });

    const CATEGORIES = ['Equipment', 'Marketing', 'Venue', 'Kids', 'Operations', 'Other'];

    useEffect(() => {
        loadBudget();
    }, [projectId]);

    const loadBudget = async () => {
        try {
            const data = await budgetService.getBudgetItems(projectId);
            setItems(data);
        } catch (error) {
            console.error('Failed to load budget', error);
        } finally {
            setLoading(false);
        }
    };

    const totals = items.reduce((acc, item) => {
        acc.planned += Number(item.planned_amount || 0);
        acc.actual += item.status === 'purchased' ? Number(item.actual_amount || item.planned_amount) : 0;
        return acc;
    }, { planned: 0, actual: 0 });

    const percentUsed = totals.planned > 0 ? (totals.actual / totals.planned) * 100 : 0;

    const handleAddItem = async (e) => {
        e.preventDefault();
        try {
            await budgetService.addItem({
                ...newItem,
                project_id: projectId,
                planned_amount: Number(newItem.planned_amount)
            });
            setIsModalOpen(false);
            setNewItem({ description: '', category: 'Equipment', planned_amount: '', status: 'planned' });
            loadBudget();
            toast({ title: 'Item added' });
        } catch (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    if (loading) return <div className="h-32 bg-slate-100 rounded-xl animate-pulse" />;

    return (
        <>
            <Card className="p-6 border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer group" onClick={() => setIsModalOpen(true)}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                            <DollarSign className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Launch Budget</h3>
                            <p className="text-sm text-slate-500">{items.length} items tracked</p>
                        </div>
                    </div>
                    <Button size="icon" variant="ghost" className="text-slate-400 group-hover:text-slate-600">
                        <Plus className="w-5 h-5" />
                    </Button>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Spent</span>
                        <span className="font-semibold text-slate-900">
                            ${totals.actual.toLocaleString()} <span className="text-slate-400 font-normal">/ ${totals.planned.toLocaleString()}</span>
                        </span>
                    </div>
                    <Progress value={percentUsed} className="h-2 bg-slate-100" />
                    {percentUsed > 100 && (
                        <div className="flex items-center gap-1 text-xs text-rose-600 font-medium">
                            <AlertCircle className="w-3 h-3" />
                            Over Budget
                        </div>
                    )}
                </div>
            </Card>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Launch Budget</DialogTitle>
                        <DialogDescription>Track estimated and actual costs for your plant.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="text-sm text-slate-500 mb-1">Total Planned</div>
                                <div className="text-2xl font-bold text-slate-900">${totals.planned.toLocaleString()}</div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="text-sm text-slate-500 mb-1">Total Spent</div>
                                <div className="text-2xl font-bold text-emerald-600">${totals.actual.toLocaleString()}</div>
                            </div>
                        </div>

                        {/* Add Item Form */}
                        <form onSubmit={handleAddItem} className="flex items-end gap-2 p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="space-y-1 flex-1">
                                <Label className="text-xs">Item Description</Label>
                                <Input
                                    placeholder="e.g. Kids Check-in iPad"
                                    value={newItem.description}
                                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-1 w-32">
                                <Label className="text-xs">Category</Label>
                                <Select
                                    value={newItem.category}
                                    onValueChange={(val) => setNewItem({ ...newItem, category: val })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1 w-24">
                                <Label className="text-xs">Cost ($)</Label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={newItem.planned_amount}
                                    onChange={(e) => setNewItem({ ...newItem, planned_amount: e.target.value })}
                                    required
                                />
                            </div>
                            <Button type="submit" size="icon" className="shrink-0 bg-emerald-600 hover:bg-emerald-700">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </form>

                        {/* Items List */}
                        <div className="max-h-60 overflow-y-auto space-y-2">
                            {items.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-sm">No budget items yet. Add one above.</div>
                            ) : (
                                items.map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg text-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-slate-300" />
                                            <div>
                                                <div className="font-medium text-slate-900">{item.description}</div>
                                                <div className="text-xs text-slate-500">{item.category}</div>
                                            </div>
                                        </div>
                                        <div className="font-medium text-slate-700">${Number(item.planned_amount).toLocaleString()}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
