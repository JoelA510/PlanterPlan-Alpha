import { ROLES } from '@/app/constants/index';
const RoleIndicator = ({ role }) => {
  const normalizedRole = role ? role.toLowerCase() : ROLES.VIEWER;
  const roleColors = {
    [ROLES.OWNER]: 'bg-brand-50 text-brand-700 border-brand-200',
    [ROLES.ADMIN]: 'bg-purple-50 text-purple-700 border-purple-200',
    [ROLES.EDITOR]: 'bg-sky-50 text-sky-700 border-sky-200',
    [ROLES.COACH]: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    [ROLES.VIEWER]: 'bg-slate-50 text-slate-700 border-slate-200',
    [ROLES.LIMITED]: 'bg-amber-50 text-amber-700 border-amber-200',
    default: 'bg-slate-50 text-slate-700 border-slate-200',
  };
  const colorClass = roleColors[normalizedRole] || roleColors.default;
  const label = normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1);
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border capitalize ${colorClass}`}
      aria-label={`Role: ${label}`}
    >
      {label}
    </span>
  );
};
export default RoleIndicator;
