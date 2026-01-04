import { ROLES } from '../constants';

const RoleIndicator = ({ role }) => {
  // ...
  const roleColors = {
    [ROLES.OWNER]: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    admin: 'bg-purple-50 text-purple-700 border-purple-200', // Keep admin for legacy/future
    [ROLES.EDITOR]: 'bg-blue-50 text-blue-700 border-blue-200',
    [ROLES.VIEWER]: 'bg-slate-50 text-slate-700 border-slate-200',
    default: 'bg-gray-50 text-gray-700 border-gray-200',
  };

  const colorClass = roleColors[normalizedRole] || roleColors.default;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize ${colorClass}`}
      aria-label={`Role: ${label}`}
    >
      {label}
    </span>
  );
};

export default RoleIndicator;
