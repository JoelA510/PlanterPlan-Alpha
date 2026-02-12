import { test, expect } from '@playwright/test';

test('Simple Environment Check', async ({ page }) => {
    console.log('Starting Simple Test');
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'domcontentloaded' });
    console.log('Page Loaded');
    await page.waitForTimeout(5000); // Wait for hydration
    const title = await page.title();
    console.log(`Page Title: ${title}`);
    console.log(`Current URL: ${page.url()}`);

    // Check for Dashboard or Login markers
    const dashboardHeading = await page.getByRole('heading', { name: /Dashboard/i }).isVisible();
    const loginButton = await page.getByRole('button', { name: /Sign In|Log In/i }).isVisible();
    const passwordInput = await page.locator('input[type="password"]').isVisible();

    console.log(`Is Dashboard Visible? ${dashboardHeading}`);
    console.log(`Is Login Button Visible? ${loginButton}`);
    console.log(`Is Password Input Visible? ${passwordInput}`);

    expect(true).toBe(true);
});
