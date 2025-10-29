// src/AuthContext.jsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../../supabaseClient';

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [userOrgId, setUserOrgId] = useState(null);
  const [userInfo, setUserInfo] = useState(null);

  // Fetch user information including role and white_label_org_id
  const fetchUserInfo = useCallback(async (authUser) => {
    if (!authUser) return;
    
    try {
      // Get the user's details from the users table
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();
        
      if (error) {
        console.error('Error fetching user info:', error);
        return;
      }
      
      // Set the user's role and organization ID
      setUserRole(data.role);
      setUserOrgId(data.white_label_org_id);
      setUserInfo(data);
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  }, []);

  useEffect(() => {
    // Check for an active session on mount
    // Check for an active session on mount
    const initAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        if (user) {
          await fetchUserInfo(user);
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen to auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [fetchUserInfo])

  useEffect(() => {
    if (user) {
      fetchUserInfo(user);
    }
  }, [user, fetchUserInfo]);

  // const hasRole = useCallback((role) => {
  //   if (!user) return false;
  //   return userInfo.role === role;
  // }, [user]);
  const hasRole = useCallback((role) => {
    if (!user || !userInfo) return false;
    return userInfo.role === role;
  }, [user, userInfo]);

  const value = { user, loading, hasRole, userRole, userInfo, userOrgId }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook for convenience
export const useAuth = () => {
  return useContext(AuthContext)
}
