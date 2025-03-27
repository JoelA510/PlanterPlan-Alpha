// src/components/contexts/OrganizationProvider.js
import { createContext, useContext, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchOrganizationBySlug } from '../../services/organizationService';

const OrganizationContext = createContext(null);

// In src/components/contexts/OrganizationProvider.js
export function OrganizationProvider({ children }) {
  const { orgSlug } = useParams();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  
  console.log('OrganizationProvider rendered with orgSlug:', orgSlug);
  
  useEffect(() => {
    async function fetchOrganization() {
      if (!orgSlug) {
        console.log('No orgSlug provided, skipping fetch');
        setLoading(false);
        return;
      }
      setLoading(true); // Set loading to true when starting fetch
      console.log('Fetching organization with slug:', orgSlug);
      try {
        const { data, error } = await fetchOrganizationBySlug(orgSlug);
        
        console.log('Organization API response:', { data, error });
        
        if (error || !data) {
          console.error('Error fetching organization:', error);
          setLoading(false);
          return;
        }
        
        // console.log('Setting organization state to:', data);
        setOrganization(data);
        
        // Apply organization branding
        document.documentElement.style.setProperty('--primary-color', data.primary_color || '#3b82f6');
        document.documentElement.style.setProperty('--secondary-color', data.secondary_color || '#10b981');
      } catch (err) {
        console.error('Error in fetchOrganization:', err);
      } finally {
        setLoading(false);
      }
    }
  
    fetchOrganization();
  }, [orgSlug, navigate]);
  
  // Log current state after useEffect
  // console.log('OrganizationProvider current state:', { 
  //   orgSlug,
  //   organization, 
  //   loading 
  // });
  
  return (
    <OrganizationContext.Provider value={{ organization, organizationId: organization?.id, loading }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  
  if (context === undefined || context === null) {
    // Return an object with default values
    return { organization: null, organizationId: null, loading: false };
  }
  
  return context;
}

