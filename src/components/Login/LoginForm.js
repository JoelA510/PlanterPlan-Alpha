// src/components/LoginForm.js
import React, { useState } from 'react';
import { signIn, signUp } from '../../services/authService';
import { Link, useNavigate } from 'react-router-dom';

const LoginForm = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const validateForm = () => {
    setError(null);
    
    // Basic validation
    if (!formData.email) return 'Email is required';
    if (!formData.password) return 'Password is required';
    
    if (isSignUp) {
      if (!formData.firstName) return 'First name is required';
      if (!formData.lastName) return 'Last name is required';
      if (formData.password.length < 6) return 'Password must be at least 6 characters';
      if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
    }
    
    return null;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setLoading(true);
    
    try {
      let result;
      
      if (isSignUp) {
        // Sign up flow
        result = await signUp(
          formData.email, 
          formData.password, 
          { 
            firstName: formData.firstName, 
            lastName: formData.lastName 
          }
        );
      } else {
        // Sign in flow
        result = await signIn(formData.email, formData.password);
      }
      
      if (result.error) {
        throw new Error(result.error.message || 'Authentication failed');
      }
      
      // Success - redirect to home page
      navigate('/');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{isSignUp ? 'Create an Account' : 'Sign In'}</h2>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* Show name fields only for sign up */}
          {isSignUp && (
            <>
              <div className="form-group">
                <label htmlFor="firstName">First Name</label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="lastName">Last Name</label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </>
          )}
          
          {/* Always show email and password */}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
            />
          </div>
          
          {/* Show confirm password only for sign up */}
          {isSignUp && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          )}
          
          {/* Submit button */}
          <button 
            type="submit" 
            className="submit-button"
            disabled={loading}
          >
            {loading 
              ? 'Processing...' 
              : isSignUp ? 'Create Account' : 'Sign In'
            }
          </button>
        </form>
        
        {/* Toggle between sign in and sign up */}
        <div className="auth-toggle">
          {isSignUp ? (
            <p>Already have an account? <button onClick={() => setIsSignUp(false)}>Sign In</button></p>
          ) : (
            <p>Don't have an account? <button onClick={() => setIsSignUp(true)}>Create Account</button></p>
          )}
        </div>
        
        {/* Password reset link */}
        {!isSignUp && (
          <div className="reset-password">
            <Link to="/reset-password">Forgot password?</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginForm;