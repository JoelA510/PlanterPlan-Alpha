// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { getCurrentUser } from '../../services/authService';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session and set up auth listener
    async function setupAuth() {
      setLoading(true);
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session) {
        // Fetch user with profile data
        const { user: userData, error } = await getCurrentUser();
        if (!error && userData) {
          setUser(userData);
        }
      }
      
      // Set up auth state change listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log(`Auth event: ${event}`);
          setSession(session);
          
          if (session) {
            const { user: userData } = await getCurrentUser();
            setUser(userData);
          } else {
            setUser(null);
          }
        }
      );
      
      setLoading(false);
      
      // Clean up subscription on unmount
      return () => {
        subscription.unsubscribe();
      };
    }
    
    setupAuth();
  }, []);

  // Determine if user has a specific role
  const hasRole = (role) => {
    if (!user) return false;
    return user.profile?.role === role;
  };
  
  // Check if user is any type of admin
  const isAdmin = () => {
    if (!user) return false;
    return user.profile?.role === 'planterplan_admin' || user.profile?.role === 'white_label_admin';
  };
  
  // Check if user belongs to a white label org
  const isWhiteLabel = () => {
    if (!user) return false;
    return user.profile?.role === 'white_label_user' || user.profile?.role === 'white_label_admin';
  };

  const value = {
    user,
    session,
    loading,
    hasRole,
    isAdmin,
    isWhiteLabel
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}