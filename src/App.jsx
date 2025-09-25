import React from 'react';
import { Routes, Route } from 'react-router-dom';


// Components (we'll create these next)
// import AuthProvider from './contexts/AuthContext';
// import ProtectedRoute from './components/auth/ProtectedRoute';
// import LoginForm from './components/auth/LoginForm';
// import Dashboard from './pages/Dashboard';

// Temporary placeholder components
const LoginPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="max-w-md w-full space-y-8">
      <div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          PlanterPlan
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in to your account
        </p>
      </div>
      <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <p className="text-center text-gray-500">Login form coming soon...</p>
      </div>
    </div>
  </div>
);

const Dashboard = () => (
  <div className="min-h-screen bg-gray-50">
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      </div>
    </header>
    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
          <p className="text-gray-500">Dashboard content coming soon...</p>
        </div>
      </div>
    </main>
  </div>
);

function App() {
  return (
    <div className="App">
      {/* We'll wrap this with AuthProvider once we create it */}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </div>
  );
}

export default App;