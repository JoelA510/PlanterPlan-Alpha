import { supabase } from '@/shared/db/client';

export const peopleService = {
    /**
     * Get all people for a project
     * @param {string} projectId 
     * @returns {Promise<object[]>} List of people
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
     * @returns {Promise<object>} Created person
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
     * @param {string} id - Person ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<object>} Updated person
     */
    async updatePerson(id, updates) {
        if (!id) throw new Error('id is required');

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
     * @param {string} id - Person ID
     * @returns {Promise<boolean>} True if deleted
     */
    async deletePerson(id) {
        if (!id) throw new Error('id is required');

        const { error } = await supabase
            .from('people')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }
};
