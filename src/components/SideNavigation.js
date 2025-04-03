import React from 'react';
import { Link } from 'react-router-dom';
import OrganizationSelector from './OrganizationSelector';
import { useOrganization } from './contexts/OrganizationProvider';
import OrganizationLogo from './OrganizationLogo';
const SideNavigation = () => {
  const { organization, loading } = useOrganization();
  
  // Base path will be organization-aware if in org context
  const basePath = organization ? `/org/${organization.subdomain}` : '';
  const isInOrgContext = !!organization;
  console.log("Logo data exists:", !!organization?.logo);
  console.log('Logo data:', organization?.logo?.substring(0, 100));
  // Logo container styling
  const logoContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
    height: '60px' // Fixed height for logo area
  };
  
  return (
    <nav style={{ 
      width: "240px", 
      backgroundColor: "#1e293b", 
      color: "white",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      height: "100vh"
    }}>
      {/* Organization Logo Section */}
      <OrganizationLogo/>
      
      {/* Navigation Links */}
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
      
      {/* Show White Label Orgs link only when NOT in org context */}
      {!isInOrgContext && (
        <Link to="/white-label-orgs" style={{ 
          display: "block", 
          padding: "10px", 
          color: "#94a3b8",
          textDecoration: "none",
          marginBottom: "10px"
        }}>
          White Label Orgs
        </Link>
      )}
      
      <Link to={`${basePath}/settings`} style={{ 
        display: "block", 
        padding: "10px", 
        color: "#94a3b8",
        textDecoration: "none",
        marginBottom: "10px"
      }}>
        Settings
      </Link>
      
      {/* No organization selector now */}
      {!isInOrgContext && (
        <hr style={{ margin: "20px 0", borderColor: "#475569" }} />
      )}
      
      {/* Spacer to push the back button to the bottom */}
      {/* <div style={{ flexGrow: 1 }} /> */}
      
      {/* If in org context, show a link to go back to main app */}
      {isInOrgContext && (
        <div>
          <Link to="/" style={{ 
            display: "block", 
            padding: "10px", 
            color: "#94a3b8",
            textDecoration: "none",
            backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: "4px",
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