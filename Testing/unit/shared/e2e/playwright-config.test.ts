import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const playwrightConfig = readFileSync('Testing/e2e/playwright.config.ts', 'utf8');
const loginPageObject = readFileSync('Testing/e2e/pages/LoginPage.ts', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };

describe('Playwright E2E config', () => {
 it('uses cross-platform webServer env configuration', () => {
  expect(playwrightConfig).toContain("command: 'npm run dev'");
  expect(playwrightConfig).toContain('env:');
  expect(playwrightConfig).toContain('createRequire(import.meta.url)');
  expect(playwrightConfig).toContain("require('../../scripts/e2e-env.cjs')");
  expect(playwrightConfig).toContain('const e2eEnv = resolveE2EEnv();');
  expect(playwrightConfig).toContain('...e2eEnv');
  expect(playwrightConfig).not.toContain('VITE_E2E_MODE=true npm run dev');
 });

 it('uses feature and step globs relative to the E2E config directory', () => {
  expect(playwrightConfig).toContain("features: 'features/**/*.feature'");
  expect(playwrightConfig).toContain("steps: 'steps/**/*.steps.ts'");
  expect(playwrightConfig).not.toContain("missingSteps: 'skip-scenario'");
  expect(playwrightConfig).not.toContain("features: 'Testing/e2e/features/**/*.feature'");
  expect(playwrightConfig).not.toContain("steps: 'Testing/e2e/steps/**/*.steps.ts'");
 });

 it('does not use POSIX inline environment assignment in package scripts', () => {
  expect(packageJson.scripts['test:e2e:vision']).not.toMatch(/GEMINI_API_KEY=\$\{GEMINI_API_KEY\}/);
 });

 it('routes E2E package scripts through the cross-platform runner', () => {
  expect(packageJson.scripts['test:e2e']).toBe('node scripts/run-e2e.cjs');
  expect(packageJson.scripts['test:e2e:mobile']).toBe('node scripts/run-e2e.cjs --project=mobile-chrome');
  expect(packageJson.scripts['test:e2e:headed']).toBe('node scripts/run-e2e.cjs --headed');
  expect(packageJson.scripts['test:e2e:a11y']).toBe('node scripts/run-e2e.cjs --project=accessibility');
  expect(packageJson.scripts['test:e2e:vision']).toBe('node scripts/run-e2e.cjs --grep @vision');
 });

 it('keeps the login page object scoped to the form submit button', () => {
  expect(loginPageObject).toContain("this.submitButton = page.locator('form button[type=\"submit\"]');");
  expect(loginPageObject).not.toContain("this.submitButton = page.getByRole('button', { name: /sign in|sign up|log in/i });");
 });
});
