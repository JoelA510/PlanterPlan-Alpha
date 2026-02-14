export const TEST_USERS = {
    OWNER: {
        email: process.env.E2E_OWNER_EMAIL || 'planterplan.test@gmail.com',
        password: process.env.E2E_OWNER_PASSWORD || 'roots99',
        role: 'owner',
    },
    EDITOR: {
        email: process.env.E2E_EDITOR_EMAIL || 'tim.planterplan@gmail.com',
        password: process.env.E2E_EDITOR_PASSWORD || 'roots99(E',
        role: 'editor',
    },
    VIEWER: {
        email: process.env.E2E_VIEWER_EMAIL || 'planterplan.role_tester@mail.com',
        password: process.env.E2E_VIEWER_PASSWORD || 'roots99_role',
        role: 'viewer',
    },
};
