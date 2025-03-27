// src/services/organizationService.js
import { supabase } from '../supabaseClient';

// In src/services/organizationService.js
export const fetchOrganizationBySlug = async (slug) => {
  console.log('fetchOrganizationBySlug called with slug:', slug);
  
  try {
    const { data, error } = await supabase
      .from('white_label_orgs')
      .select('*')
      .eq('subdomain', slug)
      .single();
    
    console.log('Supabase response:', { data, error });
    
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error fetching organization by slug:', err);
    return { data: null, error: err.message };
  }
};

export const fetchAllOrganizations = async () => {
  try {
    const { data, error } = await supabase
      .from('white_label_orgs')
      .select('*')
      .order('organization_name');
    
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error fetching organizations:', err);
    return { data: null, error: err.message };
  }
};

export const createOrganization = async (orgData) => {
  try {
    const { data, error } = await supabase
      .from('white_label_orgs')
      .insert([orgData])
      .select();
    
    if (error) throw error;
    return { data: data[0], error: null };
  } catch (err) {
    console.error('Error creating organization:', err);
    return { data: null, error: err.message };
  }
};

export const updateOrganization = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('white_label_orgs')
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return { data: data[0], error: null };
  } catch (err) {
    console.error('Error updating organization:', err);
    return { data: null, error: err.message };
  }
};

export const deleteOrganization = async (id) => {
  try {
    const { error } = await supabase
      .from('white_label_orgs')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true, error: null };
  } catch (err) {
    console.error('Error deleting organization:', err);
    return { success: false, error: err.message };
  }
};