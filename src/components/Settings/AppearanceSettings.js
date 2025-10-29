import React, { useState, useEffect } from 'react';
import { useOrganization } from '../contexts/OrganizationProvider';
import { fetchAllOrganizations, updateOrganization } from '../../services/organizationService';

const AppearanceSettings = () => {
  const { organization, refreshOrganization } = useOrganization();
  const [appearanceData, setAppearanceData] = useState({
    primaryColor: '#10b981', // Default green
    secondaryColor: '#3b82f6', // Default blue
    tertiaryColor: '#f59e0b', // Default amber
    font: 'Inter, sans-serif',
    logo: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40" viewBox="0 0 100 40"><rect width="100" height="40" fill="#10b981" rx="4"></rect><text x="50" y="25" font-family="Arial" font-size="16" fill="white" text-anchor="middle">Logo SVG</text></svg>'
  });

  const [initialData, setInitialData] = useState(null);
  const [logoError, setLogoError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  
  const isOrgAdmin = !!organization;
  const hasChanges = initialData && JSON.stringify(initialData) !== JSON.stringify(appearanceData);

  // Load actual data from organization service
  useEffect(() => {
    const loadAppearanceData = async () => {
      setLoading(true);
      setError(null);
      setLogoError(false);
      
      try {
        // If we have an organization in context, use that data
        if (isOrgAdmin && organization) {
          const newData = {
            primaryColor: organization.primary_color || '#8b5cf6',
            secondaryColor: organization.secondary_color || '#3b82f6',
            tertiaryColor: organization.tertiary_color || '#f59e0b',
            font: organization.font || 'Inter, sans-serif',
            logo: organization.logo || '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40" viewBox="0 0 100 40"><rect width="100" height="40" fill="#8b5cf6" rx="4"></rect><text x="50" y="25" font-family="Arial" font-size="16" fill="white" text-anchor="middle">Org Logo</text></svg>'
          };
          
          setAppearanceData(newData);
          setInitialData(newData);
        } else {
          // For planter admin, get the first org with 'planter' in the name or first org
          const { data, error } = await fetchAllOrganizations();
          
          if (error) throw new Error(error);
          
          if (data && data.length > 0) {
            // Try to find a planter org or use the first one
            const planterOrg = data.find(org => 
              org.organization_name?.toLowerCase().includes('planter')
            ) || data[0];
            console.log(planterOrg);
            const newData = {
              primaryColor: planterOrg.primary_color || '#10b981',
              secondaryColor: planterOrg.secondary_color || '#3b82f6',
              tertiaryColor: planterOrg.tertiary_color || '#f59e0b',
              font: planterOrg.font || 'Inter, sans-serif',
              logo: planterOrg.logo || '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40" viewBox="0 0 100 40"><rect width="100" height="40" fill="#10b981" rx="4"></rect><text x="50" y="25" font-family="Arial" font-size="16" fill="white" text-anchor="middle">Default Logo</text></svg>'
            };
            
            setAppearanceData(newData);
            setInitialData(newData);
          }
        }
      } catch (err) {
        console.error('Error loading appearance data:', err);
        setError('Failed to load appearance settings. Using defaults.');
        // Keep the default values from initial state
      } finally {
        setLoading(false);
      }
    };
    
    loadAppearanceData();
  }, [organization, isOrgAdmin]);

  const handleLogoError = () => {
    console.log('Logo failed to load:', appearanceData.logo);
    setLogoError(true);
  };
  
  // Determine if the logo value is actually an SVG string
  const isSvgString = (str) => {
    return typeof str === 'string' && str.trim().startsWith('<svg');
  };
  
  // Determine if the logo value is a URL path
  const isImageUrl = (str) => {
    return typeof str === 'string' && 
      (str.startsWith('http') || 
       str.startsWith('/') || 
       str.startsWith('./') || 
       str.endsWith('.png') || 
       str.endsWith('.jpg') || 
       str.endsWith('.jpeg') || 
       str.endsWith('.gif'));
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setAppearanceData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle color picker changes
  const handleColorChange = (field, e) => {
    handleInputChange(field, e.target.value);
  };

  // Handle SVG logo changes
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // For SVG files
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const svgContent = event.target.result;
        handleInputChange('logo', svgContent);
      };
      reader.readAsText(file);
    }
    // For other image types, we'd typically upload to a server
    // and get back a URL, but for this example we'll use a placeholder
    else {
      alert('Only SVG files are supported for direct upload');
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    try {
      // Get the organization ID
      const orgId = organization?.id;
      if (!orgId) {
        throw new Error('No organization selected');
      }

      // Prepare the update data
      const updateData = {
        id: orgId,
        primary_color: appearanceData.primaryColor,
        secondary_color: appearanceData.secondaryColor,
        tertiary_color: appearanceData.tertiaryColor,
        font: appearanceData.font,  // changed from font_family
        logo: appearanceData.logo
      };

      // Call the API to update
      const { error } = await updateOrganization(updateData);
      
      if (error) throw new Error(error);
      
      // Update the initial data after successful save
      setInitialData(appearanceData);
      setIsEditing(false);
      
      // If refreshOrganization is available, refresh the org context
      if (refreshOrganization) {
        refreshOrganization();
      }
      
      alert('Appearance settings updated successfully!');
    } catch (err) {
      console.error('Error saving appearance settings:', err);
      setSaveError(`Failed to save appearance settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleEditMode = () => {
    if (isEditing && hasChanges) {
      if (window.confirm('You have unsaved changes. Discard changes?')) {
        setAppearanceData(initialData);
        setIsEditing(false);
      }
    } else {
      setIsEditing(!isEditing);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        Loading appearance settings...
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ 
          width: '24px', 
          height: '24px', 
          marginRight: '12px',
          color: '#6366f1'
        }}>🎨</div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
          Appearance Settings
        </h2>
      </div>
      
      {error && (
        <div style={{ 
          backgroundColor: '#fee2e2', 
          color: '#b91c1c', 
          padding: '12px', 
          borderRadius: '4px', 
          marginBottom: '20px' 
        }}>
          {error}
        </div>
      )}
      
      {saveError && (
        <div style={{ 
          backgroundColor: '#fee2e2', 
          color: '#b91c1c', 
          padding: '12px', 
          borderRadius: '4px', 
          marginBottom: '20px' 
        }}>
          {saveError}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gap: '20px', marginBottom: '32px' }}>
          <div style={{ 
            backgroundColor: 'white', 
            // border: '1px solid #e5e7eb', 
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: '#e5e7eb',
            borderRadius: '4px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '16px' }}>Color Scheme</h3>
            
            <div style={{ display: 'grid', gap: '16px' }}>
              {/* Primary Color */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontWeight: '500' }}>Primary Color:</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isEditing ? (
                    <input 
                      type="color"
                      value={appearanceData.primaryColor}
                      onChange={(e) => handleColorChange('primaryColor', e)}
                      style={{
                        width: '40px',
                        height: '40px',
                        padding: '0',
                        // border: '1px solid #e5e7eb',
                        borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: '#e5e7eb',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    />
                  ) : (
                    <div 
                      style={{ 
                        width: '24px', 
                        height: '24px', 
                        backgroundColor: appearanceData.primaryColor,
                        borderRadius: '4px',
                        // border: '1px solid #e5e7eb'
                        borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: '#e5e7eb',
                      }} 
                    />
                  )}
                  {isEditing ? (
                    <input 
                      type="text"
                      value={appearanceData.primaryColor}
                      onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                      placeholder="#000000"
                      style={{
                        padding: '8px',
                        // border: '1px solid #e5e7eb',
                        borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: '#e5e7eb',
                        borderRadius: '4px',
                        width: '100px'
                      }}
                    />
                  ) : (
                    <span>{appearanceData.primaryColor}</span>
                  )}
                </div>
              </div>
              
              {/* Secondary Color */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontWeight: '500' }}>Secondary Color:</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isEditing ? (
                    <input 
                      type="color"
                      value={appearanceData.secondaryColor}
                      onChange={(e) => handleColorChange('secondaryColor', e)}
                      style={{
                        width: '40px',
                        height: '40px',
                        padding: '0',
                        // border: '1px solid #e5e7eb',
                        borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: '#e5e7eb',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    />
                  ) : (
                    <div 
                      style={{ 
                        width: '24px', 
                        height: '24px', 
                        backgroundColor: appearanceData.secondaryColor,
                        borderRadius: '4px',
                        // border: '1px solid #e5e7eb',
                        borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: '#e5e7eb',
                      }} 
                    />
                  )}
                  {isEditing ? (
                    <input 
                      type="text"
                      value={appearanceData.secondaryColor}
                      onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                      placeholder="#000000"
                      style={{
                        padding: '8px',
                        // border: '1px solid #e5e7eb',
                        borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: '#e5e7eb',
                        borderRadius: '4px',
                        width: '100px'
                      }}
                    />
                  ) : (
                    <span>{appearanceData.secondaryColor}</span>
                  )}
                </div>
              </div>
              
              {/* Tertiary Color */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontWeight: '500' }}>Tertiary Color:</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isEditing ? (
                    <input 
                      type="color"
                      value={appearanceData.tertiaryColor}
                      onChange={(e) => handleColorChange('tertiaryColor', e)}
                      style={{
                        width: '40px',
                        height: '40px',
                        padding: '0',
                        // border: '1px solid #e5e7eb',
                        borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: '#e5e7eb',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    />
                  ) : (
                    <div 
                      style={{ 
                        width: '24px', 
                        height: '24px', 
                        backgroundColor: appearanceData.tertiaryColor,
                        borderRadius: '4px',
                        // border: '1px solid #e5e7eb',
                        borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: '#e5e7eb',
                      }} 
                    />
                  )}
                  {isEditing ? (
                    <input 
                      type="text"
                      value={appearanceData.tertiaryColor}
                      onChange={(e) => handleInputChange('tertiaryColor', e.target.value)}
                      placeholder="#000000"
                      style={{
                        padding: '8px',
                        // border: '1px solid #e5e7eb',
                        borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: '#e5e7eb',
                        borderRadius: '4px',
                        width: '100px'
                      }}
                    />
                  ) : (
                    <span>{appearanceData.tertiaryColor}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ 
            backgroundColor: 'white', 
            // border: '1px solid #e5e7eb', 
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: '#e5e7eb',
            borderRadius: '4px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '16px' }}>Typography</h3>
            
            {/* Font */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontWeight: '500' }}>Font:</div>
              {isEditing ? (
                <select 
                  value={appearanceData.font}
                  onChange={(e) => handleInputChange('font', e.target.value)}
                  style={{
                    padding: '8px',
                    // border: '1px solid #e5e7eb',
                    borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: '#e5e7eb',
                    borderRadius: '4px',
                    maxWidth: '300px'
                  }}
                >
                  <option value="Inter, sans-serif">Inter</option>
                  <option value="Roboto, sans-serif">Roboto</option>
                  <option value="Poppins, sans-serif">Poppins</option>
                  <option value="Open Sans, sans-serif">Open Sans</option>
                  <option value="Montserrat, sans-serif">Montserrat</option>
                  <option value="Lato, sans-serif">Lato</option>
                  <option value="Source Sans Pro, sans-serif">Source Sans Pro</option>
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="Helvetica, sans-serif">Helvetica</option>
                </select>
              ) : (
                <div style={{ fontFamily: appearanceData.font }}>
                  {appearanceData.font}
                </div>
              )}
            </div>
          </div>
          
          <div style={{ 
            backgroundColor: 'white', 
            // border: '1px solid #e5e7eb', 
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: '#e5e7eb',
            borderRadius: '4px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '16px' }}>Branding</h3>
            
            {/* Logo - with smart handling for both URL and SVG content */}
            <div>
              <div style={{ 
                fontWeight: '500',
                marginBottom: '12px'
              }}>
                Logo:
              </div>
              <div>
                {logoError ? (
                  <div style={{ 
                    // border: '1px solid #e5e7eb',
                    borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: '#e5e7eb',
                    borderRadius: '4px',
                    padding: '8px 12px',
                    backgroundColor: '#f3f4f6',
                    color: '#6b7280',
                    fontSize: '0.875rem'
                  }}>
                    Logo not available
                  </div>
                ) : isSvgString(appearanceData.logo) ? (
                  <div>
                    <img 
                      src={`data:image/svg+xml,${encodeURIComponent(appearanceData.logo)}`}
                      alt="Logo (SVG)"
                      style={{ 
                        maxHeight: '40px',
                        maxWidth: '200px',
                        display: 'block',
                        marginBottom: '12px'
                      }}
                      onError={handleLogoError}
                    />
                  </div>
                ) : isImageUrl(appearanceData.logo) ? (
                  <div>
                    <img 
                      src={appearanceData.logo} 
                      alt="Logo (URL)" 
                      style={{ 
                        maxHeight: '40px',
                        maxWidth: '200px',
                        // border: '1px solid #e5e7eb',
                        borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: '#e5e7eb',
                        borderRadius: '4px',
                        padding: '4px',
                        display: 'block',
                        marginBottom: '12px'
                      }} 
                      onError={handleLogoError}
                    />
                  </div>
                ) : (
                  <div style={{ 
                    // border: '1px solid #e5e7eb',
                    borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: '#e5e7eb',
                    borderRadius: '4px',
                    padding: '8px 12px',
                    backgroundColor: '#f3f4f6',
                    color: '#6b7280',
                    fontSize: '0.875rem'
                  }}>
                    Logo format not recognized
                  </div>
                )}
                
                {isEditing && (
                  <div style={{ marginTop: '12px' }}>
                    <label 
                      htmlFor="logo-upload" 
                      style={{
                        display: 'inline-block',
                        padding: '8px 16px',
                        backgroundColor: '#f3f4f6',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      Upload SVG Logo
                    </label>
                    <input 
                      id="logo-upload"
                      type="file"
                      accept=".svg,image/svg+xml"
                      onChange={handleLogoChange}
                      style={{ display: 'none' }}
                    />
                    <p style={{ 
                      fontSize: '0.75rem', 
                      color: '#6b7280',
                      marginTop: '4px'
                    }}>
                      Only SVG files are supported for direct upload.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div style={{ 
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '16px 0',
          borderTop: '1px solid #e5e7eb',
          gap: '12px'
        }}>
          {isEditing ? (
            <>
              <button 
                type="button"
                onClick={toggleEditMode}
                style={{
                  backgroundColor: 'white',
                  color: '#4b5563',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={saving || !hasChanges}
                style={{
                  backgroundColor: hasChanges ? appearanceData.primaryColor : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  cursor: hasChanges ? 'pointer' : 'not-allowed',
                  fontWeight: '500',
                  opacity: hasChanges ? 1 : 0.7
                }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button 
              type="button"
              onClick={toggleEditMode}
              style={{
                backgroundColor: appearanceData.primaryColor || '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '8px 16px',
                cursor: 'pointer',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              ✏️ Edit Appearance
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default AppearanceSettings;