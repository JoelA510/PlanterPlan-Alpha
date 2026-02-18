import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '@/shared/db/client';

export const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};



export function AuthProvider({ children }) {
  console.log('AuthContext loaded v2 - TIMEOUT 2000ms');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Monotonic sequence counter to prevent race conditions
    let seq = 0;
    let alive = true;

    // Shared session handler to prevent duplication and ensure consistency
    const handleSession = async (session) => {
      const mySeq = ++seq;

      if (!session?.user) {
        if (!alive || mySeq !== seq) return;
        setUser(null);
        setLoading(false);
        return;
      }

      // Optimistically set user with existing role (or default) to prevent UI flicker
      // Preservation Strategy: Use existing user role if ID matches, else session role, else null.
      setUser(prev => {
        const existingRole = (prev?.id === session.user.id) ? prev.role : (session.user.role || null);
        return { ...session.user, role: existingRole };
      });

      try {
        console.log('AuthContext: checking admin status for', session.user.id);
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        const callWithTimeout = (promise, ms = 10000) => {
          return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => {
              reject(new Error(`RPC Timeout after ${ms}ms`));
            }, ms))
          ]);
        };

        if (isLocal) {
          console.log('[AuthContext] E2E Mode: Setting User immediately, RPC in background');
          // In local dev, default to owner if no role set
          setUser(prev => ({ ...prev, role: prev.role || 'owner' }));
          setLoading(false);

          // Run in background without await
          supabase.rpc('is_admin', { p_user_id: session.user.id }).then(({ data: isAdmin }) => {
            if (!alive || mySeq !== seq) return;
            if (isAdmin) setUser(prev => ({ ...prev, role: 'admin' }));
          }).catch(e => console.warn('Background RPC failed', e));
          return;
        }

        const { data: isAdmin, error: rpcError } = await callWithTimeout(
          supabase.rpc('is_admin', { p_user_id: session.user.id }),
          30000
        ).catch(err => {
          console.error('AuthContext: RPC Timed out or crashed', err);
          return { error: err };
        });

        if (!alive || mySeq !== seq) return;

        if (rpcError) {
          console.error('AuthContext: RPC error', rpcError);
          // CRITICAL FIX: Do NOT downgrade to 'viewer' on error if we already have a role
          // Only default to 'viewer' if we have absolutely no role information
          setUser(prev => ({
            ...session.user,
            role: prev?.role || session.user.role || 'viewer'
          }));
        } else {
          console.log('[AuthContext] Setting User (Admin/Owner)');
          setUser({
            ...session.user,
            role: isAdmin ? 'admin' : 'owner'
          });
        }
      } catch (rpcCrash) {
        console.error('AuthContext: RPC crashed', rpcCrash);
        if (alive && mySeq === seq) {
          setUser(prev => ({
            ...session.user,
            role: prev?.role || session.user.role || 'viewer'
          }));
        }
      } finally {
        if (alive && mySeq === seq) {
          console.log('[AuthContext] setLoading(false)');
          setLoading(false);
        }
      }
    };

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        seq++; // Invalidate pending ops
        setUser(null);
        setLoading(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        await handleSession(session);
      } else {
        if (session) await handleSession(session);
      }
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
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
