import React from 'react';
import { Link } from 'react-router-dom';
import OrganizationSelector from './OrganizationSelector';
import { useOrganization } from './contexts/OrganizationProvider';

const SideNavigation = () => {
  const { organization, loading } = useOrganization();
  
  // Base path will be organization-aware if in org context
  const basePath = organization ? `/org/${organization.subdomain}` : '';
  const isInOrgContext = !!organization;
  
  return (
    <nav style={{ 
      width: "240px", 
      backgroundColor: "#1e293b", 
      color: "white",
      padding: "20px"
    }}>
      {/* Display org name if in org context, otherwise display app name */}
      <h2 style={{ 
        fontSize: "1.25rem", 
        fontWeight: "bold",
        marginBottom: "20px",
        color: "white"
      }}>
        {isInOrgContext ? organization.organization_name : "PlanterPlan"}
      </h2>
      
      <Link to={`${basePath}/dashboard`} style={{ 
        display: "block", 
        padding: "10px", 
        color: "#94a3b8",
        textDecoration: "none",
        marginBottom: "10px"
      }}>
        Dashboard
      </Link>
      
      <Link to={`${basePath}/tasks`} style={{ 
        display: "block", 
        padding: "10px", 
        color: "#94a3b8",
        textDecoration: "none",
        marginBottom: "10px"
      }}>
        Projects
      </Link>
      
      <Link to={`${basePath}/templates`} style={{ 
        display: "block", 
        padding: "10px", 
        color: "#94a3b8",
        textDecoration: "none",
        marginBottom: "10px"
      }}>
        Templates
      </Link>
      
      <Link to={`${basePath}/settings`} style={{ 
        display: "block", 
        padding: "10px", 
        color: "#94a3b8",
        textDecoration: "none",
        marginBottom: "10px"
      }}>
        Settings
      </Link>
      
      {/* Only show the divider and organization selector if NOT in org context */}
      {!isInOrgContext && (
        <>
          <hr style={{ margin: "20px 0", borderColor: "#475569" }} />
          <OrganizationSelector />
        </>
      )}
      
      {/* If in org context, show a link to go back to main app */}
      {isInOrgContext && (
        <div style={{ marginTop: "auto", paddingTop: "20px" }}>
          <Link to="/" style={{ 
            display: "block", 
            padding: "10px", 
            color: "#94a3b8",
            textDecoration: "none",
            backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: "4px",
            marginTop: "20px",
            textAlign: "center"
          }}>
            Back to Main App
          </Link>
        </div>
      )}
    </nav>
  );
};

export default SideNavigation;