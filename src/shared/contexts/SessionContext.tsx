import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/shared/db/client';
import type { Session } from '@supabase/supabase-js';
import type { User, UserMetadata } from '@/shared/db/app.types';

interface SessionContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, userData?: UserMetadata) => Promise<{ data: unknown; error: unknown }>;
  signIn: (email: string, password: string) => Promise<{ data: unknown; error: unknown }>;
  signOut: () => Promise<void>;
  setSessionUser: (user: User | null) => void;
}

export const SessionContext = createContext<SessionContextType | null>(null);

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const handleSession = (session: Session | null) => {
      if (!session?.user) {
        if (!alive) return;
        setUser(null);
        setLoading(false);
        return;
      }

      const supabaseUser = session.user;
      setUser(prev => ({
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        role: prev?.role || 'viewer', // will be hydrated later via UserProfileContext
        app_metadata: supabaseUser.app_metadata as UserMetadata,
        user_metadata: supabaseUser.user_metadata as UserMetadata,
        aud: supabaseUser.aud,
        created_at: supabaseUser.created_at
      }));
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      } else {
        handleSession(session);
      }
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string, userData: UserMetadata = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: userData } });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } finally {
      setUser(null);
      setLoading(false);
    }
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    signUp,
    signIn,
    signOut,
    setSessionUser: setUser
  }), [user, loading, signUp, signIn, signOut]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
