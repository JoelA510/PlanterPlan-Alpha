import { Edit, Plus, UserPlus, Trash2 } from 'lucide-react';
import { useCallback } from 'react';
import type { MouseEvent } from 'react';
import type { TaskRow } from '@/shared/db/app.types';

interface TaskControlButtonsProps {
 task: TaskRow;
 onEdit?: (task: TaskRow) => void;
 onAddChild?: (task: TaskRow) => void;
 onInvite?: (task: TaskRow) => void;
 onDelete?: (id: string) => void;
 canHaveChildren?: boolean;
}

export default function TaskControlButtons({
 task,
 onEdit,
 onAddChild,
 onInvite,
 onDelete,
 canHaveChildren
}: TaskControlButtonsProps) {
 const handleEdit = useCallback((e: MouseEvent) => {
 e.stopPropagation();
 if (onEdit) onEdit(task);
 }, [onEdit, task]);

 const handleAddChild = useCallback((e: MouseEvent) => {
 e.stopPropagation();
 if (onAddChild) onAddChild(task);
 }, [onAddChild, task]);

 const handleInvite = useCallback((e: MouseEvent) => {
 e.stopPropagation();
 if (onInvite) onInvite(task);
 }, [onInvite, task]);

 const handleDelete = useCallback((e: MouseEvent) => {
 e.stopPropagation();
 if (onDelete) onDelete(task.id);
 }, [onDelete, task]);

 return (
 <>
 {onEdit && (
 <button className="action-btn" onClick={handleEdit} title="Edit Task">
 <Edit className="w-3.5 h-3.5" />
 </button>
 )}

 {canHaveChildren && onAddChild && (
 <button className="action-btn" onClick={handleAddChild} title="Add Subtask">
 <Plus className="w-3.5 h-3.5" />
 </button>
 )}

 {onInvite && (
 <button className="action-btn" onClick={handleInvite} title="Invite Member">
 <UserPlus className="w-3.5 h-3.5" />
 </button>
 )}

 {onDelete && (
 <button className="action-btn delete" onClick={handleDelete} title="Delete Task">
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 )}
 </>
 );
}
