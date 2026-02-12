import { test, expect } from '@playwright/test';

test('basic test', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000');
    const title = await page.title();
    console.log('Page title:', title);
    expect(title).toBeDefined();
});
