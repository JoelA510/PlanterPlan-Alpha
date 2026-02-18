import { useNavigate } from 'react-router-dom';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Calendar, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { TASK_STATUS } from '@/app/constants/index';

export default function MobileAgenda({ tasks = [] }) {
    const navigate = useNavigate();

    // Filter for tasks due today or overdue
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const relevantTasks = tasks.filter(t => {
        if (t.status === TASK_STATUS.COMPLETED) return false;
        if (!t.due_date) return false;
        const due = new Date(t.due_date);
        return due <= today;
    }).slice(0, 3); // Top 3

    if (relevantTasks.length === 0) return null;

    return (
        <div className="md:hidden mb-6">
            <Card className="bg-gradient-to-br from-brand-600 to-brand-700 text-white border-none shadow-lg">
                <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 opacity-80" />
                            <h3 className="font-semibold">Focused Today</h3>
                        </div>
                        <span className="text-xs bg-white/20 px-2 py-1 rounded-full">{relevantTasks.length} Due</span>
                    </div>

                    <div className="space-y-3">
                        {relevantTasks.map(task => (
                            <div
                                key={task.id}
                                className="bg-white/10 rounded-lg p-3 flex items-center justify-between cursor-pointer active:bg-white/20 transition-colors"
                                onClick={() => navigate(`/projects/${task.root_id}`)}
                            >
                                <div>
                                    <p className="font-medium text-sm line-clamp-1">{task.title}</p>
                                    <p className="text-xs text-brand-100">
                                        {task.due_date ? format(new Date(task.due_date), 'MMM d') : 'Today'}
                                    </p>
                                </div>
                                <ChevronRight className="w-4 h-4 opacity-50" />
                            </div>
                        ))}
                    </div>

                    <Button
                        className="w-full mt-4 bg-white text-brand-700 hover:bg-brand-50"
                        size="sm"
                        onClick={() => navigate('/tasks')}
                    >
                        View All Tasks
                    </Button>
                </div>
            </Card>
        </div>
    );
}
