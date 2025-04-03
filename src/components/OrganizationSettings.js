import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const OrganizationSettings = () => {
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  useEffect(() => {
    fetchOrganization();
  }, []);

  const fetchOrganization = async () => {
    try {
      setLoading(true);
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');
      
      // Fetch the organization where the current user is the admin
      const { data, error } = await supabase
        .from('white_label_orgs')
        .select('*')
        .eq('admin_user_id', user.id)
        .single();
      
      if (error) throw error;
      
      setOrg(data);
      if (data.logo) {
        setLogoPreview(data.logo);
      }
    } catch (err) {
      console.error('Error fetching organization:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Only allow SVG files
    if (file.type !== 'image/svg+xml') {
      setError('Please upload an SVG file');
      return;
    }
    
    setLogoFile(file);
    
    // Read the SVG content as text
    const reader = new FileReader();
    reader.onloadend = () => {
      // reader.result contains the SVG string
      setLogoPreview(reader.result);
    };
    reader.readAsText(file); // Use readAsText instead of readAsDataURL
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage('');
      
      // If a new logo file is selected, read its content as SVG string
      if (logoFile) {
        // We already read the SVG content in handleLogoChange and stored it in logoPreview
        // Now we just need to save this SVG string to the database
        
        // Check if the SVG is valid
        if (!logoPreview || !logoPreview.includes('<svg')) {
          throw new Error('Invalid SVG file');
        }
        
        // Sanitize the SVG string if needed (optional security measure)
        // You might want to use a library like DOMPurify for production use
        const svgString = logoPreview;
        
        // Update the organization record with the SVG string
        const { error: updateError } = await supabase
          .from('white_label_orgs')
          .update({ logo: svgString })
          .eq('id', org.id);
        
        if (updateError) throw updateError;
        
        // Update local state
        setOrg({ ...org, logo: svgString });
        setSuccessMessage('Organization logo updated successfully!');
        
        // Reset file input
        setLogoFile(null);
      } else {
        setError('No file selected');
        return;
      }
    } catch (err) {
      console.error('Error updating organization:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading organization settings...</div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '24px' }}>
        Organization Settings
      </h1>
      
      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          color: '#b91c1c',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '16px'
        }}>
          {error}
        </div>
      )}
      
      {successMessage && (
        <div style={{
          backgroundColor: '#d1fae5',
          color: '#065f46',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '16px'
        }}>
          {successMessage}
        </div>
      )}
      
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
          Organization Logo
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: 'bold' 
            }}>
              Current Logo
            </label>
            
            <div style={{ 
              width: '100%', 
              height: '120px', 
              border: '1px dashed #d1d5db',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f9fafb',
              marginBottom: '16px'
            }}>
              {logoPreview ? (
                <div 
                  dangerouslySetInnerHTML={{ __html: logoPreview }}
                  style={{ maxWidth: '80%', maxHeight: '100px' }}
                  aria-label="Organization logo preview"
                />
              ) : (
                <span style={{ color: '#6b7280' }}>No logo uploaded</span>
              )}
            </div>
            
            <input
              type="file"
              accept=".svg,image/svg+xml"
              onChange={handleLogoChange}
              style={{ marginBottom: '16px' }}
            />
            
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              Please upload an SVG file. Make sure your SVG has a viewBox attribute.
            </div>
          </div>
          
          <button
            type="submit"
            disabled={saving || !logoFile}
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '4px',
              border: 'none',
              cursor: saving || !logoFile ? 'not-allowed' : 'pointer',
              opacity: saving || !logoFile ? 0.7 : 1
            }}
          >
            {saving ? 'Saving...' : 'Save Logo'}
          </button>
        </form>
      </div>
      
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        padding: '24px'
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
          Organization Details
        </h2>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontWeight: 'bold' }}>Organization Name</label>
          <div>{org.organization_name}</div>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontWeight: 'bold' }}>Subdomain</label>
          <div>{org.subdomain}.planter-plan.vercel.app</div>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontWeight: 'bold' }}>Status</label>
          <div>
            <span style={{
              backgroundColor: org.status === 'active' ? '#d1fae5' : '#fee2e2',
              color: org.status === 'active' ? '#065f46' : '#b91c1c',
              padding: '2px 8px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 'bold',
              textTransform: 'uppercase'
            }}>
              {org.status}
            </span>
          </div>
        </div>
        
        <div>
          <label style={{ fontWeight: 'bold' }}>Created At</label>
          <div>{new Date(org.created_at).toLocaleDateString()}</div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationSettings;