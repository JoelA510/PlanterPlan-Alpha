import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '64px 24px',
      textAlign: 'center'
    }}>
      <div style={{
        fontSize: '72px',
        fontWeight: 'bold',
        color: '#d1d5db',
        marginBottom: '16px'
      }}>
        404
      </div>
      
      <h1 style={{
        fontSize: '24px',
        fontWeight: 'bold',
        marginBottom: '16px'
      }}>
        Page Not Found
      </h1>
      
      <p style={{
        color: '#6b7280',
        maxWidth: '500px',
        marginBottom: '32px'
      }}>
        The page you are looking for doesn't exist or has been moved.
      </p>
      
      <div style={{ display: 'flex', gap: '16px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            backgroundColor: '#f9fafb',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            padding: '8px 16px',
            cursor: 'pointer',
            color: '#4b5563',
            fontWeight: '500'
          }}
        >
          Go Back
        </button>
        
        <Link
          to="/"
          style={{
            backgroundColor: '#10b981',
            border: 'none',
            borderRadius: '4px',
            padding: '8px 16px',
            color: 'white',
            textDecoration: 'none',
            fontWeight: '500'
          }}
        >
          Go Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;