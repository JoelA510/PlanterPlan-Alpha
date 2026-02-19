import PropTypes from 'prop-types';

const GlobalNavItem = ({ isActive, onClick, label, icon }) => (
  <div
    className={`sidebar-nav-item group flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 cursor-pointer ${isActive
      ? 'bg-orange-50 border-l-4 border-l-orange-500 text-slate-900 font-semibold shadow-sm'
      : 'text-muted-foreground hover:bg-orange-50/50 hover:text-slate-900'
      }`}
    onClick={onClick}
    role="button"
    tabIndex={0}
  >
    <div
      className={`flex-shrink-0 transition-colors ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white'
        }`}
    >
      {icon}
    </div>
    <span className={`sidebar-nav-item-title font-medium whitespace-nowrap overflow-hidden text-ellipsis ${isActive ? 'text-slate-900 dark:text-white' : ''}`}>
      {label}
    </span>
  </div>
);

GlobalNavItem.propTypes = {
  isActive: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
  icon: PropTypes.element.isRequired,
};

export default GlobalNavItem;
