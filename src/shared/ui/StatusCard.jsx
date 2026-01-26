import PropTypes from 'prop-types';

const StatusCard = ({
    icon,
    title,
    description,
    children,
    actions,
    className = '',
    variant = 'neutral' // 'neutral' | 'error' | 'success'
}) => {
    const bgColors = {
        neutral: 'bg-card text-card-foreground',
        error: 'bg-card text-card-foreground',
        success: 'bg-emerald-50 dark:bg-emerald-900/10'
    };

    const titleColors = {
        neutral: 'text-card-foreground',
        error: 'text-rose-600 dark:text-rose-400',
        success: 'text-emerald-800 dark:text-emerald-400'
    };

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

StatusCard.propTypes = {
    icon: PropTypes.node,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    children: PropTypes.node,
    actions: PropTypes.node,
    className: PropTypes.string,
    variant: PropTypes.oneOf(['neutral', 'error', 'success'])
};

export default StatusCard;
