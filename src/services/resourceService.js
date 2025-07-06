// src/services/resourceService.js
import { supabase } from '../supabaseClient';

/**
 * Fetch all resources with optional filtering
 * @param {string} organizationId - Organization ID to filter resources by
 * @param {string} userId - User ID to filter resources by (optional)
 * @param {boolean} publishedOnly - Whether to only fetch published resources
 * @returns {Promise<{data: Array, error: string}>} - The fetched resource data or error
 */
export const fetchAllResources = async (organizationId = null, userId = null, publishedOnly = true) => {
  try {
    // Start building the query
    let query = supabase
      .from('resources')
      .select(`
        *,
        created_by_user:users!created_by(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .order('created_at', { ascending: false });
    
    // Add filters if provided
    if (organizationId) {
      query = query.eq('white_label_id', organizationId);
    } else {
      // If no org specified, get resources with null white_label_id (global resources)
      query = query.is('white_label_id', null);
    }
    
    if (userId) {
      query = query.eq('created_by', userId);
    }
    
    if (publishedOnly) {
      query = query.eq('is_published', true);
    }
    
    // Execute the query
    const { data, error } = await query;
    
    if (error) {
      console.error('Supabase error:', error);
      return { error: error.message || 'Failed to fetch resources from Supabase' };
    }
    
    console.log(`Fetched ${data?.length || 0} resources`);
    return { data };
  } catch (err) {
    console.error('Error fetching resources:', err);
    return { error: err.message || 'Unknown error occurred while fetching resources' };
  }
};

/**
 * Create a new resource in Supabase
 * @param {Object} resourceData - The resource data to create
 * @returns {Promise<{data: Object, error: string}>} - The created resource data or error
 */
export const createResource = async (resourceData) => {
  try {
    console.log('Creating resource with data:', JSON.stringify(resourceData, null, 2));
    
    // Ensure required fields are present
    const requiredFields = ['title', 'format', 'created_by'];
    const missingFields = requiredFields.filter(field => !resourceData[field]);
    
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      return { error: `Missing required fields: ${missingFields.join(', ')}` };
    }
    
    // Normalize the resourceData
    const normalizedData = {
      ...resourceData,
      tags: Array.isArray(resourceData.tags) ? resourceData.tags : [],
      is_published: resourceData.is_published !== undefined ? resourceData.is_published : true,
    };
    
    // Insert the resource data into the 'resources' table
    const { data, error } = await supabase
      .from('resources')
      .insert([normalizedData])
      .select(`
        *,
        created_by_user:users!created_by(
          id,
          first_name,
          last_name,
          email
        )
      `);
    
    if (error) {
      console.error('Supabase error:', error);
      return { error: error.message || 'Failed to create resource in Supabase' };
    }
    
    console.log('Successfully created resource:', data);
    return { data: data[0] };
  } catch (err) {
    console.error('Error creating resource:', err);
    return { error: err.message || 'Unknown error occurred' };
  }
};

/**
 * Update an existing resource
 * @param {string} resourceId - The ID of the resource to update
 * @param {Object} resourceData - Object containing fields to update
 * @returns {Promise<{success: boolean, error: string|null, data: Object}>} Result of the update
 */
export const updateResource = async (resourceId, resourceData) => {
  try {
    console.log('Updating resource:', { resourceId, resourceData });
    
    if (!resourceId) {
      return { success: false, error: 'Resource ID is required' };
    }
    
    // Extract only the updatable fields
    const updatableFields = [
      'title', 
      'format',
      'url',
      'description', 
      'usage_rights',
      'tags',
      'is_published'
    ];
    
    // Create an object with only the fields we want to update
    const updateData = {};
    
    updatableFields.forEach(field => {
      if (field in resourceData) {
        updateData[field] = resourceData[field];
      }
    });
    
    // Add a modified timestamp
    updateData.updated_at = new Date().toISOString();
    
    // Only proceed if we have data to update
    if (Object.keys(updateData).length === 1) { // Only updated_at
      return { success: true, message: 'No fields to update' };
    }
    
    // Update the resource in Supabase
    const { data, error } = await supabase
      .from('resources')
      .update(updateData)
      .eq('id', resourceId)
      .select(`
        *,
        created_by_user:users!created_by(
          id,
          first_name,
          last_name,
          email
        )
      `);
    
    if (error) {
      console.error('Supabase error updating resource:', error);
      return { success: false, error: error.message };
    }
    
    console.log('Resource updated successfully:', data);
    return { success: true, data: data[0] };
  } catch (err) {
    console.error('Error updating resource:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Delete a resource from Supabase
 * @param {string} resourceId - The ID of the resource to delete
 * @returns {Promise<{success: boolean, error: string}>} - The result
 */
export const deleteResource = async (resourceId) => {
  try {
    console.log('Deleting resource with ID:', resourceId);
    
    if (!resourceId) {
      return { success: false, error: 'Resource ID is required' };
    }
    
    const { error } = await supabase
      .from('resources')
      .delete()
      .eq('id', resourceId);
    
    if (error) {
      console.error('Supabase error:', error);
      return { success: false, error: error.message || 'Failed to delete resource in Supabase' };
    }
    
    console.log('Resource deleted successfully');
    return { success: true };
  } catch (err) {
    console.error('Error deleting resource:', err);
    return { success: false, error: err.message || 'Unknown error occurred' };
  }
};

/**
 * Search resources by text query
 * @param {string} searchQuery - The search query
 * @param {string} organizationId - Organization ID to filter by
 * @param {Array} tags - Array of tags to filter by
 * @param {string} format - Resource format to filter by
 * @returns {Promise<{data: Array, error: string}>} - Search results
 */
export const searchResources = async (searchQuery = '', organizationId = null, tags = [], format = null) => {
  try {
    console.log('Searching resources:', { searchQuery, organizationId, tags, format });
    
    let query = supabase
      .from('resources')
      .select(`
        *,
        created_by_user:users!created_by(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false });
    
    // Organization filter
    if (organizationId) {
      query = query.eq('white_label_id', organizationId);
    } else {
      query = query.is('white_label_id', null);
    }
    
    // Format filter
    if (format) {
      query = query.eq('format', format);
    }
    
    // Tags filter (if any tags specified)
    if (tags && tags.length > 0) {
      query = query.overlaps('tags', tags);
    }
    
    // Text search filter (if search query provided)
    if (searchQuery && searchQuery.trim()) {
      // Use Postgres full-text search or ilike for partial matches
      query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Supabase error searching resources:', error);
      return { error: error.message || 'Failed to search resources' };
    }
    
    console.log(`Found ${data?.length || 0} resources matching search criteria`);
    return { data };
  } catch (err) {
    console.error('Error searching resources:', err);
    return { error: err.message || 'Unknown error occurred during search' };
  }
};

/**
 * Get a single resource by ID
 * @param {string} resourceId - The ID of the resource to fetch
 * @returns {Promise<{data: Object, error: string}>} - The resource data or error
 */
export const getResourceById = async (resourceId) => {
  try {
    if (!resourceId) {
      return { error: 'Resource ID is required' };
    }
    
    const { data, error } = await supabase
      .from('resources')
      .select(`
        *,
        created_by_user:users!created_by(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', resourceId)
      .single();
    
    if (error) {
      console.error('Supabase error fetching resource:', error);
      return { error: error.message || 'Failed to fetch resource' };
    }
    
    return { data };
  } catch (err) {
    console.error('Error fetching resource by ID:', err);
    return { error: err.message || 'Unknown error occurred' };
  }
};

/**
 * Get all unique tags from resources
 * @param {string} organizationId - Organization ID to filter by
 * @returns {Promise<{data: Array, error: string}>} - Array of unique tags
 */
export const getResourceTags = async (organizationId = null) => {
  try {
    let query = supabase
      .from('resources')
      .select('tags')
      .eq('is_published', true);
    
    if (organizationId) {
      query = query.eq('white_label_id', organizationId);
    } else {
      query = query.is('white_label_id', null);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Supabase error fetching tags:', error);
      return { error: error.message || 'Failed to fetch tags' };
    }
    
    // Extract and deduplicate all tags
    const allTags = data
      .map(resource => resource.tags || [])
      .flat()
      .filter(tag => tag && tag.trim())
      .map(tag => tag.trim());
    
    const uniqueTags = [...new Set(allTags)].sort();
    
    return { data: uniqueTags };
  } catch (err) {
    console.error('Error fetching resource tags:', err);
    return { error: err.message || 'Unknown error occurred' };
  }
};

/**
 * Resource format constants
 */
export const RESOURCE_FORMATS = {
  PDF: 'pdf',
  HYPERLINK: 'hyperlink',
  POWERPOINT: 'powerpoint',
  MICROSOFT_DOC: 'microsoft_doc'
};

/**
 * Resource format display names
 */
export const RESOURCE_FORMAT_LABELS = {
  [RESOURCE_FORMATS.PDF]: 'PDF Document',
  [RESOURCE_FORMATS.HYPERLINK]: 'Web Link',
  [RESOURCE_FORMATS.POWERPOINT]: 'PowerPoint Presentation',
  [RESOURCE_FORMATS.MICROSOFT_DOC]: 'Microsoft Document'
};

/**
 * Validate resource data
 * @param {Object} resourceData - Resource data to validate
 * @returns {Object} - Validation result with errors array
 */
export const validateResourceData = (resourceData) => {
  const errors = [];
  
  if (!resourceData.title || !resourceData.title.trim()) {
    errors.push('Title is required');
  }
  
  if (!resourceData.format) {
    errors.push('Format is required');
  } else if (!Object.values(RESOURCE_FORMATS).includes(resourceData.format)) {
    errors.push('Invalid format');
  }
  
  if (resourceData.format === RESOURCE_FORMATS.HYPERLINK && !resourceData.url) {
    errors.push('URL is required for hyperlink resources');
  }
  
  if (resourceData.url && !isValidUrl(resourceData.url)) {
    errors.push('Invalid URL format');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Helper function to validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} - Whether URL is valid
 */
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};