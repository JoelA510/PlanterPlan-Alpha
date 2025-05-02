// src/services/authService.js
import { supabase } from '../supabaseClient';

/**
 * Sign up a new user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @param {Object} userData - Additional user data (firstName, lastName)
 * @param {string} role - User role (defaults to 'planterplan_user')
 * @param {string|null} whitelabelOrgId - Optional white label org ID
 */
export const signUp = async (email, password, userData, role = 'planterplan_user', whitelabelOrgId = null) => {
  try {
    // 1. Create the auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: role,
          white_label_org_id: whitelabelOrgId
        }
      }
    });

    if (authError) throw authError;

    // 2. Create or update entry in users table
    // (This can also be done with a database trigger, but doing it here ensures data consistency)
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          id: authData.user.id,
          email: email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: role,
          white_label_org_id: whitelabelOrgId,
          created_at: new Date().toISOString()
        });

      if (profileError) {
        console.error('Error creating user profile:', profileError);
        // Consider handling this error - maybe delete the auth user?
      }
    }

    return { user: authData.user, session: authData.session };
  } catch (error) {
    console.error('Error during signup:', error);
    return { error };
  }
};

/**
 * Sign in an existing user
 */
export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    return { user: data.user, session: data.session };
  } catch (error) {
    console.error('Error signing in:', error);
    return { error };
  }
};

/**
 * Sign out the current user
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error signing out:', error);
    return { error };
  }
};

/**
 * Get the current session
 */
export const getCurrentSession = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return { session: data.session };
  } catch (error) {
    console.error('Error getting session:', error);
    return { error };
  }
};

/**
 * Get current user with profile data
 */
export const getCurrentUser = async () => {
  console.log("START: getCurrentUser function called"); // Entry point
  try {
    // Get auth user
    console.log("STEP 1: About to call supabase.auth.getUser()");
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log("STEP 2: supabase.auth.getUser() completed", { 
      userExists: !!user, 
      errorExists: !!userError 
    });
    
    if (userError) {
      console.log("ERROR in auth.getUser():", userError);
      throw userError;
    }
    
    if (!user) {
      console.log("No user found, returning { user: null }");
      return { user: null };
    }
    
    console.log("STEP 3: About to query users table for profile data", { userId: user.id });
    // Get profile data from users table
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    console.log("STEP 4: Profile query completed", { 
      profileExists: !!profileData, 
      errorExists: !!profileError,
      errorCode: profileError ? profileError.code : null
    });

    if (profileError && profileError.code !== 'PGRST116') {
      console.log("ERROR in profile query:", profileError);
      throw profileError;
    }
    
    // Combine auth user and profile data
    console.log("STEP 5: Creating combined user object");
    const combinedUser = {
      user: {
        ...user,
        profile: profileData || {}
      }
    };
    console.log("END: getCurrentUser function returning success");
    return combinedUser;
  } catch (error) {
    console.error('ERROR: Exception in getCurrentUser:', error);
    return { error };
  }
};
/**
 * Request password reset email
 */
export const requestPasswordReset = async (email) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error requesting password reset:', error);
    return { error };
  }
};

/**
 * Update user password (used after reset)
 */
export const updatePassword = async (newPassword) => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating password:', error);
    return { error };
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userData) => {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('No user logged in');

    // Update auth metadata
    const { error: metadataError } = await supabase.auth.updateUser({
      data: {
        first_name: userData.firstName,
        last_name: userData.lastName
      }
    });
    
    if (metadataError) throw metadataError;

    // Update users table
    const { data, error: profileError } = await supabase
      .from('users')
      .update({
        first_name: userData.firstName,
        last_name: userData.lastName,
        // Any other fields to update
      })
      .eq('id', user.id);
    
    if (profileError) throw profileError;
    
    return { success: true };
  } catch (error) {
    console.error('Error updating profile:', error);
    return { error };
  }
};