import { type FC } from 'react';
import { Card } from '@/shared/ui/card';
import { cn } from '@/shared/lib/utils';
import { CheckCircle2, AlertCircle, Clock, Info } from 'lucide-react';

interface StatusCardProps {
 title: string;
 description?: string;
 variant?: 'success' | 'warning' | 'error' | 'info';
 actions?: React.ReactNode;
 children?: React.ReactNode;
 className?: string;
}

const statusConfig = {
 success: {
 icon: CheckCircle2,
 color: 'text-emerald-600',
 bg: 'bg-emerald-50',
 border: 'border-emerald-100',
 },
 warning: {
 icon: Clock,
 color: 'text-amber-600',
 bg: 'bg-amber-50',
 border: 'border-amber-100',
 },
 error: {
 icon: AlertCircle,
 color: 'text-rose-600',
 bg: 'bg-rose-50',
 border: 'border-rose-100',
 },
 info: {
 icon: Info,
 color: 'text-brand-600',
 bg: 'bg-brand-50',
 border: 'border-brand-100',
 },
};

const StatusCard: FC<StatusCardProps> = ({ title, description, variant = 'info', actions, children, className }) => {
 const config = statusConfig[variant];
 const Icon = config.icon;

 return (
 <Card data-testid="status-card" className={cn(
 'p-4 border-2 shadow-none transition-all duration-200 hover:shadow-md',
 config.bg,
 config.border,
 className
 )}>
 <div className="flex gap-4">
 <div className={cn('p-2 rounded-xl bg-white shadow-sm h-fit', config.color)}>
 <Icon className="w-5 h-5" />
 </div>
 <div>
 <h4 className={cn('font-bold text-sm mb-1', config.color)}>{title}</h4>
 {description && <p className="text-slate-600 text-xs leading-relaxed">{description}</p>}
 {children && <div className="mt-4">{children}</div>}
 {actions && <div className="mt-6 flex justify-end gap-3">{actions}</div>}
 </div>
 </div>
 </Card>
 );
};

export default StatusCard;
