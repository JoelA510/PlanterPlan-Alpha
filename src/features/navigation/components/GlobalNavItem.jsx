import PropTypes from 'prop-types';

const GlobalNavItem = ({ isActive, onClick, label, icon }) => (
  <div
    className={`sidebar-nav-item group ${isActive ? 'selected' : ''}`}
    onClick={onClick}
    role="button"
    tabIndex={0}
  >
    <div
      className={`text-muted-foreground group-hover:text-card-foreground ${isActive ? 'text-brand-600 dark:text-brand-400' : ''}`}
    >
      {icon}
    </div>
    <span className={`sidebar-nav-item-title ${isActive ? 'text-brand-700 dark:text-brand-300 font-semibold' : ''}`}>
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
