import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // State
  const [userState, setUserState] = useState(null);
  const [sessionState, setSessionState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Memoized state values
  const user = useMemo(() => userState, [userState]);
  const session = useMemo(() => sessionState, [sessionState]);

  // Get user data with profile information
  const getCurrentUser = useCallback(async () => {
    try {
      // Get the current user from auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Auth error in getCurrentUser:', authError);
        return { user: null, error: authError || new Error('No authenticated user') };
      }
      
      // Get user profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles') // Your user profile table name
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.error('Profile error in getCurrentUser:', profileError);
        // Return just the auth user if profile fetch fails
        return { user, error: null };
      }
      
      // Combine auth user with profile data
      return {
        user: {
          ...user,
          profile
        },
        error: null
      };
    } catch (err) {
      console.error('Unexpected error in getCurrentUser:', err);
      return { user: null, error: err };
    }
  }, []);

  // Set up auth state listener on mount
  useEffect(() => {
    console.log('Setting up auth listener...');
    let mounted = true;
    
    async function setupAuth() {
      try {
        setLoading(true);
        setError(null);
        
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }
        
        if (mounted) {
          setSessionState(session);
          
          if (session) {
            const { user: userData, error: userError } = await getCurrentUser();
            if (userError) {
              console.warn('Error getting user data on init:', userError);
            } else if (userData && mounted) {
              setUserState(userData);
            }
          }
        }
        
        // Set up auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            console.log(`Auth event: ${event}`);
            
            if (!mounted) return;
            
            try {
              // Update session state
              setSessionState(newSession);
              
              switch (event) {
                case 'SIGNED_IN':
                  if (newSession) {
                    const { user: userData, error: userError } = await getCurrentUser();
                    if (userError) {
                      console.error('Error getting user data on sign-in:', userError);
                    } else if (mounted) {
                      setUserState(userData);
                    }
                  }
                  break;
                  
                case 'SIGNED_OUT':
                  setUserState(null);
                  break;
                  
                case 'TOKEN_REFRESHED':
                  // No need to refresh user data typically
                  break;
                  
                case 'USER_UPDATED':
                  if (newSession) {
                    const { user: userData, error: userError } = await getCurrentUser();
                    if (userError) {
                      console.error('Error getting updated user data:', userError);
                    } else if (mounted) {
                      setUserState(userData);
                    }
                  }
                  break;
                  
                case 'USER_DELETED':
                  setUserState(null);
                  setSessionState(null);
                  break;
                
                default:
                  break;
              }
            } catch (err) {
              console.error('Error in auth state change handler:', err);
              if (mounted) {
                setError(err.message);
              }
            }
          }
        );
        
        // Add visibility change handler
        const handleVisibilityChange = async () => {
          if (document.visibilityState === 'visible' && mounted) {
            console.log('Tab became visible, checking session status');
            
            // Check if session still exists but has updated
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            
            if (currentSession && mounted) {
              // Only update if session has changed to prevent unnecessary renders
              if (JSON.stringify(currentSession) !== JSON.stringify(sessionState)) {
                setSessionState(currentSession);
                
                // Refresh user data if session exists
                const { user: userData } = await getCurrentUser();
                if (userData && mounted) {
                  setUserState(userData);
                }
              }
            } else if (sessionState && mounted) {
              // Had a session before but it's gone now
              setSessionState(null);
              setUserState(null);
            }
          }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Clean up function
        return () => {
          console.log('Cleaning up auth listener');
          mounted = false;
          subscription?.unsubscribe();
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
      } catch (err) {
        console.error('Error setting up auth:', err);
        if (mounted) {
          setError(err.message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    
    setupAuth();
  }, [getCurrentUser]);

  // Auth helper methods
  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (err) {
      console.error('Error signing out:', err);
      return { error: err.message };
    }
  }, []);

  // Memoize role-based helper functions
  const hasRole = useCallback((role) => {
    if (!user) return false;
    return user.profile?.role === role;
  }, [user]);
  
  const isAdmin = useMemo(() => {
    if (!user) return false;
    return user.profile?.role === 'planterplan_admin' || user.profile?.role === 'white_label_admin';
  }, [user]);
  
  const isWhiteLabel = useMemo(() => {
    if (!user) return false;
    return user.profile?.role === 'white_label_user' || user.profile?.role === 'white_label_admin';
  }, [user]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    session,
    loading,
    error,
    signOut,
    hasRole,
    isAdmin,
    isWhiteLabel,
    refreshUser: async () => {
      const { user: refreshedUser } = await getCurrentUser();
      if (refreshedUser) {
        setUserState(refreshedUser);
      }
      return refreshedUser;
    }
  }), [user, session, loading, error, signOut, hasRole, isAdmin, isWhiteLabel, getCurrentUser]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}