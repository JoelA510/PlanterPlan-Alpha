import { supabase } from '@app/supabaseClient';

export const budgetService = {
    /**
     * Fetch all budget items for a project
     * @param {string} projectId 
     * @returns {Promise<Array>}
     */
    async getBudgetItems(projectId) {
        const { data, error } = await supabase
            .from('budget_items')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data;
    },

    /**
     * Add a new budget item
     * @param {Object} item 
     * @returns {Promise<Object>}
     */
    async addItem(item) {
        // Validate required fields
        if (!item.project_id || !item.description) {
            throw new Error('Project ID and Description are required');
        }

        const { data, error } = await supabase
            .from('budget_items')
            .insert([item])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update an existing budget item
     * @param {string} id 
     * @param {Object} updates 
     * @returns {Promise<Object>}
     */
    async updateItem(id, updates) {
        const { data, error } = await supabase
            .from('budget_items')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Delete a budget item
     * @param {string} id 
     */
    async deleteItem(id) {
        const { error } = await supabase
            .from('budget_items')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
