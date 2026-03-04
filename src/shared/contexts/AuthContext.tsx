import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/shared/db/client';
import type { Session } from '@supabase/supabase-js';
import type { User, UserMetadata } from '@/shared/db/app.types';
import { authApi } from '@/shared/api/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, userData?: UserMetadata) => Promise<{ data: unknown; error: unknown }>;
  signIn: (email: string, password: string) => Promise<{ data: unknown; error: unknown }>;
  signOut: () => Promise<void>;
  updateMe: (attributes: UserMetadata) => Promise<User>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  console.log('AuthContext loaded v2 - TIMEOUT 2000ms');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Monotonic sequence counter to prevent race conditions
    let seq = 0;
    let alive = true;

    // Shared session handler to prevent duplication and ensure consistency
    const handleSession = async (session: Session | null) => {
      const mySeq = ++seq;

      if (!session?.user) {
        if (!alive || mySeq !== seq) return;
        setUser(null);
        setLoading(false);
        return;
      }

      // Optimistically set user with existing role (or default) to prevent UI flicker
      // Preservation Strategy: Use existing user role if ID matches, else session role, else null.
      const supabaseUser = session.user;
      setUser(prev => {
        const existingRole = (prev?.id === supabaseUser.id) ? prev.role : authApi.extractRoleFromMetadata(supabaseUser.user_metadata);

        return {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          role: existingRole,
          app_metadata: supabaseUser.app_metadata as UserMetadata,
          user_metadata: supabaseUser.user_metadata as UserMetadata,
          aud: supabaseUser.aud,
          created_at: supabaseUser.created_at
        };
      });

      try {
        console.log('AuthContext: checking admin status for', session.user.id);
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        const callWithTimeout = <T,>(promise: Promise<T>, ms = 10000): Promise<T> => {
          let timer: ReturnType<typeof setTimeout>;
          const timeoutPromise = new Promise<T>((_, reject) => {
            timer = setTimeout(() => {
              reject(new Error(`RPC Timeout after ${ms}ms`));
            }, ms);
          });
          return Promise.race([promise, timeoutPromise]).finally(() => {
            if (timer) clearTimeout(timer);
          });
        };

        if (isLocal) {
          console.log('[AuthContext] E2E Mode: Setting User immediately, RPC in background');
          // In local dev, default to owner if no role set
          setUser(prev => prev ? ({ ...prev, role: prev.role || 'owner' }) : null);
          setLoading(false);

          // Run in background without await
          authApi.checkIsAdmin(session.user.id).then((isAdmin) => {
            if (!alive || mySeq !== seq) return;
            if (isAdmin) setUser(prev => prev ? ({ ...prev, role: 'admin' }) : null);
          }).catch((e: unknown) => console.warn('Background RPC failed', e));
          return;
        }

        const isAdmin = await callWithTimeout(
          authApi.checkIsAdmin(session.user.id),
          30000
        ).catch((err: unknown) => {
          console.error('AuthContext: RPC Timed out or crashed', err);
          return false;
        });

        if (!alive || mySeq !== seq) return;

        console.log('[AuthContext] Setting User (Admin/Owner)');
        setUser(prev => {
          if (!prev) return null;
          return {
            ...prev,
            role: isAdmin ? 'admin' : 'owner'
          };
        });
      } catch (rpcCrash: unknown) {
        console.error('AuthContext: RPC crashed', rpcCrash);
        if (alive && mySeq === seq) {
          setUser(prev => {
            if (!prev) return null;
            return {
              ...prev,
              role: prev.role || 'viewer'
            };
          });
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
      try {
        if (event === 'SIGNED_OUT') {
          seq++; // Invalidate pending ops
          setUser(null);
          setLoading(false);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          await handleSession(session);
        } else {
          if (session) await handleSession(session);
        }
      } catch (err) {
        console.error('[AuthContext] Unhandled promise rejection in auth state change:', err);
      }
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string, userData: UserMetadata = {}) => {
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
    } catch (error: unknown) {
      return { data: null, error };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error: unknown) {
      return { data: null, error };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: unknown) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      setUser(null);
      setLoading(false);
    }
  }, []);


  const updateMe = useCallback(async (attributes: UserMetadata) => {
    const { data, error } = await supabase.auth.updateUser({
      data: attributes,
    });
    if (error) throw error;
    if (!data.user) throw new Error('Failed to update user');
    const updatedUser = {
      id: data.user.id,
      email: data.user.email || '',
      role: user?.role || 'viewer',
      app_metadata: data.user.app_metadata as UserMetadata,
      user_metadata: data.user.user_metadata as UserMetadata,
      aud: data.user.aud,
      created_at: data.user.created_at
    };
    setUser(updatedUser);
    return updatedUser;
  }, [user]);

  const value = useMemo(() => ({
    user,
    loading,
    signUp,
    signIn,
    signOut,
    updateMe,
  }), [user, loading, signUp, signIn, signOut, updateMe]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
