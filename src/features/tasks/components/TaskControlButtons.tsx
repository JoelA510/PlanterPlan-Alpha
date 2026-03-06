import { Edit, Plus, UserPlus, Trash2 } from 'lucide-react';
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

 return (
 <>
 {onEdit && (
 <button className="action-btn" onClick={(e) => { e.stopPropagation(); if (onEdit) onEdit(task); }} title="Edit Task">
 <Edit className="w-3.5 h-3.5" />
 </button>
 )}

 {canHaveChildren && onAddChild && (
 <button className="action-btn" onClick={(e) => { e.stopPropagation(); if (onAddChild) onAddChild(task); }} title="Add Subtask">
 <Plus className="w-3.5 h-3.5" />
 </button>
 )}

 {onInvite && (
 <button className="action-btn" onClick={(e) => { e.stopPropagation(); if (onInvite) onInvite(task); }} title="Invite Member">
 <UserPlus className="w-3.5 h-3.5" />
 </button>
 )}

 {onDelete && (
 <button className="action-btn delete" onClick={(e) => { e.stopPropagation(); if (onDelete) onDelete(task.id); }} title="Delete Task">
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 )}
 </>
 );
}
