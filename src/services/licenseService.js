// src/services/licenseService.js
import { supabase } from '../supabaseClient';

/**
 * Generate a new license key
 * @param {Object} licenseData - The license data
 * @returns {Promise<{data: Object, error: string}>} - The created license data or error
 */
export const generateLicense = async (licenseData) => {
  try {
    // Generate a random license key if not provided
    if (!licenseData.license_key) {
      licenseData.license_key = generateRandomLicenseKey();
    }
    
    // Set default values based on your schema
    const license = {
      license_key: licenseData.license_key,
      org_id: licenseData.org_id || null,
      is_used: false,
      // created_at is added automatically by Supabase
    };
    
    const { data, error } = await supabase
      .from('licenses')
      .insert([license])
      .select();
    
    if (error) {
      console.error('Supabase error:', error);
      return { error: error.message || 'Failed to create license' };
    }
    
    return { data: data[0] };
  } catch (err) {
    console.error('Error creating license:', err);
    return { error: err.message || 'Unknown error occurred' };
  }
};

/**
 * Apply a license key to a user
 * @param {string} licenseKey - The license key to apply
 * @param {string} userId - The user ID to apply the license to
 * @returns {Promise<{success: boolean, error: string}>} - Result of the operation
 */
// export const applyLicense = async (licenseKey, userId) => {
//   try {
//     // First check if the license key is valid and unused
//     const { data: license, error: fetchError } = await supabase
//       .from('licenses')
//       .select('*')
//       .eq('license_key', licenseKey)
//       .eq('is_used', false)
//       .maybeSingle();
    
//     if (fetchError) {
//       console.error('Error fetching license:', fetchError);
//       return { success: false, error: 'Error validating license key' };
//     }
    
//     if (!license) {
//       return { success: false, error: 'Invalid or already used license key' };
//     }
    
//     // Update the license to mark it as used
//     const { error: updateError } = await supabase
//       .from('licenses')
//       .update({ 
//         is_used: true,
//         user_id: userId
//       })
//       .eq('id', license.id);
    
//     if (updateError) {
//       console.error('Error updating license:', updateError);
//       return { success: false, error: 'Error applying license key' };
//     }
    
//     return { success: true, data: license };
//   } catch (err) {
//     console.error('Error applying license:', err);
//     return { success: false, error: err.message || 'Unknown error occurred' };
//   }
// };

/**
 * Check if a user can create a new project
 * @param {string} userId - The user ID to check
 * @returns {Promise<{canCreate: boolean, reason: string}>} - Whether the user can create a project
 */
export const canUserCreateProject = async (userId) => {
  try {
    // Count user's projects (top-level tasks with origin=instance)
    const { data: userProjects, error: projectError } = await supabase
      .from('tasks')
      .select('id')
      .is('parent_task_id', null)
      .eq('origin', 'instance')
      .eq('creator', userId);
    
    if (projectError) {
      console.error('Error fetching projects:', projectError);
      return { canCreate: false, reason: 'Error checking projects' };
    }
    
    // If user has no projects, they can create one for free
    if (!userProjects || userProjects.length === 0) {
      return { canCreate: true, reason: 'First project is free' };
    }
    
    // Check if user has any unused license keys
    const { data: licenses, error: licenseError } = await supabase
      .from('licenses')
      .select('*')
      .eq('user_id', userId)
      .eq('is_used', false);
    
    if (licenseError) {
      console.error('Error fetching licenses:', licenseError);
      return { canCreate: false, reason: 'Error checking licenses' };
    }
    
    if (licenses && licenses.length > 0) {
      return { 
        canCreate: true, 
        reason: 'User has available licenses',
        licenses 
      };
    }
    
    return { 
      canCreate: false, 
      reason: 'You already have the maximum number of projects. Please apply a license key to create additional projects.' 
    };
  } catch (err) {
    console.error('Error checking if user can create project:', err);
    return { canCreate: false, reason: err.message || 'Unknown error occurred' };
  }
};

/**
 * Check if a user has any existing projects
 * @param {string} userId - The user ID to check
 * @returns {Promise<{hasProjects: boolean, count: number, error: string|null}>} - Result of the check
 */
export const checkUserExistingProjects = async (userId) => {
    try {
      if (!userId) {
        return { 
          hasProjects: false, 
          count: 0, 
          error: "User ID is required" 
        };
      }
  
      // Count user's projects (top-level tasks with origin=instance)
      const { data: userProjects, error: projectError } = await supabase
        .from('tasks')
        .select('id')
        .is('parent_task_id', null)
        .eq('origin', 'instance')
        .eq('creator', userId);
      
      if (projectError) {
        console.error('Error fetching projects:', projectError);
        return { 
          hasProjects: false, 
          count: 0, 
          error: 'Error checking projects' 
        };
      }
      
      const projectCount = userProjects?.length || 0;
      
      return { 
        hasProjects: projectCount > 0, 
        count: projectCount,
        error: null
      };
    } catch (err) {
      console.error('Error checking user projects:', err);
      return { 
        hasProjects: false, 
        count: 0, 
        error: err.message || 'Unknown error occurred' 
      };
    }
  };

/**
 * Generate a random license key
 * @returns {string} - A random license key
 */
const generateRandomLicenseKey = () => {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar looking characters
  let result = '';
  
  // Generate 4 groups of 4 characters
  for (let group = 0; group < 4; group++) {
    for (let i = 0; i < 4; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters.charAt(randomIndex);
    }
    
    // Add hyphen between groups, but not after the last group
    if (group < 3) {
      result += '-';
    }
  }
  
  return result;
};

// src/services/licenseService.js

/**
 * Checks if a license key is valid and available for a user
 * @param {string} licenseKey - The license key to validate
 * @param {string} userId - The user ID to check against
 * @returns {Promise<{success: boolean, data: Object, error: string}>} - The license data or error
 */
export const validateLicense = async (licenseKey, userId) => {
  try {
    console.log("Validating license - key:", licenseKey, "userId:", userId);
    
    // Add timeout to the request (adjust as needed)
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 10000); // 10 second timeout
    
    // Simplified query - first just check if the license exists
    const { data, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('license_key', licenseKey)
      .maybeSingle()
      .abortSignal(abortController.signal);
    
    clearTimeout(timeoutId);
    
    if (error) {
      console.error('Error validating license:', error);
      return { success: false, error: `Error validating license key: ${error.message}` };
    }
    
    if (!data) {
      console.log('License key not found:', licenseKey);
      return { success: false, error: 'Invalid license key' };
    }
    
    console.log("License found:", data);
    
    // Now check if it's already used
    if (data.is_used) {
      console.log('License already used:', licenseKey);
      return { success: false, error: 'License key already used' };
    }
    
    // Check if it's assigned to the user or not assigned to anyone
    if (data.user_id && data.user_id !== userId) {
      console.log('License belongs to another user:', data.user_id);
      return { success: false, error: 'License key belongs to another user' };
    }
    
    console.log("License validation successful:", data);
    return { success: true, data: data };
  } catch (err) {
    console.error('Error in validateLicense:', err);
    if (err.name === 'AbortError') {
      return { success: false, error: 'Request timed out - Supabase API might be unavailable' };
    }
    return { success: false, error: err.message || 'Unknown error validating license' };
  }
};

/**
 * Updates a license to mark it as used
 * @param {string} licenseId - The ID of the license to update
 * @returns {Promise<{success: boolean, error: string}>} - Status of the operation
 */
export const markLicenseAsUsed = async (licenseId) => {
  try {
    const { error } = await supabase
      .from('licenses')
      .update({ is_used: true })
      .eq('id', licenseId);
    
    if (error) {
      console.error('Error marking license as used:', error);
      return { success: false, error: 'Error updating license status' };
    }
    
    return { success: true };
  } catch (err) {
    console.error('Error in markLicenseAsUsed:', err);
    return { success: false, error: err.message || 'Unknown error updating license' };
  }
};

const licenseService = {
  generateLicense,
  canUserCreateProject,
  validateLicense,
  markLicenseAsUsed,
};

export default licenseService;