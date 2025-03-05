// App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import TaskList from "./components/TaskList/TaskList";
import "./App.css"; // We'll add basic CSS to ensure styles are applied

function App() {
  return (
    <Router>
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
            My Project
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
          
          
          
          <Link to="/settings" style={{ 
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
              <Link to="/tasks" style={{ 
                backgroundColor: "#3b82f6", 
                color: "white",
                padding: "8px 16px",
                borderRadius: "4px",
                textDecoration: "none" 
              }}>
                Projects
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
              <Route path="/dashboard" element={<div>Dashboard</div>} />
              <Route path="/tasks" element={<TaskList />} />
              
              <Route path="/settings" element={<div>Settings Page</div>} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;