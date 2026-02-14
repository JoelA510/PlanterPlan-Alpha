import { faker } from '@faker-js/faker';

/**
 * Creates a mock User object with realistic default data.
 * @param {Object} overrides - Properties to override the default values.
 * @returns {Object} Mock User object.
 */
export const createMockUser = (overrides = {}) => {
    return {
        id: faker.string.uuid(),
        email: faker.internet.email(),
        role: 'owner', // Default to owner for convenience
        user_metadata: {
            full_name: faker.person.fullName(),
            avatar_url: faker.image.avatar(),
        },
        created_at: faker.date.past().toISOString(),
        updated_at: faker.date.recent().toISOString(),
        ...overrides,
    };
};

/**
 * Creates a mock Project object.
 * @param {Object} overrides - Properties to override the default values.
 * @returns {Object} Mock Project object.
 */
export const createMockProject = (overrides = {}) => {
    return {
        id: faker.string.uuid(),
        title: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        status: 'active',
        owner_id: faker.string.uuid(),
        root_task_id: faker.string.uuid(), // Often projects have a root task
        created_at: faker.date.past().toISOString(),
        updated_at: faker.date.recent().toISOString(),
        ...overrides,
    };
};

/**
 * Creates a mock Task object.
 * @param {Object} overrides - Properties to override the default values.
 * @returns {Object} Mock Task object.
 */
export const createMockTask = (overrides = {}) => {
    return {
        id: faker.string.uuid(),
        title: faker.hacker.verb() + ' ' + faker.hacker.noun(),
        description: faker.hacker.phrase(),
        status: 'todo',
        parent_task_id: null,
        root_id: null, // If null, it's a root or standalone
        project_id: faker.string.uuid(),
        owner_id: faker.string.uuid(),
        position: faker.number.int({ min: 0, max: 1000 }),
        created_at: faker.date.past().toISOString(),
        updated_at: faker.date.recent().toISOString(),
        due_date: faker.date.future().toISOString(),
        assigned_to: null,
        ...overrides,
    };
};
