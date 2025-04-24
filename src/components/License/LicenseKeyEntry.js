// src/components/License/LicenseKeyEntry.js
import React, { useState } from 'react';
import { useTask } from '../contexts/TaskContext';

const LicenseKeyEntry = ({ onSuccess, onCancel }) => {
  const { applyLicenseKey } = useTask();
  const [licenseKey, setLicenseKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setLicenseKey(e.target.value);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!licenseKey.trim()) {
      setError('Please enter a license key');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await applyLicenseKey(licenseKey);
      
      if (result.success) {
        setSuccess('License key applied successfully!');
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 1500);
      } else {
        setError(result.error || 'Invalid license key');
      }
    } catch (err) {
      console.error('Error applying license key:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      padding: '24px',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      <h2 style={{ 
        fontSize: '1.25rem', 
        fontWeight: 'bold', 
        marginBottom: '16px',
        textAlign: 'center'
      }}>
        Enter License Key
      </h2>
      
      <p style={{ 
        marginBottom: '16px',
        color: '#6b7280',
        textAlign: 'center' 
      }}>
        Enter your license key to create additional projects.
      </p>
      
      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          color: '#b91c1c',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}
      
      {success && (
        <div style={{
          backgroundColor: '#d1fae5',
          color: '#065f46',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label 
            htmlFor="licenseKey"
            style={{ 
              display: 'block', 
              fontWeight: 'bold', 
              marginBottom: '4px' 
            }}
          >
            License Key
          </label>
          <input
            id="licenseKey"
            type="text"
            value={licenseKey}
            onChange={handleChange}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              fontSize: '16px'
            }}
          />
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          gap: '16px',
          marginTop: '24px'
        }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: '#10b981',
              color: 'white',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            {isSubmitting ? 'Applying...' : 'Apply License Key'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LicenseKeyEntry;