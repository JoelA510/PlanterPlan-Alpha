import PropTypes from 'prop-types';

const GlobalNavItem = ({ isActive, onClick, label, icon }) => (
  <div
    className={`sidebar-nav-item group flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 cursor-pointer ${isActive
      ? 'bg-gradient-to-r from-orange-100 to-white border-l-4 border-l-orange-500 border-y border-r border-y-orange-100 border-r-transparent dark:from-slate-800 dark:to-slate-800/50 dark:border-l-orange-500 dark:border-y-transparent dark:border-r-transparent text-slate-900 dark:text-white shadow-sm dark:shadow-none font-semibold'
      : 'text-muted-foreground hover:bg-gradient-to-r hover:from-orange-50 hover:to-transparent hover:border-orange-100/50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
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
