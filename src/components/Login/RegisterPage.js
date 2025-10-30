// src/components/Login/RegisterPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { signUp } from '../../services/authService';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  
  // Form data state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Add a state to track registration completion
  const [registrationComplete, setRegistrationComplete] = useState(false);
  
  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset error state
    setError(null);
    
    // Validate inputs
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    
    if (!password) {
      setError('Password is required');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (!firstName.trim()) {
      setError('First name is required');
      return;
    }
    
    if (!lastName.trim()) {
      setError('Last name is required');
      return;
    }
    
    try {
      setFormLoading(true);
      
      // Call the signUp function from authService
      const userData = {
        firstName,
        lastName
      };
      
      const result = await signUp(email, password, userData);
      
      if (result.error) {
        throw result.error;
      }
      
      // Set registration as complete to show the confirmation screen
      setRegistrationComplete(true);
      
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Failed to register. Please try again.');
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
          {/* Header - Always show this */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">PlanterPlan</h1>
            <p className="mt-2 text-gray-600">
              {registrationComplete ? 'Email Verification' : 'Create your account'}
            </p>
          </div>
          
          {/* Conditional rendering based on registration state */}
          {registrationComplete ? (
            // Email confirmation content
            <div className="bg-white p-8 rounded-lg shadow-md text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-8 w-8 text-green-600" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M5 13l4 4L19 7" 
                    />
                  </svg>
                </div>
              </div>
              
              <h2 className="text-2xl font-semibold mb-4">Check Your Email</h2>
              
              <p className="text-gray-600 mb-6">
                We've sent a verification link to <strong>{email}</strong>. 
                Please check your inbox and click the link to complete your registration.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-md mb-6 text-left">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      If you don't see the email in your inbox, please check your spam or junk folder.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                {/* <button 
                  className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
                  onClick={handleResendEmail}
                >
                  Resend Verification Email
                </button> */}
                
                <Link 
                  to="/login" 
                  className="block w-full py-2 px-4 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          ) : (
            // Registration form
            <div className="bg-white p-8 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-6">Register</h2>
              
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                  <p className="text-red-700">{error}</p>
                </div>
              )}
              
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">First Name</label>
                    <input
                      type="text"
                      placeholder="John"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={formLoading}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Name</label>
                    <input
                      type="text"
                      placeholder="Doe"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={formLoading}
                    />
                  </div>
                </div>
                
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
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={formLoading}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={formLoading}
                  />
                </div>
                
                <button
                  type="submit"
                  className={`w-full py-2 px-4 ${formLoading ? 'bg-blue-400' : 'bg-blue-600'} text-white font-medium rounded-md`}
                  disabled={formLoading}
                >
                  {formLoading ? 'Creating Account...' : 'Create Account'}
                </button>
              </form>
            </div>
          )}
          
          {/* Links section - Conditional rendering */}
          {!registrationComplete && (
            <div className="text-center text-sm">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-blue-600">
                  Sign In
                </Link>
              </p>
            </div>
          )}
          
          {/* Support link - Show on confirmation screen */}
          {registrationComplete && (
            <div className="text-center text-sm">
              <p className="text-gray-600">
                Need help?{' '}
                <a href="mailto:support@planterplan.com" className="font-medium text-blue-600">
                  Contact Support
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <footer className="py-4 text-center text-gray-500 text-sm">
        © 2025 Task Manager Application. All rights reserved.
      </footer>
    </div>
  );
};

export default RegisterPage;