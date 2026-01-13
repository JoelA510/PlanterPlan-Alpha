import PropTypes from 'prop-types';

const EmptyState = ({
    title,
    description,
    icon,
    actionLabel,
    onAction,
    secondaryActionLabel,
    onSecondaryAction,
}) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-96 p-8 text-center bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="w-16 h-16 mb-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                {icon || (
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                    </svg>
                )}
            </div>

            <h3 className="text-xl font-semibold text-slate-900 mb-2">{title}</h3>
            <p className="text-slate-500 max-w-md mb-8 leading-relaxed">{description}</p>

            <div className="flex items-center gap-4">
                {actionLabel && onAction && (
                    <button
                        onClick={onAction}
                        className="px-4 py-2 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
                    >
                        {actionLabel}
                    </button>
                )}

                {secondaryActionLabel && onSecondaryAction && (
                    <button
                        onClick={onSecondaryAction}
                        className="px-4 py-2 bg-white text-slate-700 font-medium rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
                    >
                        {secondaryActionLabel}
                    </button>
                )}
            </div>
        </div>
    );
};

EmptyState.propTypes = {
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    icon: PropTypes.node,
    actionLabel: PropTypes.string,
    onAction: PropTypes.func,
    secondaryActionLabel: PropTypes.string,
    onSecondaryAction: PropTypes.func,
};

export default EmptyState;
