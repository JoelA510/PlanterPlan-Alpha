import React from 'react';
import { Link } from 'react-router-dom';

function DefaultHeader() {
  return (
    <header style={{ 
      backgroundColor: "white", 
      borderBottom: "1px solid #e5e7eb",
      padding: "16px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }}>
      <div style={{ display: "flex", gap: "16px" }}>
        <Link to="/tasks" style={{ 
          backgroundColor: "#3b82f6", 
          color: "white",
          padding: "8px 16px",
          borderRadius: "4px",
          textDecoration: "none" 
        }}>
          Projects
        </Link>
        
        <Link to="/templates" style={{ 
          backgroundColor: "#8b5cf6", 
          color: "white",
          padding: "8px 16px",
          borderRadius: "4px",
          textDecoration: "none" 
        }}>
          Templates
        </Link>
      </div>
      <div>User Name</div>
    </header>
  );
}

export default DefaultHeader;