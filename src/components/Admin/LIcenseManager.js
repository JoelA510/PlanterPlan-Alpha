// src/components/Admin/LicenseManager.js
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { generateLicense } from '../../services/licenseService';

const LicenseManager = () => {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bulkAmount, setBulkAmount] = useState(5);
  const [generatingLicenses, setGeneratingLicenses] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'used', 'unused'
  const [filterOrgId, setFilterOrgId] = useState('');
  const [organizations, setOrganizations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLicense, setCopiedLicense] = useState(null);

  const fetchLicenses = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('licenses')
        .select(`
          *,
          user:user_id (id, email, first_name, last_name),
          organization:org_id (id, organization_name, subdomain)
        `)
        .order('created_at', { ascending: false });
      
      // Apply filters
      if (filterStatus === 'used') {
        query = query.eq('is_used', true);
      } else if (filterStatus === 'unused') {
        query = query.eq('is_used', false);
      }
      
      if (filterOrgId) {
        query = query.eq('org_id', filterOrgId);
      }
      
      const { data, error } = await query;
      
      if (error) throw new Error(error.message);
      
      setLicenses(data || []);
    } catch (err) {
      console.error('Error fetching licenses:', err);
      setError('Failed to load licenses');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterOrgId]);

  const fetchOrganizations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('white_label_orgs')
        .select('id, organization_name, subdomain')
        .order('organization_name');
      
      if (error) throw new Error(error.message);
      
      setOrganizations(data || []);
    } catch (err) {
      console.error('Error fetching organizations:', err);
    }
  }, []);

  useEffect(() => {
    fetchLicenses();
    fetchOrganizations();
  }, [fetchLicenses, fetchOrganizations]);

  const handleGenerateLicense = async () => {
    try {
      setGeneratingLicenses(true);
      
      const licenseData = {
        org_id: filterOrgId || null
      };
      
      const result = await generateLicense(licenseData);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Refresh licenses
      await fetchLicenses();
      
      // Copy the license key to clipboard
      navigator.clipboard.writeText(result.data.license_key);
      setCopiedLicense(result.data.id);
      setTimeout(() => setCopiedLicense(null), 3000);
    } catch (err) {
      console.error('Error generating license:', err);
      setError('Failed to generate license: ' + err.message);
    } finally {
      setGeneratingLicenses(false);
    }
  };

  const handleGenerateBulkLicenses = async () => {
    try {
      setGeneratingLicenses(true);
      
      const amount = parseInt(bulkAmount, 10);
      if (isNaN(amount) || amount <= 0 || amount > 100) {
        throw new Error('Invalid bulk amount. Please enter a number between 1 and 100.');
      }
      
      // Generate licenses in batches
      const batchSize = 10;
      const batches = Math.ceil(amount / batchSize);
      
      for (let i = 0; i < batches; i++) {
        const batchAmount = Math.min(batchSize, amount - (i * batchSize));
        const licensePromises = Array(batchAmount).fill().map(() => 
          generateLicense({
            org_id: filterOrgId || null
          })
        );
        
        await Promise.all(licensePromises);
      }
      
      // Refresh licenses
      await fetchLicenses();
      
    } catch (err) {
      console.error('Error generating bulk licenses:', err);
      setError('Failed to generate bulk licenses: ' + err.message);
    } finally {
      setGeneratingLicenses(false);
    }
  };

  const handleCopyLicense = (licenseKey, id) => {
    navigator.clipboard.writeText(licenseKey);
    setCopiedLicense(id);
    setTimeout(() => setCopiedLicense(null), 3000);
  };

  const handleApplyFilters = () => {
    fetchLicenses();
  };

  const handleResetFilters = () => {
    setFilterStatus('all');
    setFilterOrgId('');
    setSearchQuery('');
    fetchLicenses();
  };

  // Filter licenses by search query client-side
  const filteredLicenses = licenses.filter(license => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      license.license_key.toLowerCase().includes(query) ||
      (license.user?.email || '').toLowerCase().includes(query) ||
      (license.user?.first_name || '').toLowerCase().includes(query) ||
      (license.user?.last_name || '').toLowerCase().includes(query) ||
      (license.organization?.organization_name || '').toLowerCase().includes(query)
    );
  });

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '24px' }}>
        License Key Management
      </h1>
      
      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '1px solid #ef4444',
          color: '#b91c1c',
          padding: '16px',
          borderRadius: '4px',
          marginBottom: '16px'
        }}>
          {error}
          <button 
            onClick={() => setError(null)}
            style={{
              float: 'right',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#b91c1c',
              fontWeight: 'bold'
            }}
          >
            ✕
          </button>
        </div>
      )}
      
      {/* License Generation Section */}
      <div style={{
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '24px'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px' }}>
          Generate License Keys
        </h2>
        
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              Organization
            </label>
            <select
              value={filterOrgId}
              onChange={(e) => setFilterOrgId(e.target.value)}
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
                minWidth: '200px'
              }}
            >
              <option value="">All Organizations</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>
                  {org.organization_name}
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={handleGenerateLicense}
            disabled={generatingLicenses}
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '4px',
              border: 'none',
              cursor: generatingLicenses ? 'not-allowed' : 'pointer',
              opacity: generatingLicenses ? 0.7 : 1
            }}
          >
            {generatingLicenses ? 'Generating...' : 'Generate Single License'}
          </button>
          
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                Bulk Amount
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={bulkAmount}
                onChange={(e) => setBulkAmount(e.target.value)}
                style={{
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #d1d5db',
                  width: '80px'
                }}
              />
            </div>
            
            <button
              onClick={handleGenerateBulkLicenses}
              disabled={generatingLicenses}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '4px',
                border: 'none',
                cursor: generatingLicenses ? 'not-allowed' : 'pointer',
                opacity: generatingLicenses ? 0.7 : 1
              }}
            >
              {generatingLicenses ? 'Generating...' : 'Generate Bulk Licenses'}
            </button>
          </div>
        </div>
      </div>
      
      {/* License List Section */}
      <div style={{
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '24px'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
            License Keys
          </h2>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={fetchLicenses}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Refresh
            </button>
          </div>
        </div>
        
        {/* Filters */}
        <div style={{ 
          display: 'flex', 
          gap: '16px', 
          marginBottom: '16px',
          flexWrap: 'wrap',
          alignItems: 'flex-end'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #d1d5db'
              }}
            >
              <option value="all">All Licenses</option>
              <option value="used">Used</option>
              <option value="unused">Unused</option>
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              Organization
            </label>
            <select
              value={filterOrgId}
              onChange={(e) => setFilterOrgId(e.target.value)}
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
                minWidth: '200px'
              }}
            >
              <option value="">All Organizations</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>
                  {org.organization_name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by key, user, or org..."
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
                minWidth: '250px'
              }}
            />
          </div>
          
          <button
            onClick={handleApplyFilters}
            style={{
              backgroundColor: '#4b5563',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Apply Filters
          </button>
          
          <button
            onClick={handleResetFilters}
            style={{
              backgroundColor: 'white',
              color: '#4b5563',
              padding: '8px 16px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              cursor: 'pointer'
            }}
          >
            Reset
          </button>
        </div>
        
        {/* Licenses Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px' }}>
            Loading...
          </div>
        ) : filteredLicenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
            No licenses found matching your criteria.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse', 
              fontSize: '14px'
            }}>
              <thead>
                <tr style={{ 
                  backgroundColor: '#f3f4f6', 
                  textAlign: 'left' 
                }}>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>License Key</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>Organization</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>User</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>Created</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLicenses.map(license => (
                  <tr key={license.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <code style={{ 
                        backgroundColor: '#f3f4f6', 
                        padding: '4px 8px', 
                        borderRadius: '4px',
                        fontFamily: 'monospace'
                      }}>
                        {license.license_key}
                      </code>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ 
                        backgroundColor: license.is_used ? '#dcfce7' : '#e0f2fe',
                        color: license.is_used ? '#166534' : '#1e40af',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        {license.is_used ? 'Used' : 'Available'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {license.organization?.organization_name || 'N/A'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {license.user ? (
                        <div>
                          <div>{license.user.first_name} {license.user.last_name}</div>
                          <div style={{ color: '#6b7280', fontSize: '12px' }}>{license.user.email}</div>
                        </div>
                      ) : 'Not assigned'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {new Date(license.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => handleCopyLicense(license.license_key, license.id)}
                        style={{
                          backgroundColor: '#f3f4f6',
                          color: copiedLicense === license.id ? '#059669' : '#4b5563',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {copiedLicense === license.id ? (
                          <>
                            <span>✓</span>
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <span>📋</span>
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LicenseManager;