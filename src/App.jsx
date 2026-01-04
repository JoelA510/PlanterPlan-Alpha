import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { ErrorBoundary } from 'react-error-boundary';
import ErrorFallback from './components/atoms/ErrorFallback';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginForm from './components/molecules/LoginForm';
import TaskList from './components/organisms/TaskList';
import ProjectReport from './components/reports/ProjectReport';
import { ToastProvider } from './contexts/ToastContext';
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
        path="/report/:projectId"
        element={
          <ProtectedRoute>
            <ProjectReport />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} />} />
    </Routes>
  );
};

function App() {
  return (
    <div className="App">
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
