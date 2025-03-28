import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import TaskList from "./components/TaskList/TaskList";
import TemplateList from "./components/TemplateList/TemplateList";
import { createContext, useState, useEffect } from 'react';
import { OrganizationProvider, useOrganization } from './components/contexts/OrganizationProvider'; // Import from the file
import { fetchAllOrganizations } from './services/organizationService';
import SideNavigation from './components/SideNavigation';
import OrganizationHeader from './components/OrganizationHeader';
import DefaultHeader from './components/DefaultHeader';
import WhiteLabelOrgList from './components/WhiteLabelOrgList'; // Import the new component

import "./App.css";

// Main App Component with both regular and org-specific routes
function App() {
  return (
    <Router>
      <Routes>
        {/* Organization-specific routes */}
        <Route path="/org/:orgSlug/*" element={
          <OrganizationProvider>
            <div style={{ display: "flex", height: "100vh" }}>
              <SideNavigation />
              
              {/* MAIN CONTENT AREA */}
              <div style={{ 
                flex: "1", 
                display: "flex", 
                flexDirection: "column"
              }}>
                {/* HEADER */}
                <OrganizationHeader />
                
                {/* ROUTES */}
                <main style={{ 
                  padding: "24px",
                  overflow: "auto",
                  backgroundColor: "#f3f4f6" 
                }}>
                  <Routes>
                    <Route index element={<TaskList />} />
                    <Route path="dashboard" element={<div>Organization Dashboard</div>} />
                    <Route path="tasks" element={<TaskList />} />
                    <Route path="templates" element={<TemplateList />} />
                    <Route path="settings" element={<div>Settings</div>} />
                  </Routes>
                </main>
              </div>
            </div>
          </OrganizationProvider>
        } />
        
        {/* Default routes */}
        <Route path="/*" element={
          <div style={{ display: "flex", height: "100vh" }}>
            <SideNavigation />
            
            {/* MAIN CONTENT AREA */}
            <div style={{ 
              flex: "1", 
              display: "flex", 
              flexDirection: "column"
            }}>
              {/* HEADER */}
              <DefaultHeader />
              
              {/* ROUTES */}
              <main style={{ 
                padding: "24px",
                overflow: "auto",
                backgroundColor: "#f3f4f6" 
              }}>
                <Routes>
                  <Route path="/" element={<TaskList />} />
                  <Route path="/dashboard" element={<div>Dashboard</div>} />
                  <Route path="/tasks" element={<TaskList />} />
                  <Route path="/templates" element={<TemplateList />} />
                  <Route path="/white-label-orgs" element={<WhiteLabelOrgList />} />
                  <Route path="/settings" element={<div>Settings</div>} />
                </Routes>
              </main>
            </div>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;