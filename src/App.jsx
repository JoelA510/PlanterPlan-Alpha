import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { ErrorBoundary } from 'react-error-boundary';
import ErrorFallback from './components/common/ErrorFallback';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginForm from './components/auth/LoginForm';
import TaskList from './components/tasks/TaskList';
import ProjectReport from './components/reports/ProjectReport';
// Dashboard component with modern styling
const Dashboard = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Modern header with gradient */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto py-6 px-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">PlanterPlan</h1>
              <p className="text-slate-600 text-sm mt-1">Church Planting Project Management</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm font-medium text-slate-900">{user?.email}</div>
                <div className="text-xs text-slate-500">Project Manager</div>
              </div>
              <button
                onClick={signOut}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Modern main content area */}
      <main className="max-w-6xl mx-auto py-8 px-6">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Your Projects</h2>
          <p className="text-slate-600">Manage your church planting projects and track progress.</p>
        </div>

        <TaskList />
      </main>
    </div>
  );
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
        <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
          <AppRoutes />
        </ErrorBoundary>
      </AuthProvider>
    </div>
  );
}

export default App;
