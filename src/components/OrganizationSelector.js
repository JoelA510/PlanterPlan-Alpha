// src/components/OrganizationSelector.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchAllOrganizations } from '../services/organizationService';

function OrganizationSelector() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadOrganizations() {
      setLoading(true);
      const { data, error } = await fetchAllOrganizations();
        
      if (!error && data) {
        setOrganizations(data);
      } else {
        console.error("Error loading organizations:", error);
      }
      setLoading(false);
    }
    
    loadOrganizations();
  }, []);
  
  if (loading) {
    return <div>Loading organizations...</div>;
  }
  
  return (
    <div style={{ marginTop: "20px" }}>
      <h3 style={{ fontSize: "1rem", marginBottom: "10px" }}>Organizations</h3>
      <div>
        {organizations.length > 0 ? (
          organizations.map(org => (
            <Link 
              key={org.id}
              to={`/org/${org.subdomain}/tasks`} 
              style={{ 
                display: "block", 
                padding: "10px", 
                color: "#94a3b8",
                textDecoration: "none",
                marginBottom: "10px",
                backgroundColor: "rgba(255,255,255,0.1)",
                borderRadius: "4px"
              }}
            >
              {org.organization_name}
            </Link>
          ))
        ) : (
          <div style={{ color: "#94a3b8", fontSize: "0.875rem" }}>
            No organizations found
          </div>
        )}
      </div>
    </div>
  );
}

export default OrganizationSelector;