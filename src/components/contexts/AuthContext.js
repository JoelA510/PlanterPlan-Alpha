// src/components/contexts/AuthContext.js
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../../supabaseClient';
import { 
  getUserProjectRole, 
  getUserProjectPermissions, 
  canUserAccessProject,
  userHasProjectPermission,
  PERMISSIONS 
} from '../../services/permissionService';

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [userOrgId, setUserOrgId] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  
  // New project permission states
  const [userProjectRoles, setUserProjectRoles] = useState({}); // { projectId: role }
  const [currentProjectPermissions, setCurrentProjectPermissions] = useState({});
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [projectPermissionsCache, setProjectPermissionsCache] = useState({}); // Cache for performance
  
  // Refs for optimization
  const permissionCacheRef = useRef({});
  const rolesCacheRef = useRef({});
  
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
      console.log("Fetching user info:", data);
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  }, []);

  // Get user's role in a specific project with caching
  const getUserProjectRoleWithCache = useCallback(async (projectId) => {
    if (!user?.id || !projectId) return null;
    
    // Check cache first
    if (rolesCacheRef.current[projectId]) {
      return rolesCacheRef.current[projectId];
    }
    
    try {
      const { role, error } = await getUserProjectRole(user.id, projectId);
      
      if (error) {
        console.error('Error getting project role:', error);
        return null;
      }
      
      // Cache the result
      rolesCacheRef.current[projectId] = role;
      
      // Update state
      setUserProjectRoles(prev => ({
        ...prev,
        [projectId]: role
      }));
      
      return role;
    } catch (err) {
      console.error('Error in getUserProjectRoleWithCache:', err);
      return null;
    }
  }, [user?.id]);

  // Get comprehensive permissions for a project with caching
  const getProjectPermissionsWithCache = useCallback(async (projectId) => {
    if (!user?.id || !projectId) return {};
    
    // Check cache first
    const cacheKey = `${user.id}-${projectId}`;
    if (permissionCacheRef.current[cacheKey]) {
      return permissionCacheRef.current[cacheKey];
    }
    
    try {
      const { permissions, role, error } = await getUserProjectPermissions(user.id, projectId);
      
      if (error) {
        console.error('Error getting project permissions:', error);
        return {};
      }
      
      const permissionData = { permissions, role };
      
      // Cache the result
      permissionCacheRef.current[cacheKey] = permissionData;
      
      // Update state if this is the current project
      if (projectId === currentProjectId) {
        setCurrentProjectPermissions(permissionData);
      }
      
      // Update project permissions cache state
      setProjectPermissionsCache(prev => ({
        ...prev,
        [projectId]: permissionData
      }));
      
      return permissionData;
    } catch (err) {
      console.error('Error in getProjectPermissionsWithCache:', err);
      return {};
    }
  }, [user?.id, currentProjectId]);

  // Set the current project context
  const setCurrentProject = useCallback(async (projectId) => {
    if (currentProjectId === projectId) return; // No change needed
    
    setCurrentProjectId(projectId);
    
    if (projectId) {
      // Fetch permissions for the new current project
      await getProjectPermissionsWithCache(projectId);
    } else {
      // Clear current project permissions
      setCurrentProjectPermissions({});
    }
  }, [currentProjectId, getProjectPermissionsWithCache]);

  // Check if user has a specific permission in the current project
  const hasCurrentProjectPermission = useCallback((permission) => {
    if (!currentProjectPermissions.permissions) return false;
    return currentProjectPermissions.permissions[permission] || false;
  }, [currentProjectPermissions]);

  // Check if user has a specific permission in any project
  const hasProjectPermission = useCallback(async (projectId, permission) => {
    if (!user?.id || !projectId) return false;
    
    try {
      const { hasPermission } = await userHasProjectPermission(user.id, projectId, permission);
      return hasPermission;
    } catch (err) {
      console.error('Error checking project permission:', err);
      return false;
    }
  }, [user?.id]);

  // Get user's role in a specific project (helper function)
  const getProjectRole = useCallback((projectId) => {
    return userProjectRoles[projectId] || null;
  }, [userProjectRoles]);

  // Check if user can access a project
  const canAccessProject = useCallback(async (projectId) => {
    if (!user?.id || !projectId) return false;
    
    try {
      const { canAccess } = await canUserAccessProject(user.id, projectId);
      return canAccess;
    } catch (err) {
      console.error('Error checking project access:', err);
      return false;
    }
  }, [user?.id]);

  // Clear permission caches (useful when user roles change)
  const clearPermissionCache = useCallback(() => {
    permissionCacheRef.current = {};
    rolesCacheRef.current = {};
    setUserProjectRoles({});
    setProjectPermissionsCache({});
    setCurrentProjectPermissions({});
  }, []);

  // Prefetch permissions for multiple projects (optimization)
  const prefetchProjectPermissions = useCallback(async (projectIds) => {
    if (!user?.id || !Array.isArray(projectIds)) return;
    
    const promises = projectIds.map(projectId => getProjectPermissionsWithCache(projectId));
    await Promise.allSettled(promises);
  }, [user?.id, getProjectPermissionsWithCache]);

  // Original hasRole function for system-level roles
  const hasRole = useCallback((role) => {
    if (!user) return false;
    return userInfo?.role === role;
  }, [user, userInfo]);

  // Enhanced session management
  useEffect(() => {
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
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);
      
      if (newUser) {
        await fetchUserInfo(newUser);
      } else {
        // Clear all state when user logs out
        setUserRole(null);
        setUserOrgId(null);
        setUserInfo(null);
        clearPermissionCache();
        setCurrentProjectId(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [fetchUserInfo, clearPermissionCache]);

  // Clear cache when user changes
  useEffect(() => {
    if (user?.id) {
      // User changed, clear old cache
      clearPermissionCache();
    }
  }, [user?.id, clearPermissionCache]);

  const value = { 
    // Original auth state
    user, 
    loading, 
    hasRole, 
    userRole, 
    userInfo, 
    userOrgId,
    
    // New project permission state
    userProjectRoles,
    currentProjectPermissions,
    currentProjectId,
    projectPermissionsCache,
    
    // Project permission functions
    getUserProjectRoleWithCache,
    getProjectPermissionsWithCache,
    setCurrentProject,
    hasCurrentProjectPermission,
    hasProjectPermission,
    getProjectRole,
    canAccessProject,
    clearPermissionCache,
    prefetchProjectPermissions,
    
    // Permission constants for easy access
    PERMISSIONS
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for convenience
export const useAuth = () => {
  return useContext(AuthContext);
};