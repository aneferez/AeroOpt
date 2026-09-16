import { expect, test } from '@playwright/test';

test('signs in to the demo account and loads the dashboard', async ({ page }) => {
  await page.goto('/sign-in');

  await page.getByLabel('Email').fill('ada.lovelace@example.com');
  await page.getByLabel('Password').fill('demo-password-123');
  await page.locator('form').getByRole('button', { name: 'Sign in' }).click();

  // A successful demo sign-in swaps the header action to "Sign out".
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();

  // The cookie session survives a full navigation, so the dashboard loads.
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: /Good to see you/i })).toBeVisible();
  await expect(page.getByText('Saved flights')).toBeVisible();
});
