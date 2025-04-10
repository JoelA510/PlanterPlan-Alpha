import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import TaskList from './components/TaskList/TaskList';
import TemplateList from './components/TemplateList/TemplateList';
import UserSettings from './components/Settings/UserSettings';
import AdminSettings from './components/Settings/AdminSettings';
import NotFound from './components/NotFound';
import WhiteLabelOrgList from './components/WhiteLabelOrgList';
import { OrganizationProvider } from './components/contexts/OrganizationProvider';

const App = () => {
  // Default route path for redirect
  const defaultPath = '/admin';
  
  // Create a component that wraps Layout with the OrganizationProvider
  // This ensures the provider has access to route params
  const LayoutWithOrganization = ({ userType, children }) => (
    <OrganizationProvider>
      <Layout userType={userType}>
        {children}
      </Layout>
    </OrganizationProvider>
  );
  
  return (
    <Router>
      <Routes>
        {/* Planter Admin Routes */}
        <Route 
          path="/admin" 
          element={<LayoutWithOrganization userType="planter_admin" />}
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
          element={<LayoutWithOrganization userType="planter_user" />}
        >
          <Route index element={<TaskList />} />
          <Route path="settings" element={<UserSettings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        
        {/* Org Admin Routes - uses the :orgSlug parameter */}
        <Route 
          path="/org/:orgSlug/admin" 
          element={<LayoutWithOrganization userType="org_admin" />}
        >
          <Route index element={<TaskList />} />
          <Route path="templates" element={<TemplateList />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        
        {/* Org User Routes - uses the :orgSlug parameter */}
        <Route 
          path="/org/:orgSlug/user" 
          element={<LayoutWithOrganization userType="org_user" />}
        >
          <Route index element={<TaskList />} />
          <Route path="settings" element={<UserSettings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        
        {/* Default redirect */}
        <Route path="*" element={<Navigate to={defaultPath} replace />} />
      </Routes>
    </Router>
  );
};

export default App;