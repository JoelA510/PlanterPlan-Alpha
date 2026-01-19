import { Link } from 'react-router-dom';
import { Card } from '@shared/ui/card';
import { Progress } from '@shared/ui/progress';
import { Button } from '@shared/ui/button';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { createPageUrl } from '@shared/lib/utils';

export default function GettingStartedWidget({ project, teamMembers, onDismiss }) {
    if (!project) return null;

    const steps = [
        { label: 'Create your Project', completed: true },
        { label: 'Set a Launch Date', completed: !!project.launch_date, action: 'Settings', link: `/project/${project.id}/settings` },
        { label: 'Invite a Team Member', completed: teamMembers && teamMembers.length > 0, action: 'Invite', link: `/project/${project.id}/team` },
        { label: 'Explore Phases', completed: false, action: 'View', link: `/project/${project.id}` }
    ];

    const completedCount = steps.filter(s => s.completed).length;
    const progress = (completedCount / steps.length) * 100;

    return (
        <Card className="p-6 border-orange-100 bg-orange-50/50 mb-8">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Getting Started</h3>
                    <p className="text-sm text-slate-600">Complete these steps to set up your project for success.</p>
                </div>
                <div className="text-right">
                    <span className="text-sm font-bold text-orange-600">{Math.round(progress)}%</span>
                </div>
            </div>

            <Progress value={progress} className="h-2 bg-orange-100 mb-6" indicatorClassName="bg-orange-500" />

            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                {steps.map((step, idx) => (
                    <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg border ${step.completed ? 'bg-white border-slate-100' : 'bg-white/50 border-orange-200'}`}>
                        {step.completed ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                        ) : (
                            <Circle className="w-5 h-5 text-orange-300 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium ${step.completed ? 'text-slate-700' : 'text-slate-900'}`}>{step.label}</div>
                            {!step.completed && step.link && (
                                <Link to={step.link} className="text-xs text-orange-600 hover:underline flex items-center mt-1">
                                    {step.action} <ArrowRight className="w-3 h-3 ml-1" />
                                </Link>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}
