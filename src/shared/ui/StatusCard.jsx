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
        neutral: 'bg-white',
        error: 'bg-white',
        success: 'bg-emerald-50'
    };

    const titleColors = {
        neutral: 'text-slate-900',
        error: 'text-rose-600',
        success: 'text-emerald-800'
    };

    return (
        <div className={`flex flex-col items-center justify-center p-8 text-center rounded-xl shadow-sm border border-slate-200 ${bgColors[variant]} ${className}`}>
            {icon && (
                <div className="w-16 h-16 mb-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                    {icon}
                </div>
            )}
            <h3 className={`text-xl font-semibold mb-2 ${titleColors[variant]}`}>{title}</h3>
            {description && <p className="text-slate-500 max-w-md mb-6 leading-relaxed">{description}</p>}
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
