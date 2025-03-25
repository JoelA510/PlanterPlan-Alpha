import React from "react";
import { BrowserRouter as Router, Routes, Route, Link, Outlet, useParams } from "react-router-dom";
import TaskList from "./components/TaskList/TaskList";
import TemplateList from "./components/TemplateList/TemplateList";
import { createContext, useContext, useState, useEffect } from 'react';
import { OrganizationProvider, useOrganization } from './components/contexts/OrganizationProvider'; // Import from the file
import { supabase } from './supabaseClient';
import "./App.css";

// Create Organization Context
const OrganizationContext = createContext(null);

// OrganizationSelector
function OrganizationSelector() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadOrganizations() {
      setLoading(true);
      const { data, error } = await supabase
        .from('white_label_orgs')
        .select('*')
        .order('organization_name');
        
      if (!error) {
        setOrganizations(data || []);
        console.log("Successfully got the white label orgs");
        console.log(data);
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


// Organization Layout Component
function OrganizationLayout() {
  const { organization, loading } = useOrganization();
  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      Loading organization...
    </div>;
  }
  
  // Add this check to prevent errors when organization is null
  if (!organization) {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      Organization not found
    </div>;
  }
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* SIDEBAR - with organization branding */}
      <nav style={{ 
        width: "240px", 
        backgroundColor: "#1e293b", 
        color: "white",
        padding: "20px"
      }}>
        <h2 style={{ 
          fontSize: "1.25rem", 
          fontWeight: "bold",
          marginBottom: "20px",
          color: "white"
        }}>
          {organization.organization_name}
        </h2>
        
        <Link to={`/org/${organization.subdomain}/dashboard`} style={{ 
          display: "block", 
          padding: "10px", 
          color: "#94a3b8",
          textDecoration: "none",
          marginBottom: "10px"
        }}>
          Dashboard
        </Link>
        
        <Link to={`/org/${organization.subdomain}/tasks`} style={{ 
          display: "block", 
          padding: "10px", 
          color: "#94a3b8",
          textDecoration: "none",
          marginBottom: "10px"
        }}>
          Projects
        </Link>
        
        <Link to={`/org/${organization.subdomain}/templates`} style={{ 
          display: "block", 
          padding: "10px", 
          color: "#94a3b8",
          textDecoration: "none",
          marginBottom: "10px"
        }}>
          Templates
        </Link>
        
        <Link to={`/org/${organization.subdomain}/settings`} style={{ 
          display: "block", 
          padding: "10px", 
          color: "#94a3b8",
          textDecoration: "none",
          marginBottom: "10px"
        }}>
          Settings
        </Link>
      </nav>
      
      {/* MAIN CONTENT AREA */}
      <div style={{ 
        flex: "1", 
        display: "flex", 
        flexDirection: "column"
      }}>
        {/* HEADER */}
        <header style={{ 
          backgroundColor: "white", 
          borderBottom: "1px solid #e5e7eb",
          padding: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div style={{ display: "flex", gap: "16px" }}>
            <Link to={`/org/${organization.slug}/tasks`} style={{ 
              backgroundColor: organization.primary_color, 
              color: "white",
              padding: "8px 16px",
              borderRadius: "4px",
              textDecoration: "none" 
            }}>
              Projects
            </Link>
            
            <Link to={`/org/${organization.slug}/templates`} style={{ 
              backgroundColor: organization.secondary_color, 
              color: "white",
              padding: "8px 16px",
              borderRadius: "4px",
              textDecoration: "none" 
            }}>
              Templates
            </Link>
          </div>
          <div>{organization.name} User</div>
        </header>
        
        {/* ROUTES */}
        <main style={{ 
          padding: "24px",
          overflow: "auto",
          backgroundColor: "#f3f4f6" 
        }}>
          <Routes>
            <Route index element={<TaskList orgId={organization.id} />} />
            <Route path="dashboard" element={<div>
              <h1>{organization.name} Dashboard</h1>
              <p>Coming soon: Projects overview, analytics, tasks due soon, etc</p>
            </div>} />
            <Route path="tasks" element={<TaskList orgId={organization.id} />} />
            <Route path="templates" element={<TemplateList orgId={organization.id} />} />
            <Route path="settings" element={<div>
              <h1>{organization.name} Settings</h1>
              <p>Organization settings and configuration</p>
            </div>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

// Main App Component with both regular and org-specific routes
function App() {
  return (
    <Router>
      <Routes>
        {/* Organization-specific routes */}
        <Route path="/org/:orgSlug/*" element={
          <OrganizationProvider>
            <OrganizationLayout />
          </OrganizationProvider>
        } />
        
        {/* Default routes */}
        <Route path="/" element={
          <div style={{ display: "flex", height: "100vh" }}>
            {/* SIDEBAR - using inline styles to ensure they apply */}
            <nav style={{ 
              width: "240px", 
              backgroundColor: "#1e293b", 
              color: "white",
              padding: "20px"
            }}>
              <h2 style={{ 
                fontSize: "1.25rem", 
                fontWeight: "bold",
                marginBottom: "20px" 
              }}>
                PlanterPlan
              </h2>
              
              <Link to="/dashboard" style={{ 
                display: "block", 
                padding: "10px", 
                color: "#94a3b8",
                textDecoration: "none",
                marginBottom: "10px"
              }}>
                Dashboard
              </Link>
              
              <Link to="/tasks" style={{ 
                display: "block", 
                padding: "10px", 
                color: "#94a3b8",
                textDecoration: "none",
                marginBottom: "10px"
              }}>
                Projects
              </Link>
              
              <Link to="/templates" style={{ 
                display: "block", 
                padding: "10px", 
                color: "#94a3b8",
                textDecoration: "none",
                marginBottom: "10px"
              }}>
                Templates
              </Link>
              
              <Link to="/settings" style={{ 
                display: "block", 
                padding: "10px", 
                color: "#94a3b8",
                textDecoration: "none",
                marginBottom: "10px"
              }}>
                Settings
              </Link>
              
              <hr style={{ margin: "20px 0", borderColor: "#475569" }} />
              
              <OrganizationSelector />
            </nav>
            
            {/* MAIN CONTENT AREA */}
            <div style={{ 
              flex: "1", 
              display: "flex", 
              flexDirection: "column"
            }}>
              {/* HEADER */}
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
              
              {/* ROUTES */}
              <main style={{ 
                padding: "24px",
                overflow: "auto",
                backgroundColor: "#f3f4f6" 
              }}>
                <Routes>
                  <Route path="/" element={<TaskList />} />
                  <Route path="/dashboard" element={<div>Dashboard<p>Coming soon: Projects overview, analytics, tasks due soon, etc</p></div>} />
                  <Route path="/tasks" element={<TaskList />} />
                  <Route path="/templates" element={<TemplateList />} />
                  <Route path="/settings" element={<div>Settings Page</div>} />
                </Routes>
              </main>
            </div>
          </div>
        } />
        
        {/* Other default routes */}
        <Route path="/dashboard" element={<div>Dashboard<p>Coming soon: Projects overview, analytics, tasks due soon, etc</p></div>} />
        <Route path="/tasks" element={<TaskList />} />
        <Route path="/templates" element={<TemplateList />} />
        <Route path="/settings" element={<div>Settings Page</div>} />
      </Routes>
    </Router>
  );
}

export default App;