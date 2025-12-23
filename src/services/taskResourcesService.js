import { supabase } from '../supabaseClient';

/**
 * @typedef {Object} TaskResource
 * @property {string} id
 * @property {string} task_id
 * @property {'url' | 'text' | 'pdf'} type
 * @property {string} [url]
 * @property {string} [text_content]
 * @property {string} [storage_path]
 * @property {string} [name]
 * @property {string} created_at
 */

/**
 * List all resources for a task.
 * @param {string} taskId
 * @returns {Promise<TaskResource[]>}
 */
export const listTaskResources = async (taskId) => {
  const { data, error } = await supabase
    .from('task_resources')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
};

/**
 * Create a new resource for a task.
 * @param {string} taskId
 * @param {Object} payload
 * @param {'url' | 'text' | 'pdf'} payload.type
 * @param {string} [payload.url]
 * @param {string} [payload.text_content]
 * @param {string} [payload.storage_path]
 * @param {string} [payload.name]
 * @returns {Promise<TaskResource>}
 */
export const createTaskResource = async (taskId, { type, url, text_content, storage_path }) => {
  // Basic validation
  if (!type) throw new Error('Resource type is required');
  if (type === 'url' && !url) throw new Error('URL is required for url type');
  if (type === 'text' && !text_content) throw new Error('Content is required for text type');
  if (type === 'pdf' && !storage_path) throw new Error('Storage path is required for pdf type');

  const { data, error } = await supabase
    .from('task_resources')
    .insert({
      task_id: taskId,
      resource_type: type,
      resource_url: type === 'url' ? url : null,
      resource_text: type === 'text' ? text_content : null,
      storage_path: type === 'pdf' ? storage_path : null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Delete a resource.
 * @param {string} resourceId
 */
export const deleteTaskResource = async (resourceId) => {
  const { error } = await supabase.from('task_resources').delete().eq('id', resourceId);

  if (error) throw error;
};

/**
 * Set the primary resource for a task.
 * @param {string} taskId
 * @param {string} resourceId - Pass NULL to clear primary resource
 */
export const setPrimaryResource = async (taskId, resourceId) => {
  const { error } = await supabase
    .from('tasks')
    .update({ primary_resource_id: resourceId })
    .eq('id', taskId);

  if (error) throw error;
};
