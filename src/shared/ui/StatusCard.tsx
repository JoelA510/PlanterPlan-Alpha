import type { ReactNode } from 'react';

type StatusCardVariant = 'neutral' | 'error' | 'success';

interface StatusCardProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    children?: ReactNode;
    actions?: ReactNode;
    className?: string;
    variant?: StatusCardVariant;
}

const bgColors: Record<StatusCardVariant, string> = {
    neutral: 'bg-card text-card-foreground',
    error: 'bg-card text-card-foreground',
    success: 'bg-emerald-50 dark:bg-emerald-900/10',
};

const titleColors: Record<StatusCardVariant, string> = {
    neutral: 'text-card-foreground',
    error: 'text-rose-600 dark:text-rose-400',
    success: 'text-emerald-800 dark:text-emerald-400',
};

const StatusCard = ({
    icon,
    title,
    description,
    children,
    actions,
    className = '',
    variant = 'neutral',
}: StatusCardProps): JSX.Element => {
    return (
        <div className={`flex flex-col items-center justify-center p-8 text-center rounded-xl shadow-sm border border-slate-200 dark:border-border ${bgColors[variant]} ${className}`}>
            {icon && (
                <div className="w-16 h-16 mb-6 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
                    {icon}
                </div>
            )}
            <h3 className={`text-xl font-semibold mb-2 ${titleColors[variant]}`}>{title}</h3>
            {description && <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">{description}</p>}
            {children}
            {actions && <div className="flex items-center gap-4 mt-6">{actions}</div>}
        </div>
    );
};

export default StatusCard;
