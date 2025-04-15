// src/components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ 
  children, 
  allowedRoles = [], 
  requireAdmin = false,
  redirectTo = '/login' 
}) => {
  const { user, loading, hasRole, isAdmin } = useAuth();
  
  // Show loading state
  if (loading) {
    return <div className="loading-spinner">Loading...</div>;
  }
  
  // Check if authenticated
  if (!user) {
    return <Navigate to={redirectTo} />;
  }
  
  // Check role requirements if specified
  if (allowedRoles.length > 0 && !allowedRoles.some(role => hasRole(role))) {
    return <Navigate to="/unauthorized" />;
  }
  
  // Check admin requirement if specified
  if (requireAdmin && !isAdmin()) {
    return <Navigate to="/unauthorized" />;
  }
  
  // If all checks pass, render the protected content
  return children;
};

export default ProtectedRoute;