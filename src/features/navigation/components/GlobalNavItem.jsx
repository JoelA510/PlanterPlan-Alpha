import PropTypes from 'prop-types';

const GlobalNavItem = ({ isActive, onClick, label, icon }) => (
  <div
    className={`sidebar-nav-item group ${isActive ? 'bg-brand-50 dark:bg-brand-500/10 border-l-brand-600 dark:border-l-brand-500' : 'hover:bg-accent hover:text-accent-foreground border-transparent'}`}
    onClick={onClick}
    role="button"
    tabIndex={0}
  >
    <div
      className={`group-hover:text-foreground ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-muted-foreground'}`}
    >
      {icon}
    </div>
    <span className={`sidebar-nav-item-title ${isActive ? 'text-brand-700 dark:text-brand-300 font-semibold' : 'text-muted-foreground group-hover:text-foreground'}`}>
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
