// src/components/Login/ForgotPasswordPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { requestPasswordReset } from '../../services/authService';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset states
    setError(null);
    setSuccess(false);
    
    // Validate input
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    
    try {
      setFormLoading(true);
      
      // Call the requestPasswordReset function from authService
      const result = await requestPasswordReset(email);
      
      if (result.error) {
        throw result.error;
      }
      
      // Show success message
      setSuccess(true);
      
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to send password reset email. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  // If auth context is still loading, show a loading indicator
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-between">
      <div className="flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">PlanterPlan</h1>
            <p className="mt-2 text-gray-600">Reset your password</p>
          </div>
          
          {/* Form */}
          <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-6">Forgot Password</h2>
            
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                <p className="text-red-700">{error}</p>
              </div>
            )}
            
            {success ? (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
                <p className="text-green-700">Password reset email sent! Please check your inbox.</p>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={formLoading}
                  />
                </div>
                
                <button
                  type="submit"
                  className={`w-full py-2 px-4 ${formLoading ? 'bg-blue-400' : 'bg-blue-600'} text-white font-medium rounded-md`}
                  disabled={formLoading}
                >
                  {formLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            )}
          </div>
          
          {/* Links */}
          <div className="text-center text-sm">
            <p className="text-gray-600 mb-2">
              Remember your password?{' '}
              <Link to="/login" className="font-medium text-blue-600">
                Back to Sign In
              </Link>
            </p>
            <p>
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-blue-600">
                Create Account
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

export default ForgotPasswordPage;