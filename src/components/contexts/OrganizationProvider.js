// contexts/OrganizationProvider.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

const OrganizationContext = createContext(null);

export function OrganizationProvider({ children }) {
  const { orgSlug } = useParams();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // In OrganizationProvider.js, enhance the useEffect:

useEffect(() => {
  async function fetchOrganization() {
    if (!orgSlug) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('white_label_orgs')
        .select('*')
        .eq('subdomain', orgSlug)
        .single();
      
      if (error || !data) {
        console.error('Error fetching organization:', error);
        navigate('/org-not-found');
        return;
      }
      
      setOrganization(data);
      
      // Apply organization branding
      document.documentElement.style.setProperty('--primary-color', data.primary_color || '#3b82f6');
      document.documentElement.style.setProperty('--secondary-color', data.secondary_color || '#10b981');
      
      // Set logo if available
      if (data.logo) {
        const logoElement = document.getElementById('org-logo');
        if (logoElement) {
          logoElement.src = data.logo;
        }
      }
      
      // Set page title
      document.title = `${data.organization_name} - PlanterPlan`;
      
    } catch (err) {
      console.error('Error in fetchOrganization:', err);
    } finally {
      setLoading(false);
    }
  }

  fetchOrganization();
}, [orgSlug, navigate]);
  
  return (
    <OrganizationContext.Provider value={{ organization, loading }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  
  if (context === undefined) {
    return { organization: null, loading: false };
  }
  
  return context;
}