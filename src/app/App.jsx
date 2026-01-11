import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';

// Upstream Infrastructure / Shared UI
import ErrorFallback from '@shared/ui/ErrorFallback';
import { AuthProvider, useAuth } from '@app/contexts/AuthContext';
import { ToastProvider } from '@app/contexts/ToastContext';

// Upstream/Legacy Feature Components
import LoginForm from '@features/auth/components/LoginForm';
import TaskList from '@features/tasks/components/TaskList';
import ProjectReport from '@features/reports/components/ProjectReport';
import TasksPage from '@pages/TasksPage';

// New Premium Pages (Stashed Work)
import Home from '@pages/Home';
import DashboardPage from '@pages/Dashboard';
import ProjectPage from '@pages/Project';
import ReportsPage from '@pages/Reports';
import SettingsPage from '@pages/Settings';
import TeamPage from '@pages/Team';

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

// App Routes
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

      {/* New Premium Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/project"
        /* Handling /project?id=123 via query params in the component */
        element={
          <ProtectedRoute>
            <ProjectPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/project/:id"
        element={
          <ProtectedRoute>
            <ProjectPage />
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
        path="/team"
        element={
          <ProtectedRoute>
            <TeamPage />
          </ProtectedRoute>
        }
      />

      {/* Legacy/Upstream Routes */}
      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <TasksPage />
          </ProtectedRoute>
        }
      />
      {/* Retain /board for TaskList (Kanban) */}
      <Route
        path="/board"
        element={
          <ProtectedRoute>
            <TaskList />
          </ProtectedRoute>
        }
      />
      {/* Legacy Report Route */}
      <Route
        path="/report/:projectId"
        element={
          <ProtectedRoute>
            <ProjectReport />
          </ProtectedRoute>
        }
      />

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
