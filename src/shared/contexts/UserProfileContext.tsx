import React, { createContext, useContext, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/shared/db/client';
import type { User, UserMetadata } from '@/shared/db/app.types';
import { authApi } from '@/shared/api/auth';
import { useSession } from './SessionContext';

interface UserProfileContextType {
  updateMe: (attributes: UserMetadata) => Promise<User>;
}

export const UserProfileContext = createContext<UserProfileContextType | null>(null);

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
};

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const { user, setSessionUser } = useSession();

  useEffect(() => {
    if (!user) return;
    let alive = true;

    const fetchRole = async () => {
      try {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocal) {
          setSessionUser({ ...user, role: user.role || 'owner' });
          const isAdmin = await authApi.checkIsAdmin(user.id);
          if (alive && isAdmin) setSessionUser({ ...user, role: 'admin' });
          return;
        }

        const isAdmin = await authApi.checkIsAdmin(user.id);
        if (alive) {
          setSessionUser({ ...user, role: isAdmin ? 'admin' : 'owner' });
        }
      } catch (e) {
        if (alive) setSessionUser({ ...user, role: user.role || 'viewer' });
      }
    };

    fetchRole();

    return () => { alive = false; };
  }, [user?.id]); // Only re-run if user ID changes, not on every user object mutation

  const updateMe = useCallback(async (attributes: UserMetadata) => {
    const { data, error } = await supabase.auth.updateUser({ data: attributes });
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
    
    setSessionUser(updatedUser);
    return updatedUser;
  }, [user, setSessionUser]);

  const value = useMemo(() => ({ updateMe }), [updateMe]);

  return <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>;
}
