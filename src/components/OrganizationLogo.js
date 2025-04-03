import React from 'react';
import { useOrganization } from './contexts/OrganizationProvider';

const OrganizationLogo = () => {
  const { organization, loading } = useOrganization();
  
  // Logo container styling
  const logoContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
  };

  // If there's no organization, still loading, or no logo, just display the app name
  if (loading || !organization || !organization.logo) {
    return (
      <div style={logoContainerStyle}>
        <h1 style={{ 
          color: 'white', 
          margin: 0, 
          fontSize: '1.5rem', 
          fontWeight: 'bold' 
        }}>
          {organization ? organization.organization_name : 'PlanterPlan'}
        </h1>
      </div>
    );
  }

  // Organization found and has a logo stored as SVG string
  return (
    <div style={logoContainerStyle}>
      {/* Render the SVG string directly using dangerouslySetInnerHTML */}
      
      <div
        style={{
            width: '90%', // Instead of maxWidth
            height: 'auto', // Allow height to adjust based on aspect ratio
            maxHeight: '80px', // Set a reasonable max height
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            // border: '1px solid red' // Debug border
        }}
        dangerouslySetInnerHTML={{ __html: organization.logo }}
        aria-label={`${organization.organization_name} logo`}
      />
    </div>
  );
};

export default OrganizationLogo;