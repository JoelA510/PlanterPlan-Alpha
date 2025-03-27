import React from 'react';
import { Link } from 'react-router-dom';
import { useOrganization } from './contexts/OrganizationProvider';

function OrganizationHeader() {
  const { organization } = useOrganization();
  
  if (!organization) return null;
  
  return (
    <header style={{ 
      backgroundColor: "white", 
      borderBottom: "1px solid #e5e7eb",
      padding: "16px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }}>
      <div style={{ display: "flex", gap: "16px" }}>
        <Link to={`/org/${organization.subdomain}/tasks`} style={{ 
          backgroundColor: "var(--primary-color, #3b82f6)", 
          color: "white",
          padding: "8px 16px",
          borderRadius: "4px",
          textDecoration: "none" 
        }}>
          Projects
        </Link>
        
        <Link to={`/org/${organization.subdomain}/templates`} style={{ 
          backgroundColor: "var(--secondary-color, #8b5cf6)", 
          color: "white",
          padding: "8px 16px",
          borderRadius: "4px",
          textDecoration: "none" 
        }}>
          Templates
        </Link>
      </div>
      <div>{organization.organization_name} User</div>
    </header>
  );
}

export default OrganizationHeader;