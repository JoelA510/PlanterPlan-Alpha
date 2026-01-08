import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { ErrorBoundary } from 'react-error-boundary';
import ErrorFallback from '@shared/ui/ErrorFallback';
import { AuthProvider, useAuth } from '@app/contexts/AuthContext';
import { ToastProvider } from '@app/contexts/ToastContext';
import LoginForm from '@features/auth/components/LoginForm';
import TaskList from '@features/tasks/components/TaskList';
import ProjectReport from '@features/reports/components/ProjectReport';
import TasksPage from '@pages/TasksPage';
import ReportsPage from '@pages/ReportsPage';
import SettingsPage from '@pages/SettingsPage';

// Dashboard component with modern styling
const Dashboard = () => {
  // Layout logic moved to DashboardLayout (rendered by TaskList)
  return <TaskList />;
};

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

// App Routes (inside AuthProvider)
const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginForm />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/project/:projectId"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <TasksPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report/:projectId"
        element={
          <ProtectedRoute>
            <ProjectReport />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <div className='@app/App'>
      <AuthProvider>
        <ToastProvider>
          <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
            <AppRoutes />
          </ErrorBoundary>
        </ToastProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
