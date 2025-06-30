import React, { useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import TaskList from './components/TaskList/TaskList';
import TemplateList from './components/TemplateList/TemplateList';
import UserSettings from './components/Settings/UserSettings';
import AdminSettings from './components/Settings/AdminSettings';
import NotFound from './components/NotFound';
import WhiteLabelOrgList from './components/WhiteLabelOrgList';
import { OrganizationProvider } from './components/contexts/OrganizationProvider';
import { AuthProvider, useAuth } from './components/contexts/AuthContext';
import { TaskProvider } from './components/contexts/TaskContext';
import LoginPage from './components/Login/LoginPage';
import RegisterPage from './components/Login/RegisterPage';
import ForgotPasswordPage from './components/Login/ForgotPasswordPage';
import ResetPasswordPage from './components/Login/ResetPasswordPage';
import { SearchProvider } from './components/contexts/SearchContext';

// Define LayoutWithOrganization outside of ProtectedRoutes for better stability
// Use React.memo to prevent unnecessary re-renders
const LayoutWithOrganization = React.memo(({ userType, children, requiredRole }) => {
  const { hasRole, user } = useAuth();
  const navigate = useNavigate();
  
  // Determine the default path based on user role
  const defaultPath = useMemo(() => {
    if (hasRole('planterplan_admin')) {
      return '/admin';
    } else if (hasRole('white_label_admin') && user?.profile?.white_label_org?.subdomain) {
      return `/org/${user.profile.white_label_org.subdomain}/admin`;
    } else if (hasRole('white_label_user') && user?.profile?.white_label_org?.subdomain) {
      return `/org/${user.profile.white_label_org.subdomain}/user`;
    } else {
      return '/user';
    }
  }, [hasRole, user?.profile?.white_label_org?.subdomain]);
  
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
      // Use React Router navigation instead of window.location for smoother transitions
      navigate(defaultPath, { replace: true });
    }
  }, [userType, requiredRole, hasRole, defaultPath, navigate]);

  // Use console.log to track component lifecycle
  useEffect(() => {
    console.log(`LayoutWithOrganization (${userType}) mounted`);
    return () => console.log(`LayoutWithOrganization (${userType}) unmounted`);
  }, [userType]);
  
  return (
    <OrganizationProvider>
      <TaskProvider>
        <SearchProvider>
          <Layout userType={userType}>
            {children}
          </Layout>
        </SearchProvider>
      </TaskProvider>
    </OrganizationProvider>
  );
});

// Component to handle all protected routes
const ProtectedRoutes = () => {
  const { user, loading, hasRole } = useAuth();
  const navigate = useNavigate();
  
  // Calculate default path based on user role - moved above the conditional returns
  const defaultPath = useMemo(() => {
    if (!user) return '/login'; // Handle the case where user is null
    
    if (hasRole('planterplan_admin')) {
      return '/admin';
    } else if (hasRole('white_label_admin') && user?.profile?.white_label_org?.subdomain) {
      return `/org/${user.profile.white_label_org.subdomain}/admin`;
    } else if (hasRole('white_label_user') && user?.profile?.white_label_org?.subdomain) {
      return `/org/${user.profile.white_label_org.subdomain}/user`;
    } else {
      return '/user';
    }
  }, [hasRole, user]);
  
  // Track component lifecycle
  useEffect(() => {
    console.log('ProtectedRoutes mounted');
    return () => console.log('ProtectedRoutes unmounted');
  }, []);
  
  // While checking authentication status, show loading
  if (loading) {
    return <div>Loading...</div>;
  }
  
  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

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

const App = () => {
  // Add component lifecycle logging
  useEffect(() => {
    console.log('App component mounted');
    return () => console.log('App component unmounted');
  }, []);

  return (
    <AuthProvider>
      {/* Add stable key to Router to prevent remounting */}
      <Router key="app-router">
        <Routes>
          {/* Auth routes - accessible to everyone */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          
          {/* Protected routes */}
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;