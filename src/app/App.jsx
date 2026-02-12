import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';

// Upstream Infrastructure / Shared UI
import ErrorFallback from '@shared/ui/ErrorFallback';
import { AuthProvider, useAuth } from '@app/contexts/AuthContext';
import { ToastProvider } from '@app/contexts/ToastContext';
import { ThemeProvider } from '@app/contexts/ThemeContext';
import ViewAsProviderWrapper from '@app/contexts/ViewAsProviderWrapper';

import SidebarSkeleton from '@features/navigation/components/SidebarSkeleton';
import { AuthSeeder } from '@app/components/AuthSeeder';

// Upstream/Legacy Feature Components
import LoginForm from '@features/auth/components/LoginForm';
import TaskList from '@features/tasks/components/TaskList';
import ProjectReport from '@features/reports/components/ProjectReport';
import TasksPage from '@pages/TasksPage';

// New Premium Pages (Stashed Work)
// Lazy Loaded Pages
const ReportsPage = React.lazy(() => import('@pages/Reports'));
const SettingsPage = React.lazy(() => import('@pages/Settings'));

import Home from '@pages/Home';
import DashboardPage from '@pages/Dashboard';
import ProjectPage from '@pages/Project';
import TeamPage from '@pages/Team';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center text-primary">Loading...</div>
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <SidebarSkeleton />
      </div>
    }>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginForm />} />

        {/* New Premium Routes */}
        {/* Public Routes with Auto-Redirect */}
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Home />} />
        <Route path="/about" element={user ? <Navigate to="/dashboard" replace /> : <Home />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
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
    </Suspense>
  );
};

function App() {
  return (
    <div className="App min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      <ThemeProvider>
        <AuthProvider>
          <AuthSeeder />
          <ViewAsProviderWrapper>
            <ToastProvider>
              <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
                <AppRoutes />
              </ErrorBoundary>
            </ToastProvider>
          </ViewAsProviderWrapper>
        </AuthProvider>
      </ThemeProvider>
    </div>
  );
}

export default App;


