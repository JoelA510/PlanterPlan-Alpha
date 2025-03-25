// components/OrganizationApp.jsx
import { useOrganization } from '../contexts/OrganizationProvider';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
import TaskList from './TaskList';
import TemplateList from './TemplateList';
import Header from './Header';
import Sidebar from './Sidebar';

function OrganizationApp() {
  const { organization, loading } = useOrganization();
  
  if (loading) {
    return <div className="loading">Loading organization...</div>;
  }
  
  return (
    <div className="org-app">
      <Header organization={organization} />
      <div className="app-container">
        <Sidebar />
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tasks" element={<TaskList />} />
            <Route path="/templates" element={<TemplateList />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default OrganizationApp;