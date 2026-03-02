import { faker } from '@faker-js/faker';
import type { User, Project, Task } from '@/shared/db/app.types';

/**
 * Creates a mock User object with realistic default data.
 */
export const createMockUser = (overrides: Partial<User> = {}): User => {
    return {
        id: faker.string.uuid(),
        email: faker.internet.email(),
        role: 'owner',
        user_metadata: {
            full_name: faker.person.fullName(),
            avatar_url: faker.image.avatar(),
        },
        created_at: faker.date.past().toISOString(),
        ...overrides,
    };
};

/**
 * Creates a mock Project object.
 */
export const createMockProject = (overrides: Partial<Project> = {}): Project => {
    return {
        id: faker.string.uuid(),
        name: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        status: 'active',
        owner_id: faker.string.uuid(),
        root_id: null,
        parent_task_id: null,
        created_at: faker.date.past().toISOString(),
        updated_at: faker.date.recent().toISOString(),
        ...overrides,
    } as Project;
};

/**
 * Creates a mock Task object.
 */
export const createMockTask = (overrides: Partial<Task> = {}): Task => {
    return {
        id: faker.string.uuid(),
        name: faker.hacker.verb() + ' ' + faker.hacker.noun(),
        description: faker.hacker.phrase(),
        status: 'todo',
        parent_task_id: null,
        root_id: faker.string.uuid(),
        owner_id: faker.string.uuid(),
        position: faker.number.int({ min: 0, max: 1000 }),
        created_at: faker.date.past().toISOString(),
        updated_at: faker.date.recent().toISOString(),
        launch_date: faker.date.future().toISOString(),
        ...overrides,
    } as Task;
};
