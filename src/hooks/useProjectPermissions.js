// src/hooks/useProjectPermissions.js
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../components/contexts/AuthContext';

/**
 * Hook to get comprehensive permissions for a specific project
 * @param {string} projectId - ID of the project
 * @returns {Object} - { permissions, role, loading, error, refresh }
 */
export const useProjectPermissions = (projectId) => {
  const { 
    user, 
    getProjectPermissionsWithCache,
    projectPermissionsCache 
  } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [role, setRole] = useState(null);

  const refresh = useCallback(async () => {
    if (!user?.id || !projectId) {
      setPermissions({});
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await getProjectPermissionsWithCache(projectId);
      
      setPermissions(result.permissions || {});
      setRole(result.role || null);
    } catch (err) {
      console.error('Error in useProjectPermissions:', err);
      setError(err.message);
      setPermissions({});
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id, projectId, getProjectPermissionsWithCache]);

  useEffect(() => {
    // Check cache first
    const cached = projectPermissionsCache[projectId];
    if (cached) {
      setPermissions(cached.permissions || {});
      setRole(cached.role || null);
      setLoading(false);
      return;
    }

    // If not in cache, fetch
    refresh();
  }, [projectId, projectPermissionsCache, refresh]);

  return {
    permissions,
    role,
    loading,
    error,
    refresh
  };
};

/**
 * Hook to check if user can edit a specific task
 * @param {string} taskId - ID of the task to check
 * @param {string} projectId - Optional project ID (will be determined if not provided)
 * @returns {Object} - { canEdit, loading, error, refresh }
 */
export const useCanEditTask = (taskId, projectId = null) => {
  const { user, hasProjectPermission, PERMISSIONS } = useAuth();
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resolvedProjectId, setResolvedProjectId] = useState(projectId);

  const refresh = useCallback(async () => {
    if (!user?.id || !taskId) {
      setCanEdit(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let actualProjectId = resolvedProjectId;

      // If project ID not provided, we need to find it
      // For now, we'll assume it's provided or handle this in the permission service
      if (!actualProjectId) {
        // TODO: Implement task-to-project resolution
        // This would require a helper function to find the root project of any task
        setError('Project ID is required');
        setCanEdit(false);
        setLoading(false);
        return;
      }

      const hasPermission = await hasProjectPermission(actualProjectId, PERMISSIONS.WRITE);
      setCanEdit(hasPermission);
    } catch (err) {
      console.error('Error in useCanEditTask:', err);
      setError(err.message);
      setCanEdit(false);
    } finally {
      setLoading(false);
    }
  }, [user?.id, taskId, resolvedProjectId, hasProjectPermission, PERMISSIONS.WRITE]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    canEdit,
    loading,
    error,
    refresh
  };
};

/**
 * Hook to check if user can manage team for a specific project
 * @param {string} projectId - ID of the project
 * @returns {Object} - { canManage, loading, error, refresh }
 */
export const useCanManageTeam = (projectId) => {
  const { user, hasProjectPermission, PERMISSIONS } = useAuth();
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!user?.id || !projectId) {
      setCanManage(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const hasPermission = await hasProjectPermission(projectId, PERMISSIONS.MANAGE_TEAM);
      setCanManage(hasPermission);
    } catch (err) {
      console.error('Error in useCanManageTeam:', err);
      setError(err.message);
      setCanManage(false);
    } finally {
      setLoading(false);
    }
  }, [user?.id, projectId, hasProjectPermission, PERMISSIONS.MANAGE_TEAM]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    canManage,
    loading,
    error,
    refresh
  };
};

/**
 * Hook to check multiple permissions at once
 * @param {string} projectId - ID of the project
 * @param {Array<string>} permissionsToCheck - Array of permission strings to check
 * @returns {Object} - { permissions: {permission: boolean}, loading, error, refresh }
 */
export const useMultiplePermissions = (projectId, permissionsToCheck = []) => {
  const { user, getProjectPermissionsWithCache } = useAuth();
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!user?.id || !projectId || permissionsToCheck.length === 0) {
      setPermissions({});
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await getProjectPermissionsWithCache(projectId);
      const userPermissions = result.permissions || {};
      
      // Filter to only the permissions we care about
      const filteredPermissions = {};
      permissionsToCheck.forEach(permission => {
        filteredPermissions[permission] = userPermissions[permission] || false;
      });

      setPermissions(filteredPermissions);
    } catch (err) {
      console.error('Error in useMultiplePermissions:', err);
      setError(err.message);
      setPermissions({});
    } finally {
      setLoading(false);
    }
  }, [user?.id, projectId, permissionsToCheck, getProjectPermissionsWithCache]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    permissions,
    loading,
    error,
    refresh
  };
};

/**
 * Permission-aware component wrapper utility
 * @param {Object} props - { children, projectId, requiredPermission, fallback, loading }
 * @returns {JSX.Element} - Renders children if permission granted, fallback otherwise
 */
export const PermissionGate = ({ 
  children, 
  projectId, 
  requiredPermission, 
  fallback = null,
  loading: customLoading = null 
}) => {
  const { permissions, loading } = useProjectPermissions(projectId);

  if (loading) {
    return customLoading || <div>Loading permissions...</div>;
  }

  const hasPermission = permissions[requiredPermission] || false;

  if (!hasPermission) {
    return fallback;
  }

  return children;
};

/**
 * Higher-order component for permission-aware rendering
 * @param {React.Component} Component - Component to wrap
 * @param {string} requiredPermission - Required permission
 * @returns {React.Component} - Wrapped component with permission checking
 */
export const withPermission = (Component, requiredPermission) => {
  return function PermissionWrappedComponent(props) {
    const { projectId, ...otherProps } = props;
    const { permissions, loading } = useProjectPermissions(projectId);

    if (loading) {
      return <div>Loading permissions...</div>;
    }

    const hasPermission = permissions[requiredPermission] || false;

    if (!hasPermission) {
      return <div>Access denied</div>;
    }

    return <Component {...otherProps} projectId={projectId} />;
  };
};

/**
 * Hook for role-based rendering
 * @param {string} projectId - ID of the project
 * @param {Array<string>} allowedRoles - Array of roles that should have access
 * @returns {Object} - { hasAccess, role, loading, error }
 */
export const useRoleAccess = (projectId, allowedRoles = []) => {
  const { role, loading, error } = useProjectPermissions(projectId);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (!loading && role) {
      setHasAccess(allowedRoles.includes(role));
    } else {
      setHasAccess(false);
    }
  }, [role, loading, allowedRoles]);

  return {
    hasAccess,
    role,
    loading,
    error
  };
};