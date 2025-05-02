import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { fetchOrganizationBySlug } from '../../services/organizationService';

// Create a context for organization data
const OrganizationContext = createContext();

// Default Planter Plan organization data (fallback)
const DEFAULT_PLANTER_PLAN_ORG = {
  id: 'a7406b72-10ce-4ac1-a33c-715045b7347e',
  name: 'Planter Plan',
  organization_name: 'Planter Plan',
  subdomain: 'planter',
  primary_color: '#10b981',
  secondary_color: '#3b82f6',
  tertiary_color: '#8b5cf6',
  status: 'active'
};

// Custom hook to use the organization context
export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  
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
  // Only log on initial render, not on re-renders
  const renderCountRef = React.useRef(0);
  if (renderCountRef.current === 0) {
    console.log('OrganizationProvider rendering initially');
    renderCountRef.current++;
  }
  
  const { user, loading: userLoading } = useAuth();
  const params = useParams();
  const location = useLocation();
  
  const [organization, setOrganization] = useState(null);
  const [organizationId, setOrganizationId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(0);

  // Memoize the fetch function to prevent recreating it on every render
  const fetchOrganizationData = useCallback(async () => {
    // Skip fetching if it was done recently (e.g., within the last 5 seconds)
    const now = Date.now();
    if (now - lastFetchTime < 5000) {
      return;
    }
    
    try {
      setLoading(true);
      setLastFetchTime(now);
      
      // Parse the current path to check if we're in an org-specific route
      const path = location.pathname;
      const isOrgPath = path.includes('/org/');
      const orgSlug = params.orgSlug;
      
      // Case 1: URL contains org slug - fetch that specific organization
      if (isOrgPath && orgSlug) {
        const { data, error } = await fetchOrganizationBySlug(orgSlug);
        
        if (error) throw new Error(error);
        if (!data) throw new Error(`Organization with slug '${orgSlug}' not found`);
        
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
        setOrganization(DEFAULT_PLANTER_PLAN_ORG);
        setOrganizationId(DEFAULT_PLANTER_PLAN_ORG.id);
        
        // Apply default branding
        document.documentElement.style.setProperty('--primary-color', DEFAULT_PLANTER_PLAN_ORG.primary_color);
        document.documentElement.style.setProperty('--secondary-color', DEFAULT_PLANTER_PLAN_ORG.secondary_color);
        return;
      }
      
      // Case 3: User belongs to a white label org - use that org
      if (user?.profile?.white_label_org) {
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
      setOrganization(DEFAULT_PLANTER_PLAN_ORG);
      setOrganizationId(DEFAULT_PLANTER_PLAN_ORG.id);
      
      // Apply default branding
      document.documentElement.style.setProperty('--primary-color', DEFAULT_PLANTER_PLAN_ORG.primary_color);
      document.documentElement.style.setProperty('--secondary-color', DEFAULT_PLANTER_PLAN_ORG.secondary_color);
      
    } catch (err) {
      console.error('Error fetching organization:', err);
      setError(`Failed to load organization: ${err.message}`);
      
      // Fall back to default org on error
      setOrganization(DEFAULT_PLANTER_PLAN_ORG);
      setOrganizationId(DEFAULT_PLANTER_PLAN_ORG.id);
      
      // Apply default branding
      document.documentElement.style.setProperty('--primary-color', DEFAULT_PLANTER_PLAN_ORG.primary_color);
      document.documentElement.style.setProperty('--secondary-color', DEFAULT_PLANTER_PLAN_ORG.secondary_color);
    } finally {
      setLoading(false);
    }
  }, [params.orgSlug, location.pathname, user, lastFetchTime]);

  // Add visibility change listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Only fetch when document becomes visible and enough time has passed
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        // Only refetch if it's been more than 5 minutes since last fetch
        if (now - lastFetchTime > 300000) {
          fetchOrganizationData();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchOrganizationData, lastFetchTime]);

  // Main effect to fetch organization data
  useEffect(() => {
    if (!userLoading) {
      fetchOrganizationData();
    }
  }, [fetchOrganizationData, userLoading]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    organization,
    organizationId,
    loading,
    error
  }), [organization, organizationId, loading, error]);

  // Only render debug info when values change (not on every render)
  const debugString = JSON.stringify({ 
    organizationId, 
    organizationName: organization?.organization_name || organization?.name,
    loading,
    error
  });

  useEffect(() => {
    console.log('Organization context updated:', JSON.parse(debugString));
  }, [debugString]);

  return (
    <OrganizationContext.Provider value={contextValue}>
      {children}
    </OrganizationContext.Provider>
  );
};

// Export the context for advanced use cases
export default OrganizationContext;