import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '@app/supabaseClient';

export const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};



export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Shared session handler to prevent duplication and ensure consistency
    const handleSession = async (session) => {
      if (!session?.user) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        console.log('AuthContext: checking admin status for', session.user.id);
        const { data: isAdmin, error: rpcError } = await supabase.rpc('is_admin', { p_user_id: session.user.id });

        if (rpcError) {
          console.error('AuthContext: RPC error', rpcError);
          // Default to viewer on error/timeout
          setUser({ ...session.user, role: 'viewer' });
        } else {
          setUser({
            ...session.user,
            role: isAdmin ? 'admin' : 'owner'
          });
        }
      } catch (rpcCrash) {
        console.error('AuthContext: RPC crashed', rpcCrash);
        setUser({ ...session.user, role: 'viewer' });
      } finally {
        setLoading(false);
      }
    };

    // Get initial session
    const getSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;
        await handleSession(data.session);
      } catch (err) {
        console.error('AuthContext: getSession failed', err);
        setLoading(false);
        setUser(null);
      }
    };

    getSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthContext: Auth State Change:', event);
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        await handleSession(session);
      } else {
        // Handle other events like PASSWORD_RECOVERY?
        // Default to handling session if present
        if (session) await handleSession(session);
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

  const value = useMemo(() => ({
    user,
    loading,
    signUp,
    signIn,
    signOut,
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
