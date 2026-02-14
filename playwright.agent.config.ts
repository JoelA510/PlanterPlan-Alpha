import { defineConfig, devices } from '@playwright/test';
import config from './playwright.config';

// Extend the base config but force the JSON reporter
export default defineConfig({
    ...config,
    reporter: [
        ['json', { outputFile: 'agent-results.json' }],
        ['list'] // Keep list for local debugging if needed
    ],
});
