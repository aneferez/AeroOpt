import { expect, test } from '@playwright/test';

test('ranks flights from a natural-language request in demo mode', async ({ page }) => {
  await page.goto('/');

  // The natural-language box parses the trip and fills the form.
  await page.getByLabel('Describe your ideal trip').fill('Cheap Chennai to Dubai next month, max one stop, evening');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByText(/Review the fields/i)).toBeVisible();

  // Run the search and confirm ranked results render.
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByRole('heading', { name: /Recommended ways to fly/i })).toBeVisible();
  await expect(page.getByText(/options$/i).first()).toBeVisible();
  await expect(page.getByText('Smart Pick').first()).toBeVisible();

  // Meta-search hand-off: each result links out to a partner to complete booking.
  const book = page.getByRole('link', { name: 'Book' }).first();
  await expect(book).toBeVisible();
  await expect(book).toHaveAttribute('href', /skyscanner\.co\.in\/transport\/flights/);
});
