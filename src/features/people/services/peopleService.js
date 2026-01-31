import { supabase } from '@app/supabaseClient';

export const peopleService = {
    /**
     * Get all people for a project
     * @param {string} projectId 
     * @returns {Promise<Array>} List of people
     */
    async getPeople(projectId) {
        if (!projectId) throw new Error('projectId is required');

        const { data, error } = await supabase
            .from('people')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Add a new person to the project.
     * @param {Object} person - Person object with project_id and name
     * @returns {Promise<Object>} Created person
     */
    async addPerson(person) {
        if (!person || !person.project_id) throw new Error('person with project_id is required');

        const { data, error } = await supabase
            .from('people')
            .insert([person])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update a person's details.
     * @param {string} id 
     * @param {Object} updates 
     */
    async updatePerson(id, updates) {
        const { data, error } = await supabase
            .from('people')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Delete a person.
     * @param {string} id 
     */
    async deletePerson(id) {
        const { error } = await supabase
            .from('people')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }
};
