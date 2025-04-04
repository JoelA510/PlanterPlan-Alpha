import React, { useState, useEffect } from 'react';

const AppearanceSettings = ({ saveSettings, initialSettings }) => {
  // Default settings
  const defaultSettings = {
    colors: {
      primary: '#10b981', // Green from your existing UI
      secondary: '#3b82f6', // Blue from your existing UI
      tertiary: '#f59e0b', // Amber/orange as tertiary option
      background: '#ffffff',
      text: '#1f2937'
    },
    typography: {
      fontFamily: 'Inter, sans-serif',
      headingSize: '1.5rem',
      bodySize: '1rem',
      buttonSize: '0.875rem'
    },
    logo: {
      url: '/logo.png',
      altText: 'Company Logo',
      maxHeight: '40px'
    }
  };

  // Initialize state with passed settings or defaults
  const [settings, setSettings] = useState(initialSettings || defaultSettings);
  const [previewStyle, setPreviewStyle] = useState({});
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);

  // Set of font options
  const fontOptions = [
    'Inter, sans-serif',
    'Roboto, sans-serif',
    'Poppins, sans-serif',
    'Montserrat, sans-serif',
    'Open Sans, sans-serif',
    'Lato, sans-serif',
    'Arial, sans-serif',
    'Helvetica, sans-serif',
    'System UI, sans-serif'
  ];

  // Update settings when props change
  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

  // Generate preview styles
  useEffect(() => {
    setPreviewStyle({
      fontFamily: settings.typography.fontFamily,
      '--primary-color': settings.colors.primary,
      '--secondary-color': settings.colors.secondary,
      '--tertiary-color': settings.colors.tertiary,
      '--background-color': settings.colors.background,
      '--text-color': settings.colors.text,
    });
  }, [settings]);

  // Handle color changes
  const handleColorChange = (colorType, value) => {
    setSettings(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        [colorType]: value
      }
    }));
    setUnsavedChanges(true);
  };

  // Handle typography changes
  const handleTypographyChange = (typographyType, value) => {
    setSettings(prev => ({
      ...prev,
      typography: {
        ...prev.typography,
        [typographyType]: value
      }
    }));
    setUnsavedChanges(true);
  };

  // Handle logo upload
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const logoUrl = event.target.result;
        setLogoPreview(logoUrl);
        setSettings(prev => ({
          ...prev,
          logo: {
            ...prev.logo,
            url: logoUrl,
            originalFile: file
          }
        }));
        setUnsavedChanges(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    saveSettings(settings);
    setUnsavedChanges(false);
  };

  // Reset to defaults
  const handleReset = () => {
    setSettings(defaultSettings);
    setLogoPreview(null);
    setUnsavedChanges(true);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '24px' }}>
        Appearance Settings
      </h1>
      
      <form onSubmit={handleSubmit}>
        {/* Colors Section */}
        <section style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px' }}>
            Colors
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            {/* Primary Color */}
            <div>
              <label htmlFor="primaryColor" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Primary Color
              </label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="color"
                  id="primaryColor"
                  value={settings.colors.primary}
                  onChange={(e) => handleColorChange('primary', e.target.value)}
                  style={{ 
                    width: '40px',
                    height: '40px',
                    borderRadius: '4px',
                    border: '1px solid #d1d5db',
                    padding: '2px',
                    marginRight: '8px'
                  }}
                />
                <input
                  type="text"
                  value={settings.colors.primary}
                  onChange={(e) => handleColorChange('primary', e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #d1d5db'
                  }}
                  placeholder="#RRGGBB"
                />
              </div>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
                Used for primary buttons and accents
              </p>
            </div>
            
            {/* Secondary Color */}
            <div>
              <label htmlFor="secondaryColor" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Secondary Color
              </label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="color"
                  id="secondaryColor"
                  value={settings.colors.secondary}
                  onChange={(e) => handleColorChange('secondary', e.target.value)}
                  style={{ 
                    width: '40px',
                    height: '40px',
                    borderRadius: '4px',
                    border: '1px solid #d1d5db',
                    padding: '2px',
                    marginRight: '8px'
                  }}
                />
                <input
                  type="text"
                  value={settings.colors.secondary}
                  onChange={(e) => handleColorChange('secondary', e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #d1d5db'
                  }}
                  placeholder="#RRGGBB"
                />
              </div>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
                Used for secondary buttons and highlights
              </p>
            </div>
            
            {/* Tertiary Color */}
            <div>
              <label htmlFor="tertiaryColor" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Tertiary Color
              </label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="color"
                  id="tertiaryColor"
                  value={settings.colors.tertiary}
                  onChange={(e) => handleColorChange('tertiary', e.target.value)}
                  style={{ 
                    width: '40px',
                    height: '40px',
                    borderRadius: '4px',
                    border: '1px solid #d1d5db',
                    padding: '2px',
                    marginRight: '8px'
                  }}
                />
                <input
                  type="text"
                  value={settings.colors.tertiary}
                  onChange={(e) => handleColorChange('tertiary', e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #d1d5db'
                  }}
                  placeholder="#RRGGBB"
                />
              </div>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
                Used for accents and alerts
              </p>
            </div>
            
            {/* Background Color */}
            <div>
              <label htmlFor="backgroundColor" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Background Color
              </label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="color"
                  id="backgroundColor"
                  value={settings.colors.background}
                  onChange={(e) => handleColorChange('background', e.target.value)}
                  style={{ 
                    width: '40px',
                    height: '40px',
                    borderRadius: '4px',
                    border: '1px solid #d1d5db',
                    padding: '2px',
                    marginRight: '8px'
                  }}
                />
                <input
                  type="text"
                  value={settings.colors.background}
                  onChange={(e) => handleColorChange('background', e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #d1d5db'
                  }}
                  placeholder="#RRGGBB"
                />
              </div>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
                Page background color
              </p>
            </div>
            
            {/* Text Color */}
            <div>
              <label htmlFor="textColor" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Text Color
              </label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="color"
                  id="textColor"
                  value={settings.colors.text}
                  onChange={(e) => handleColorChange('text', e.target.value)}
                  style={{ 
                    width: '40px',
                    height: '40px',
                    borderRadius: '4px',
                    border: '1px solid #d1d5db',
                    padding: '2px',
                    marginRight: '8px'
                  }}
                />
                <input
                  type="text"
                  value={settings.colors.text}
                  onChange={(e) => handleColorChange('text', e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #d1d5db'
                  }}
                  placeholder="#RRGGBB"
                />
              </div>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
                Main text color
              </p>
            </div>
          </div>
        </section>
        
        {/* Typography Section */}
        <section style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px' }}>
            Typography
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
            {/* Font Family */}
            <div>
              <label htmlFor="fontFamily" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Font Family
              </label>
              <select
                id="fontFamily"
                value={settings.typography.fontFamily}
                onChange={(e) => handleTypographyChange('fontFamily', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #d1d5db'
                }}
              >
                {fontOptions.map((font) => (
                  <option key={font} value={font} style={{ fontFamily: font }}>
                    {font.split(',')[0]}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Heading Font Size */}
            <div>
              <label htmlFor="headingSize" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Heading Size
              </label>
              <input
                type="text"
                id="headingSize"
                value={settings.typography.headingSize}
                onChange={(e) => handleTypographyChange('headingSize', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #d1d5db'
                }}
                placeholder="1.5rem"
              />
            </div>
            
            {/* Body Font Size */}
            <div>
              <label htmlFor="bodySize" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Body Text Size
              </label>
              <input
                type="text"
                id="bodySize"
                value={settings.typography.bodySize}
                onChange={(e) => handleTypographyChange('bodySize', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #d1d5db'
                }}
                placeholder="1rem"
              />
            </div>
            
            {/* Button Font Size */}
            <div>
              <label htmlFor="buttonSize" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Button Text Size
              </label>
              <input
                type="text"
                id="buttonSize"
                value={settings.typography.buttonSize}
                onChange={(e) => handleTypographyChange('buttonSize', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #d1d5db'
                }}
                placeholder="0.875rem"
              />
            </div>
          </div>
        </section>
        
        {/* Logo Section */}
        <section style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px' }}>
            Logo
          </h2>
          
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="logoUpload" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Upload Logo
            </label>
            <input
              type="file"
              id="logoUpload"
              accept="image/*"
              onChange={handleLogoUpload}
              style={{ marginBottom: '16px' }}
            />
            
            <div style={{ 
              border: '1px dashed #d1d5db', 
              borderRadius: '4px', 
              padding: '16px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '80px',
              backgroundColor: '#f9fafb'
            }}>
              {logoPreview || settings.logo.url ? (
                <img 
                  src={logoPreview || settings.logo.url} 
                  alt={settings.logo.altText}
                  style={{ 
                    maxHeight: settings.logo.maxHeight,
                    maxWidth: '100%'
                  }}
                />
              ) : (
                <div style={{ color: '#6b7280', textAlign: 'center' }}>
                  <p>No logo uploaded</p>
                  <p style={{ fontSize: '0.75rem' }}>Recommended size: 200 x 40px</p>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <label htmlFor="logoAltText" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Logo Alt Text
            </label>
            <input
              type="text"
              id="logoAltText"
              value={settings.logo.altText}
              onChange={(e) => {
                setSettings(prev => ({
                  ...prev,
                  logo: {
                    ...prev.logo,
                    altText: e.target.value
                  }
                }));
                setUnsavedChanges(true);
              }}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #d1d5db'
              }}
              placeholder="Company Logo"
            />
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
              Alternative text for accessibility
            </p>
          </div>
        </section>
        
        {/* Preview Section */}
        <section style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px' }}>
            Preview
          </h2>
          
          <div style={{ 
            ...previewStyle,
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            padding: '24px',
            backgroundColor: settings.colors.background,
            color: settings.colors.text
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              {logoPreview || settings.logo.url ? (
                <img 
                  src={logoPreview || settings.logo.url} 
                  alt={settings.logo.altText}
                  style={{ maxHeight: settings.logo.maxHeight, marginRight: '16px' }}
                />
              ) : (
                <div style={{ 
                  width: '120px', 
                  height: '40px', 
                  backgroundColor: '#e5e7eb', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginRight: '16px',
                  fontSize: '0.75rem',
                  color: '#6b7280'
                }}>
                  Logo Placeholder
                </div>
              )}
              <h1 style={{ 
                margin: 0, 
                fontSize: settings.typography.headingSize,
                fontFamily: settings.typography.fontFamily
              }}>
                Your Application Name
              </h1>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ 
                fontSize: 'calc(' + settings.typography.headingSize + ' * 0.8)',
                fontFamily: settings.typography.fontFamily,
                color: settings.colors.text
              }}>
                Sample Header
              </h2>
              <p style={{ 
                fontSize: settings.typography.bodySize,
                fontFamily: settings.typography.fontFamily,
                color: settings.colors.text
              }}>
                This is sample paragraph text showing how your typography and colors will look in the application.
                This preview helps you visualize the changes before saving them.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                style={{
                  backgroundColor: settings.colors.primary,
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  fontSize: settings.typography.buttonSize,
                  fontFamily: settings.typography.fontFamily,
                  cursor: 'pointer'
                }}
              >
                Primary Button
              </button>
              
              <button 
                style={{
                  backgroundColor: settings.colors.secondary,
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  fontSize: settings.typography.buttonSize,
                  fontFamily: settings.typography.fontFamily,
                  cursor: 'pointer'
                }}
              >
                Secondary Button
              </button>
              
              <button 
                style={{
                  backgroundColor: settings.colors.tertiary,
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  fontSize: settings.typography.buttonSize,
                  fontFamily: settings.typography.fontFamily,
                  cursor: 'pointer'
                }}
              >
                Tertiary Button
              </button>
            </div>
          </div>
        </section>
        
        {/* Form Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
          <button
            type="button"
            onClick={handleReset}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              background: 'white',
              cursor: 'pointer'
            }}
          >
            Reset to Defaults
          </button>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            {unsavedChanges && (
              <p style={{ color: '#f59e0b', margin: '0', alignSelf: 'center' }}>
                You have unsaved changes
              </p>
            )}
            <button
              type="submit"
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                border: 'none',
                background: settings.colors.primary,
                color: 'white',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
              disabled={!unsavedChanges}
            >
              Save Changes
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AppearanceSettings;