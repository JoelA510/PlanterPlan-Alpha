// src/services/taskCloneService.js
// Clone operations: deep clone tasks and subtrees via RPC
import { supabase } from '../supabaseClient';

/**
 * Deep clone a task and all its descendants using the clone_project_template RPC.
 *
 * This function calls an atomic database RPC that:
 * 1. Clones the entire task subtree (all descendants)
 * 2. Clones all associated task_resources
 * 3. Remaps parent_task_id and root_id for the new tree
 * 4. Applies optional overrides to the root task (title, description, dates)
 *
 * @param {string} templateId - The ID of the task to clone (becomes root of new subtree)
 * @param {string|null} newParentId - Parent ID for the cloned root (null for top-level)
 * @param {string} newOrigin - Origin for cloned tasks ('instance' or 'template')
 * @param {string} userId - User ID to set as creator for cloned tasks
 * @param {Object} overrides - Optional overrides for the cloned root task
 * @param {string} overrides.title - Override title
 * @param {string} overrides.description - Override description
 * @param {string} overrides.start_date - Override start date (ISO string)
 * @param {string} overrides.due_date - Override due date (ISO string)
 * @param {Object} client - Supabase client instance
 * @returns {Object} RPC result containing new_root_id, tasks_count, resources_count
 */
export const deepCloneTask = async (
  templateId,
  newParentId,
  newOrigin,
  userId,
  overrides = {},
  client = supabase
) => {
  try {
    const { data, error } = await client.rpc('clone_project_template', {
      p_template_id: templateId,
      p_new_parent_id: newParentId,
      p_new_origin: newOrigin,
      p_user_id: userId,
      p_title: overrides.title ?? null,
      p_description: overrides.description ?? null,
      p_start_date: overrides.start_date ?? null,
      p_due_date: overrides.due_date ?? null,
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('[taskCloneService.deepCloneTask] RPC Error:', error);
    throw error;
  }
};
