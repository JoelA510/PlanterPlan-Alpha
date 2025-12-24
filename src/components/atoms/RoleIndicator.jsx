import React from 'react';
import '../../styles/components/role-indicator.css';

const RoleIndicator = ({ role }) => {
  if (!role) return null;

  const normalizedRole = role.toLowerCase();

  // Don't show anything for owners in their own list usually,
  // but if this is used in a "Joined Projects" context, it's useful.
  // However, if the role is unknown, maybe show nothing.

  const label = normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1);

  return (
    <span className={`role-indicator role-${normalizedRole}`} aria-label={`Role: ${label}`}>
      {label}
    </span>
  );
};

export default RoleIndicator;
