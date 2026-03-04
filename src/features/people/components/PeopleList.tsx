import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { Plus, Search, Mail, Phone, MoreHorizontal, Loader2 } from 'lucide-react';
import AddPersonModal from './AddPersonModal';
import { toast } from 'sonner';
import { planter } from '@/shared/api/planterClient';
import { compareDateDesc } from '@/shared/lib/date-engine';
import type { PersonRow } from '@/shared/db/app.types';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

const STATUS_OPTS: Record<string, string> = {
    'New': 'bg-brand-100 text-brand-700',
    'Contacted': 'bg-indigo-100 text-indigo-700',
    'Meeting Scheduled': 'bg-purple-100 text-purple-700',
    'Joined': 'bg-emerald-100 text-emerald-700',
    'Not Interested': 'bg-slate-100 text-slate-500',
    'default': 'bg-slate-100 text-slate-700'
};

export interface Person {
    id: string;
    first_name: string;
    last_name: string | null;
    role: string | null;
    status: string | null;
    email: string | null;
    phone: string | null;
    project_id?: string | null;
}

interface PeopleListProps {
    projectId: string;
    canEdit?: boolean;
}

export default function PeopleList({ projectId, canEdit = false }: PeopleListProps) {
    const [people, setPeople] = useState<Person[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingPerson, setEditingPerson] = useState<Person | null>(null);

    const loadPeople = useCallback(async () => {
        try {
            // Replaces peopleService.getPeople
            const data = await planter.entities.Person.filter({ project_id: projectId });
            // Sort client-side to mimic the previous server-side '.order('created_at', { ascending: false })' 
            const sorted = (data || []).sort((a: PersonRow, b: PersonRow) =>
                compareDateDesc(a.created_at, b.created_at)
            );
            setPeople(sorted as Person[]);
        } catch {
            toast.error('Failed to load people');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        loadPeople();
    }, [loadPeople]);

    const handleSave = async (personData: Partial<Person>) => {
        try {
            if (editingPerson) {
                // Replaces peopleService.updatePerson
                await planter.entities.Person.update(editingPerson.id, personData);
                toast.success('Person updated');
            } else {
                // Replaces peopleService.addPerson
                await planter.entities.Person.create({ ...personData, project_id: projectId } as any);
                toast.success('Person added');
            }
            loadPeople();
            setEditingPerson(null);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            toast.error('Error saving person: ' + message);
            throw error;
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this person?')) return;
        try {
            // Replaces peopleService.deletePerson
            await planter.entities.Person.delete(id);
            toast.success('Person deleted');
            loadPeople();
        } catch {
            toast.error('Error deleting');
        }
    };

    const filteredPeople = useMemo(() => {
        return people.filter(p =>
            ((p.first_name || '') + ' ' + (p.last_name || '')).toLowerCase().includes(search.toLowerCase()) ||
            (p.email?.toLowerCase().includes(search.toLowerCase()))
        );
    }, [people, search]);

    if (loading) return (
        <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search people..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        aria-label="Search people"
                    />
                </div>
                {canEdit && (
                    <Button onClick={() => { setEditingPerson(null); setIsAddModalOpen(true); }}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Person
                    </Button>
                )}
            </div>

            <Card className="overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Contact</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredPeople.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                                    No people found. Add someone to get started!
                                </td>
                            </tr>
                        ) : (
                            filteredPeople.map(person => (
                                <tr key={person.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-4 py-3 font-medium text-slate-900">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                                                {person.first_name?.[0]}{person.last_name ? person.last_name[0] : ''}
                                            </div>
                                            {person.first_name} {person.last_name}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{person.role}</td>
                                    <td className="px-4 py-3">
                                        <Badge className={`hover:bg-opacity-80 border-0 ${STATUS_OPTS[person.status || 'default'] || STATUS_OPTS.default}`}>
                                            {person.status}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3 text-slate-400">
                                            {person.email && <Mail className="w-4 h-4 hover:text-slate-600 cursor-pointer" />}
                                            {person.phone && <Phone className="w-4 h-4 hover:text-slate-600 cursor-pointer" />}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100" aria-label="Open menu">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => { setEditingPerson(person); setIsAddModalOpen(true); }}>
                                                    Edit Details
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-rose-600 focus:text-rose-700" onClick={() => handleDelete(person.id)}>
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </Card>

            {(isAddModalOpen || editingPerson) && (
                <AddPersonModal
                    open={isAddModalOpen || !!editingPerson}
                    onClose={() => { setIsAddModalOpen(false); setEditingPerson(null); }}
                    onSave={handleSave}
                    initialData={editingPerson}
                />
            )}
        </div>
    );
}
