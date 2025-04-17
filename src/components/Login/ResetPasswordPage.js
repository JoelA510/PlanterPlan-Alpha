// src/components/Login/ResetPasswordPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { updatePassword } from '../../services/authService';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Redirect if already logged in (but not during password reset flow)
  useEffect(() => {
    // We check URL parameters to see if this is a password reset
    const isPasswordReset = window.location.hash.includes('type=recovery');
    
    if (user && !loading && !isPasswordReset) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset states
    setError(null);
    setSuccess(false);
    
    // Validate inputs
    if (!password) {
      setError('Password is required');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    // Minimum password requirements
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    try {
      setFormLoading(true);
      
      // Call the updatePassword function from authService
      const result = await updatePassword(password);
      
      if (result.error) {
        throw result.error;
      }
      
      // Show success message
      setSuccess(true);
      
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-between">
      <div className="flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">PlanterPlan</h1>
            <p className="mt-2 text-gray-600">Set your new password</p>
          </div>
          
          {/* Form */}
          <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-6">Reset Password</h2>
            
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                <p className="text-red-700">{error}</p>
              </div>
            )}
            
            {success ? (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
                <p className="text-green-700">Password successfully reset! You will be redirected to the login page.</p>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm font-medium text-gray-700">New Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={formLoading}
                    minLength={8}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={formLoading}
                    minLength={8}
                  />
                </div>
                
                <button
                  type="submit"
                  className={`w-full py-2 px-4 ${formLoading ? 'bg-blue-400' : 'bg-blue-600'} text-white font-medium rounded-md`}
                  disabled={formLoading}
                >
                  {formLoading ? 'Updating Password...' : 'Update Password'}
                </button>
              </form>
            )}
          </div>
          
          {/* Links */}
          <div className="text-center text-sm">
            <p className="text-gray-600">
              Remember your password?{' '}
              <Link to="/login" className="font-medium text-blue-600">
                Back to Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="py-4 text-center text-gray-500 text-sm">
        © 2025 Task Manager Application. All rights reserved.
      </footer>
    </div>
  );
};

export default ResetPasswordPage;