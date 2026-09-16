import { expect, test } from '@playwright/test';

test('the routes hub lists routes and links to a landing page', async ({ page }) => {
  await page.goto('/flights');
  await expect(page.getByRole('heading', { name: 'Popular flight routes' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Chennai → Dubai/ })).toBeVisible();
});

test('a route landing page renders SEO content and a search CTA', async ({ page }) => {
  await page.goto('/flights/chennai-to-dubai');
  await expect(page.getByRole('heading', { name: 'Flights from Chennai to Dubai', level: 1 })).toBeVisible();

  const cta = page.getByRole('link', { name: /Search MAA .* DXB flights/ });
  await expect(cta).toHaveAttribute('href', '/?from=MAA&to=DXB');

  await expect(page.getByText(/How long is the flight from Chennai to Dubai/)).toBeVisible();
});

test('the landing CTA prefills the search route on the home page', async ({ page }) => {
  await page.goto('/?from=DEL&to=BOM');
  await expect(page.getByRole('combobox', { name: 'From airport' })).toHaveValue(/Delhi/);
  await expect(page.getByRole('combobox', { name: 'To airport' })).toHaveValue(/Mumbai/);
});
