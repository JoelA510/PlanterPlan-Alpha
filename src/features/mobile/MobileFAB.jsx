import { Plus } from 'lucide-react';
import { Button } from '@shared/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@shared/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';

export default function MobileFAB({ onAddTask }) {
    const navigate = useNavigate();

    return (
        <div className="fixed bottom-6 right-6 md:hidden z-50">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        size="icon"
                        className="w-14 h-14 rounded-full shadow-xl bg-brand-600 hover:bg-brand-700 text-white"
                    >
                        <Plus className="w-8 h-8" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="mb-2">
                    <DropdownMenuItem onClick={onAddTask} className="cursor-pointer">
                        New Task
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/projects/new')} className="cursor-pointer">
                        New Project
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
