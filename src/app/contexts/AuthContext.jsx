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

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          // Robust Check: Use is_admin RPC to handle schema drift and RLS
          const { data: isAdmin, error: rpcError } = await supabase.rpc('is_admin', {
            p_user_id: session.user.id
          });

          if (rpcError) {
            console.error('Error checking admin status:', rpcError);
          }

          setUser({
            ...session.user,
            role: isAdmin ? 'admin' : 'owner'
          });
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Auth initialization failed:', err);
        setUser(null);
      } finally {
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
