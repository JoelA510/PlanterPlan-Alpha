import PropTypes from 'prop-types';
import StatusCard from './StatusCard';

const EmptyState = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}) => {
  const actions = (
    <>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="btn-primary"
        >
          {actionLabel}
        </button>
      )}
      {secondaryActionLabel && onSecondaryAction && (
        <button
          onClick={onSecondaryAction}
          className="btn-secondary"
        >
          {secondaryActionLabel}
        </button>
      )}
    </>
  );

  return (
    <StatusCard
      title={title}
      description={description}
      icon={icon}
      actions={actions}
      className="min-h-96"
    />
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
