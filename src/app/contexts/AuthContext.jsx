import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@app/supabaseClient';

export const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AUTH_TIMEOUT_MS = 10000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      let session = null;
      try {
        console.log('AuthContext: calling getSession');

        // Timeout wrapper to prevent infinite hanging
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Auth Session Timeout')), AUTH_TIMEOUT_MS)
        );

        const { data, error } = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise
        ]);
        if (error) throw error;
        session = data.session;
        console.log('AuthContext: getSession success', { user: session?.user?.id });
      } catch (err) {
        // Ignore AbortError which happens on rapid reloads/strict mode
        if (err.name === 'AbortError') {
          console.warn('AuthContext: getSession aborted (harmless)');
        } else if (err.message === 'Auth Session Timeout') {
          console.warn('AuthContext: Session timed out. Clearing stale tokens.');
          // Flexible token clearing for any Supabase project
          Object.keys(localStorage).forEach((key) => {
            if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
              localStorage.removeItem(key);
            }
          });
        } else {
          console.error('AuthContext: getSession failed', err);
        }
        setLoading(false);
        setUser(null);
        return;
      }

      if (session?.user) {
        try {
          console.log('AuthContext: calling is_admin RPC');
          // Robust Check: Use is_admin RPC to handle schema drift and RLS
          const { data: isAdmin, error: rpcError } = await supabase.rpc('is_admin', {
            p_user_id: session.user.id
          });

          if (rpcError) {
            console.error('AuthContext: RPC error', rpcError);
          } else {
            console.log('AuthContext: RPC success', isAdmin);
          }

          setUser({
            ...session.user,
            role: isAdmin ? 'admin' : 'owner' // Fallback to owner if RPC fails or returns false
          });
        } catch (rpcCrash) {
          console.error('AuthContext: RPC crashed', rpcCrash);
          // Fallback to owner on crash
          setUser({ ...session.user, role: 'owner' });
        }
        setLoading(false); // Ensure loading is cleared after logic
      } else {
        setUser(null);
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (session?.user) {
          const { data: isAdmin } = await supabase.rpc('is_admin', {
            p_user_id: session.user.id
          });

          setUser({
            ...session.user,
            role: isAdmin ? 'admin' : 'owner'
          });
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Auth change handling failed:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email, password, userData = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
