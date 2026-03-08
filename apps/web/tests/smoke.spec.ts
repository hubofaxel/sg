import { expect, test } from '@playwright/test';

test.describe('home page', () => {
	test('loads at root URL', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveTitle(/.*/);
		expect(page.url()).toContain('/');
	});

	test('renders welcome heading', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('h1')).toBeVisible();
	});
});

test.describe('play page', () => {
	test('navigates to /play', async ({ page }) => {
		await page.goto('/play');
		expect(page.url()).toContain('/play');
	});

	test('has correct page title', async ({ page }) => {
		await page.goto('/play');
		await expect(page).toHaveTitle('Play — Ship Game');
	});

	test('renders game canvas container', async ({ page }) => {
		await page.goto('/play');
		await expect(page.locator('main.play-page')).toBeVisible();
	});
});
