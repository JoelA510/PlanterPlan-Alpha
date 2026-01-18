import { supabase } from '@app/supabaseClient';

export const assetService = {
    /**
     * Fetch assets for a project
     * @param {string} projectId 
     * @returns {Promise<Array>}
     */
    async getAssets(projectId) {
        const { data, error } = await supabase
            .from('assets')
            .select('*')
            .eq('project_id', projectId)
            .order('name');

        if (error) throw error;
        return data;
    },

    /**
     * Add a new asset
     * @param {Object} asset 
     */
    async addAsset(asset) {
        const { data, error } = await supabase
            .from('assets')
            .insert([asset])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update an asset
     * @param {string} id 
     * @param {Object} updates 
     */
    async updateAsset(id, updates) {
        const { data, error } = await supabase
            .from('assets')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Delete an asset
     * @param {string} id 
     */
    async deleteAsset(id) {
        const { error } = await supabase
            .from('assets')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
