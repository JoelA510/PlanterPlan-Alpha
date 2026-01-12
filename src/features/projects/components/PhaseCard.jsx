import React from 'react';
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";

const phaseColors = {
    1: { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
    2: { bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
    3: { bg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
    4: { bg: 'bg-green-500', light: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
    5: { bg: 'bg-yellow-500', light: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' },
    6: { bg: 'bg-pink-500', light: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200' }
};

export default function PhaseCard({ phase, tasks = [], milestones = [], isActive, onClick }) {
    const colors = phaseColors[phase.order] || phaseColors[1];
    const phaseTasks = tasks.filter(t => t.phase_id === phase.id);
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
                                phase.order
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900">{phase.name}</h3>
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
