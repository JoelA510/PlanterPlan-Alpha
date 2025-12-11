# Local Development Guide

## Prerequisites
- Node.js (v18+)
- npm (v9+)
- Supabase CLI (optional, for local DB)

## Setup
1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up environment variables:
    - Copy `.env.example` to `.env` (if available) or ask the team for the `.env` file.
    - Required variables:
        - `REACT_APP_SUPABASE_URL`
        - `REACT_APP_SUPABASE_ANON_KEY`

## Running the App
```bash
npm start
```
Runs the app in development mode at [http://localhost:3000](http://localhost:3000).

## Linting & Formatting
We use ESLint and Prettier to maintain code quality.
- **Lint**: `npm run lint` (if script exists) or `npx eslint src`
- **Format**: `npx prettier --write src`

## Testing
We use Jest for unit tests.
- **Run all tests**: `npm test`
- **Watch mode**: `npm test -- --watch`

## Testing Membership Features Locally
To test "Joined Projects" and membership roles locally without a full backend UI for inviting users:

1.  **Create Users**: Use the Supabase Dashboard (or local Studio) Authentication tab to create at least two users (User A and User B).
2.  **Create a Project**: Log in as User A and create a new project.
3.  **Manually Add Membership**:
    - Go to the Supabase Dashboard > Table Editor > `project_members`.
    - Insert a row:
        - `project_id`: The ID of the project User A created.
        - `user_id`: The UUID of User B.
        - `role`: 'editor' or 'viewer'.
4.  **Verify**:
    - Log in as User B.
    - The project should appear in the "Joined Projects" section of the Dashboard.
    - The role badge (e.g., "Editor") should be visible next to the project title.
