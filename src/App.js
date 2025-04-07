import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import TaskList from './components/TaskList/TaskList';
import TemplateList from './components/TemplateList/TemplateList';
import UserSettings from './components/Settings/UserSettings';
import AdminSettings from './components/Settings/AdminSettings';
import NotFound from './components/NotFound';
import WhiteLabelOrgList from './components/WhiteLabelOrgList';

const App = () => {
  // This is a simple approach to test different user types without auth
  // In a real app, this would come from your auth context or state management
  const [userType, setUserType] = useState('planter_admin');
  const [orgSlug, setOrgSlug] = useState('example-org');

  // Simple role-switcher for development/testing
  const RoleSwitcher = () => (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      backgroundColor: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: '4px',
      padding: '12px',
      zIndex: 1000,
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '8px' }}>Test Different Roles</h3>
      <select 
        value={userType} 
        onChange={(e) => setUserType(e.target.value)}
        style={{ 
          padding: '6px', 
          marginBottom: '8px', 
          width: '100%',
          borderRadius: '4px',
          border: '1px solid #d1d5db'
        }}
      >
        <option value="planter_admin">Planter Admin</option>
        <option value="planter_user">Planter User</option>
        <option value="org_admin">Org Admin</option>
        <option value="org_user">Org User</option>
      </select>
      
      {(userType === 'org_admin' || userType === 'org_user') && (
        <input
          type="text"
          value={orgSlug}
          onChange={(e) => setOrgSlug(e.target.value)}
          placeholder="Organization Slug"
          style={{ 
            padding: '6px', 
            width: '100%',
            borderRadius: '4px',
            border: '1px solid #d1d5db'
          }}
        />
      )}
    </div>
  );
  
  // Determine the correct root path based on user type
  const getRootPath = () => {
    switch (userType) {
      case 'planter_admin':
        return '/admin';
      case 'planter_user':
        return '/user';
      case 'org_admin':
        return `/org/${orgSlug}/admin`;
      case 'org_user':
        return `/org/${orgSlug}/user`;
      default:
        return '/admin';
    }
  };
  
  return (
    <Router>
      <Routes>
        {/* Planter Admin Routes */}
        <Route path="/admin" element={<Layout userType="planter_admin" />}>
          <Route index element={<TaskList />} />
          <Route path="templates" element={<TemplateList />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="white-label-orgs" element={<WhiteLabelOrgList />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        
        {/* Planter User Routes */}
        <Route path="/user" element={<Layout userType="planter_user" />}>
          <Route index element={<TaskList />} />
          <Route path="settings" element={<UserSettings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        
        {/* Org Admin Routes - uses the :slug parameter */}
        <Route path="/org/:slug/admin" element={<Layout userType="org_admin" />}>
          <Route index element={<TaskList />} />
          <Route path="templates" element={<TemplateList />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        
        {/* Org User Routes - uses the :slug parameter */}
        <Route path="/org/:slug/user" element={<Layout userType="org_user" />}>
          <Route index element={<TaskList />} />
          <Route path="settings" element={<UserSettings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        
        {/* Default redirect */}
        <Route path="*" element={<Navigate to={getRootPath()} replace />} />
      </Routes>
      
      {/* Role switcher for development testing */}
      <RoleSwitcher />
    </Router>
  );
};

export default App;