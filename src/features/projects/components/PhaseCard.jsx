
import { Card } from "@shared/ui/card";
import { Progress } from "@shared/ui/progress";
import { Badge } from "@shared/ui/badge";
import { ChevronRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";

const phaseColors = {
    1: { bg: 'bg-brand-500', light: 'bg-brand-50', text: 'text-brand-600', border: 'border-brand-200' },
    2: { bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
    3: { bg: 'bg-indigo-500', light: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
    4: { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
    5: { bg: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
    6: { bg: 'bg-rose-500', light: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' }
};

export default function PhaseCard({ phase, tasks = [], milestones = [], isActive, onClick }) {
    const order = phase.position || phase.order;
    const colors = phaseColors[order] || phaseColors[1];

    // Filter tasks that belong to this phase (via milestones)
    const phaseTasks = tasks.filter(t =>
        milestones.some(m => m.id === t.parent_task_id && m.parent_task_id === phase.id)
    );

    const completedTasks = phaseTasks.filter(t => t.status === 'completed').length;
    const totalTasks = phaseTasks.length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const isComplete = progress === 100 && totalTasks > 0;

    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            <Card
                onClick={onClick}
                className={cn(
                    "p-5 cursor-pointer transition-all duration-300 border-2 bg-white",
                    isActive
                        ? `${colors.border} ${colors.light} shadow-lg`
                        : "border-slate-200 hover:border-slate-300 hover:shadow-lg"
                )}
            >
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white",
                            colors.bg
                        )}>
                            {isComplete ? (
                                <CheckCircle2 className="w-5 h-5" />
                            ) : (
                                order
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900">{phase.title || phase.name}</h3>
                            <p className="text-sm text-slate-500">{milestones.length} milestones</p>
                        </div>
                    </div>
                    <ChevronRight className={cn(
                        "w-5 h-5 transition-colors",
                        isActive ? colors.text : "text-slate-400"
                    )} />
                </div>

                {phase.description && (
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                        {phase.description}
                    </p>
                )}

                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Progress</span>
                        <span className={cn("font-medium", colors.text)}>{progress}%</span>
                    </div>
                    <Progress
                        value={progress}
                        className={cn("h-2", colors.light)}
                    />
                    <p className="text-xs text-slate-500">
                        {completedTasks} of {totalTasks} tasks
                    </p>
                </div>
            </Card>
        </motion.div>
    );
}
