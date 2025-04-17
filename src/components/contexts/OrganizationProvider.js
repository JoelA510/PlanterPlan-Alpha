import React, { createContext, useState, useContext, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { fetchOrganizationBySlug } from '../../services/organizationService';

// Create a context for organization data
const OrganizationContext = createContext();

// Default Planter Plan organization data (fallback)
const DEFAULT_PLANTER_PLAN_ORG = {
  id: 'a7406b72-10ce-4ac1-a33c-715045b7347e', // Replace with your actual default org ID
  name: 'Planter Plan',
  organization_name: 'Planter Plan', // Using both for compatibility
  subdomain: 'planter',
  primary_color: '#10b981',     // Default green color
  secondary_color: '#3b82f6',   // Default blue color
  tertiary_color: '#8b5cf6',    // Default purple color
  status: 'active'
};

// Custom hook to use the organization context
export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  
  // Provide default values if context is undefined
  if (context === undefined) {
    console.warn('useOrganization hook used outside of OrganizationProvider. Using default values.');
    return {
      organization: null,
      organizationId: null,
      loading: false,
      error: null
    };
  }
  
  return context;
};

export const OrganizationProvider = ({ children }) => {
  console.log('OrganizationProvider rendering');
  
  const { user, loading: userLoading } = useAuth();
  const params = useParams();
  const location = useLocation();
  
  const [organization, setOrganization] = useState(null);
  const [organizationId, setOrganizationId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrganizationData = async () => {
      try {
        setLoading(true);
        
        // Parse the current path to check if we're in an org-specific route
        const path = location.pathname;
        const isOrgPath = path.includes('/org/');
        const orgSlug = params.orgSlug;
        
        console.log('Organization path check:', { path, isOrgPath, orgSlug });
        
        // Case 1: URL contains org slug - fetch that specific organization
        if (isOrgPath && orgSlug) {
          console.log('Fetching organization by slug:', orgSlug);
          const { data, error } = await fetchOrganizationBySlug(orgSlug);
          
          if (error) throw new Error(error);
          if (!data) throw new Error(`Organization with slug '${orgSlug}' not found`);
          
          console.log('Setting organization from API:', data);
          setOrganization(data);
          setOrganizationId(data.id);
          
          // Apply organization branding
          if (data.primary_color) {
            document.documentElement.style.setProperty('--primary-color', data.primary_color);
          }
          if (data.secondary_color) {
            document.documentElement.style.setProperty('--secondary-color', data.secondary_color);
          }
          return;
        }
        
        // Case 2: URL is for admin or user (without org prefix) - use default Planter Plan
        if (path.includes('/admin') || path.includes('/user')) {
          console.log('Setting default Planter Plan organization');
          setOrganization(DEFAULT_PLANTER_PLAN_ORG);
          setOrganizationId(DEFAULT_PLANTER_PLAN_ORG.id);
          
          // Apply default branding
          document.documentElement.style.setProperty('--primary-color', DEFAULT_PLANTER_PLAN_ORG.primary_color);
          document.documentElement.style.setProperty('--secondary-color', DEFAULT_PLANTER_PLAN_ORG.secondary_color);
          return;
        }
        
        // Case 3: User belongs to a white label org - use that org
        if (user?.profile?.white_label_org) {
          console.log('Setting organization from user profile:', user.profile.white_label_org);
          setOrganization(user.profile.white_label_org);
          setOrganizationId(user.profile.white_label_org.id);
          
          // Apply organization branding from user profile
          const orgData = user.profile.white_label_org;
          if (orgData.primary_color) {
            document.documentElement.style.setProperty('--primary-color', orgData.primary_color);
          }
          if (orgData.secondary_color) {
            document.documentElement.style.setProperty('--secondary-color', orgData.secondary_color);
          }
          return;
        }
        
        // Default fallback - use Planter Plan
        console.log('No matching criteria - using default Planter Plan organization');
        setOrganization(DEFAULT_PLANTER_PLAN_ORG);
        setOrganizationId(DEFAULT_PLANTER_PLAN_ORG.id);
        
        // Apply default branding
        document.documentElement.style.setProperty('--primary-color', DEFAULT_PLANTER_PLAN_ORG.primary_color);
        document.documentElement.style.setProperty('--secondary-color', DEFAULT_PLANTER_PLAN_ORG.secondary_color);
        
      } catch (err) {
        console.error('Error fetching organization:', err);
        setError(`Failed to load organization: ${err.message}`);
        
        // Fall back to default org on error
        console.log('Falling back to default organization due to error');
        setOrganization(DEFAULT_PLANTER_PLAN_ORG);
        setOrganizationId(DEFAULT_PLANTER_PLAN_ORG.id);
        
        // Apply default branding
        document.documentElement.style.setProperty('--primary-color', DEFAULT_PLANTER_PLAN_ORG.primary_color);
        document.documentElement.style.setProperty('--secondary-color', DEFAULT_PLANTER_PLAN_ORG.secondary_color);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if user data has loaded
    if (!userLoading) {
      fetchOrganizationData();
    }
  }, [params.orgSlug, location.pathname, user, userLoading]);

  // Debug organization context value
  useEffect(() => {
    console.log('Organization context updated:', { 
      organizationId, 
      organizationName: organization?.organization_name || organization?.name,
      loading,
      error
    });
  }, [organization, organizationId, loading, error]);

  // Create the context value object
  const contextValue = {
    organization,
    organizationId,
    loading,
    error
  };

  return (
    <OrganizationContext.Provider value={contextValue}>
      {children}
    </OrganizationContext.Provider>
  );
};

// Export the context for advanced use cases
export default OrganizationContext;