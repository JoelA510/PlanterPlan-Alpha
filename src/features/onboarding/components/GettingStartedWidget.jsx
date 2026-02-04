import { Link } from 'react-router-dom';
import { Card } from '@shared/ui/card';
import { Progress } from '@shared/ui/progress';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Circle, ArrowRight, X } from 'lucide-react';
import { useState } from 'react';

export default function GettingStartedWidget({ project, teamMembers, onDismiss }) {
    const [isVisible, setIsVisible] = useState(true);

    if (!project) return null;

    const steps = [
        { label: 'Create your Project', completed: true },
        { label: 'Set a Launch Date', completed: !!project.launch_date, action: 'Settings', link: `/project/${project.id}/settings` },
        { label: 'Invite a Team Member', completed: teamMembers && teamMembers.length > 0, action: 'Invite', link: `/project/${project.id}/team` },
        { label: 'Explore Phases', completed: false, action: 'View', link: `/project/${project.id}` }
    ];

    const completedCount = steps.filter(s => s.completed).length;
    const progress = (completedCount / steps.length) * 100;

    const handleDismiss = () => {
        setIsVisible(false);
        // Wait for animation to finish before calling onDismiss prop
        if (onDismiss) setTimeout(onDismiss, 300);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 1, height: 'auto', marginBottom: 32 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <Card className="p-6 border-brand-100 dark:border-brand-900/50 bg-gradient-to-br from-orange-200/40 via-orange-50/20 to-transparent dark:from-orange-900/20 dark:to-transparent relative group">
                        <button
                            onClick={handleDismiss}
                            className="absolute top-4 right-4 p-1 text-muted-foreground/50 hover:text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                            aria-label="Dismiss getting started"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-card-foreground">Getting Started</h3>
                                <p className="text-sm text-muted-foreground">Complete these steps to set up your project for success.</p>
                            </div>
                            <div className="text-right">
                                <span className="text-sm font-bold text-brand-600 dark:text-brand-400">{Math.round(progress)}%</span>
                            </div>
                        </div>

                        <Progress value={progress} className="h-2 bg-brand-100 dark:bg-brand-950/40 mb-6" indicatorClassName="bg-brand-500" />

                        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                            {steps.map((step, idx) => (
                                <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg border ${step.completed ? 'bg-card border-border shadow-sm' : 'bg-muted/40 border-border/60'}`}>
                                    {step.completed ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                    ) : (
                                        <Circle className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-sm font-medium ${step.completed ? 'text-muted-foreground' : 'text-card-foreground'}`}>{step.label}</div>
                                        {!step.completed && step.link && (
                                            <Link to={step.link} className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center mt-1">
                                                {step.action} <ArrowRight className="w-3 h-3 ml-1" />
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
