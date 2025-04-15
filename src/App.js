import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import TaskList from './components/TaskList/TaskList';
import TemplateList from './components/TemplateList/TemplateList';
import UserSettings from './components/Settings/UserSettings';
import AdminSettings from './components/Settings/AdminSettings';
import NotFound from './components/NotFound';
import WhiteLabelOrgList from './components/WhiteLabelOrgList';
import { OrganizationProvider } from './components/contexts/OrganizationProvider';
import { AuthProvider, useAuth } from './components/contexts/AuthContext';
import LoginPage from './components/Login/LoginPage';

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Auth routes - accessible to everyone */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected routes */}
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

// Component to handle all protected routes
const ProtectedRoutes = () => {
  const { user, loading, isAdmin, hasRole } = useAuth();
  
  // While checking authentication status, show loading
  if (loading) {
    return <div>Loading...</div>;
  }
  
  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Determine the default path based on user role
  let defaultPath = '/user'; // Default for regular users
  
  if (hasRole('planterplan_admin')) {
    defaultPath = '/admin';
  } else if (hasRole('white_label_admin')) {
    // Get the white label org slug from user data
    const orgSlug = user.profile?.white_label_org?.subdomain || '';
    defaultPath = `/org/${orgSlug}/admin`;
  } else if (hasRole('white_label_user')) {
    // Get the white label org slug from user data
    const orgSlug = user.profile?.white_label_org?.subdomain || '';
    defaultPath = `/org/${orgSlug}/user`;
  }
  
  // Create a component that wraps Layout with the OrganizationProvider
  const LayoutWithOrganization = ({ userType, children, requiredRole }) => {
    // Check if the user has the required role for this section
    useEffect(() => {
      // Map userType to actual role names
      const roleMap = {
        'planter_admin': 'planterplan_admin',
        'planter_user': 'planterplan_user',
        'org_admin': 'white_label_admin',
        'org_user': 'white_label_user'
      };
      
      const requiredAppRole = roleMap[requiredRole || userType];
      
      if (requiredAppRole && !hasRole(requiredAppRole)) {
        // If user doesn't have the required role, redirect them to their appropriate section
        window.location.href = defaultPath;
      }
    }, [userType, requiredRole]);
    
    return (
      <OrganizationProvider>
        <Layout userType={userType}>
          {children}
        </Layout>
      </OrganizationProvider>
    );
  };

  return (
    <Routes>
      {/* Planter Admin Routes */}
      <Route 
        path="/admin" 
        element={<LayoutWithOrganization userType="planter_admin" requiredRole="planter_admin" />}
      >
        <Route index element={<TaskList />} />
        <Route path="templates" element={<TemplateList />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="white-label-orgs" element={<WhiteLabelOrgList />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      
      {/* Planter User Routes */}
      <Route 
        path="/user" 
        element={<LayoutWithOrganization userType="planter_user" requiredRole="planter_user" />}
      >
        <Route index element={<TaskList />} />
        <Route path="settings" element={<UserSettings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      
      {/* Org Admin Routes - uses the :orgSlug parameter */}
      <Route 
        path="/org/:orgSlug/admin" 
        element={<LayoutWithOrganization userType="org_admin" requiredRole="org_admin" />}
      >
        <Route index element={<TaskList />} />
        <Route path="templates" element={<TemplateList />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      
      {/* Org User Routes - uses the :orgSlug parameter */}
      <Route 
        path="/org/:orgSlug/user" 
        element={<LayoutWithOrganization userType="org_user" requiredRole="org_user" />}
      >
        <Route index element={<TaskList />} />
        <Route path="settings" element={<UserSettings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      
      {/* Default redirect */}
      <Route path="*" element={<Navigate to={defaultPath} replace />} />
    </Routes>
  );
};

export default App;