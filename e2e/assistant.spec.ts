import { expect, test } from '@playwright/test';

test('interprets a trip on the assistant page in demo mode', async ({ page }) => {
  await page.goto('/assistant');

  await page.getByRole('button', { name: 'Interpret request' }).click();

  // The demo backend returns a rule-based extraction (never an LLM).
  await expect(page.getByText('Rule-based extraction')).toBeVisible();
  await expect(page.getByText(/"origin"/)).toBeVisible();
});
