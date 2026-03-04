import React, { createContext, useContext, useMemo } from 'react';
import type { User, UserMetadata } from '@/shared/db/app.types';
import { SessionProvider, useSession } from './SessionContext';
import { UserProfileProvider, useUserProfile } from './UserProfileContext';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, userData?: UserMetadata) => Promise<{ data: unknown; error: unknown }>;
  signIn: (email: string, password: string) => Promise<{ data: unknown; error: unknown }>;
  signOut: () => Promise<void>;
  updateMe: (attributes: UserMetadata) => Promise<User>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

function AuthMacroProvider({ children }: { children: React.ReactNode }) {
  const { user, loading, signUp, signIn, signOut } = useSession();
  const { updateMe } = useUserProfile();

  const value = useMemo(() => ({
    user,
    loading,
    signUp,
    signIn,
    signOut,
    updateMe,
  }), [user, loading, signUp, signIn, signOut, updateMe]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <UserProfileProvider>
        <AuthMacroProvider>
          {children}
        </AuthMacroProvider>
      </UserProfileProvider>
    </SessionProvider>
  );
}
