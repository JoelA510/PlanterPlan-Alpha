
// src/hooks/useInvitations.js
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../components/contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { 
  canUserCreateProject, 
  validateLicense,
  markLicenseAsUsed,
  checkUserExistingProjects,
} from '../services/licenseService';

/**
 * Custom hook for managing license-related functionality
 * Handles license validation, application, and project creation permissions
 */
export const useLicenses = () => {
    const { user } = useAuth();
    
    // License system state
    const [canCreateProject, setCanCreateProject] = useState(false);
    const [userHasProjects, setUserHasProjects] = useState(false);
    const [projectLimitReason, setProjectLimitReason] = useState('');
    const [userLicenses, setUserLicenses] = useState([]);
    const [selectedLicenseId, setSelectedLicenseId] = useState(null);
    const [isCheckingLicense, setIsCheckingLicense] = useState(true);
  
    /**
     * Check if user can create a new project
     * @returns {Promise<boolean>} - Whether user has existing projects
     */
    const checkForExistingProjects = useCallback(async () => {
      if (!user?.id) return false;
      
      try {
        const { hasProjects } = await checkUserExistingProjects(user.id);
        setUserHasProjects(hasProjects);
        return hasProjects;
      } catch (error) {
        console.error('Error checking for existing projects:', error);
        return false;
      }
    }, [user?.id]);
  
    /**
     * Fetch all licenses for the current user
     */
    const fetchUserLicenses = useCallback(async () => {
      if (!user?.id) return;
      
      try {
        console.log("Fetching user licenses");
        let { data, error } = await supabase
          .from('licenses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) throw new Error(error.message);
        
        setUserLicenses(data || []);
        console.log(data);
      } catch (error) {
        console.error('Error fetching user licenses:', error);
      }
    }, [user?.id]);
  
    /**
     * Apply a license key to the user's account
     * @param {string} licenseKey - The license key to validate and apply
     * @returns {Promise<{success: boolean, error?: string, licenseId?: string}>}
     */
    const applyLicenseKey = useCallback(async (licenseKey) => {
      if (!user?.id) {
        console.error('License application failed: No user ID available');
        return { success: false, error: 'User not authenticated' };
      }
      
      try {
        console.log('Validating license key', { licenseKey: licenseKey, userId: user.id });
        const result = await validateLicense(licenseKey, user.id);
        console.log('License validation result', result);
        
        if (result.success && result.data && result.data.id) {
          try {
            console.log('License data found, marking as used:', result.data.id);
            const markedLicenseRes = await markLicenseAsUsed(result.data.id);
            console.log('License marked as used successfully');
            if (markedLicenseRes.success) {
              return { 
                success: true, 
                licenseId: result.data.id
              };
            } else {
              console.error('Failed to mark license as used', markedLicenseRes.error);
              return { 
                success: false, 
                error: markedLicenseRes.error || 'Failed to mark license as used'
              };
            }
          } catch (error) {
            console.error('Failed during marking license as used', error );
            return { 
              success: false, 
              error: error.message || 'An unexpected error occurred while marking license as used'
            };
          }
        } else {
          console.error('License validation failed', { 
            success: result.success, 
            error: result.error,
            hasData: !!result.data,
            dataId: result.data?.id
          });
          return { 
            success: false, 
            error: result.error || 'License validation failed - invalid response format'
          };
        }
      } catch (error) {
        console.error('Unexpected error during license application', error);
        return { 
          success: false, 
          error: error.message || 'An unexpected error occurred'
        };
      }
    }, [user?.id]);
  
    /**
     * Select a license for a new project
     * @param {string} licenseId - The ID of the license to select
     */
    const selectLicense = useCallback((licenseId) => {
      setSelectedLicenseId(licenseId);
    }, []);
  
    /**
     * Get the currently selected license object
     * @returns {Object|null} - The selected license object or null
     */
    const getSelectedLicense = useCallback(() => {
      if (!selectedLicenseId || !userLicenses.length) return null;
      return userLicenses.find(license => license.id === selectedLicenseId) || null;
    }, [selectedLicenseId, userLicenses]);
  
    /**
     * Clear the selected license
     */
    const clearSelectedLicense = useCallback(() => {
      setSelectedLicenseId(null);
    }, []);
  
    /**
     * Check project creation ability based on current license status
     * This is a comprehensive check that considers user's projects and available licenses
     */
    const checkProjectCreationAbility = useCallback(async () => {
      if (!user?.id) {
        setCanCreateProject(false);
        setProjectLimitReason('User not authenticated');
        setIsCheckingLicense(false);
        return;
      }
  
      try {
        setIsCheckingLicense(true);
        
        // Check if user has existing projects
        const hasProjects = await checkForExistingProjects();
        
        if (!hasProjects) {
          // User can create their first project without a license
          setCanCreateProject(true);
          setProjectLimitReason('');
        } else {
          // User has projects, need to check for available licenses
          await fetchUserLicenses();
          
          // This will be updated when userLicenses state is updated
          // The actual logic is in the useEffect below
        }
      } catch (error) {
        console.error('Error checking project creation ability:', error);
        setCanCreateProject(false);
        setProjectLimitReason('Error checking project permissions');
      } finally {
        setIsCheckingLicense(false);
      }
    }, [user?.id, checkForExistingProjects, fetchUserLicenses]);
  
    /**
     * Validate if a project can be created with current license state
     * @param {string|null} licenseId - Optional license ID to use for creation
     * @returns {{canCreate: boolean, reason: string, licenseId: string|null}}
     */
    const validateProjectCreation = useCallback((licenseId = null) => {
      // If user has no projects, they can create one without a license
      if (!userHasProjects) {
        return {
          canCreate: true,
          reason: '',
          licenseId: null
        };
      }
  
      // User has projects, need a license
      if (!licenseId && !selectedLicenseId) {
        return {
          canCreate: false,
          reason: 'You already have a project. Please provide a license key to create additional projects.',
          licenseId: null
        };
      }
  
      const useThisLicenseId = licenseId || selectedLicenseId;
      const license = userLicenses.find(l => l.id === useThisLicenseId);
      
      if (!license) {
        return {
          canCreate: false,
          reason: 'Selected license not found',
          licenseId: null
        };
      }
  
      if (license.is_used) {
        return {
          canCreate: false,
          reason: 'Selected license has already been used',
          licenseId: null
        };
      }
  
      return {
        canCreate: true,
        reason: '',
        licenseId: useThisLicenseId
      };
    }, [userHasProjects, selectedLicenseId, userLicenses]);
  
    // Effect to update project creation ability when licenses change
    useEffect(() => {
      if (userHasProjects && userLicenses.length >= 0) {
        const availableLicenses = userLicenses.filter(license => !license.is_used);
        
        if (availableLicenses.length > 0) {
          setCanCreateProject(true);
          setProjectLimitReason('');
        } else {
          setCanCreateProject(false);
          setProjectLimitReason('No available licenses. Please purchase a license to create additional projects.');
        }
      }
    }, [userHasProjects, userLicenses]);
  
    // Effect to initialize license checking when user is available
    useEffect(() => {
      if (user?.id) {
        checkProjectCreationAbility();
      }
    }, [user?.id, checkProjectCreationAbility]);
  
    return {
      // State
      canCreateProject,
      userHasProjects,
      projectLimitReason,
      userLicenses,
      selectedLicenseId,
      isCheckingLicense,
      
      // Actions
      checkForExistingProjects,
      fetchUserLicenses,
      applyLicenseKey,
      selectLicense,
      clearSelectedLicense,
      checkProjectCreationAbility,
      validateProjectCreation,
      
      // Computed values
      getSelectedLicense,
      availableLicenses: userLicenses.filter(license => !license.is_used),
      usedLicenses: userLicenses.filter(license => license.is_used),
    };
  };