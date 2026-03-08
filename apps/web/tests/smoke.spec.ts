import { expect, test } from '@playwright/test';

test.describe('home page', () => {
	test('loads at root URL', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveTitle(/.*/);
		expect(page.url()).toContain('/');
	});

	test('renders SHIP GAME heading', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('h1')).toHaveText('SHIP GAME');
	});

	test('has navigation links', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('a[href="/play"]')).toBeVisible();
		await expect(page.locator('a[href="/settings"]')).toBeVisible();
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

test.describe('settings page', () => {
	test('navigates to /settings', async ({ page }) => {
		await page.goto('/settings');
		await expect(page.locator('h1')).toHaveText('SETTINGS');
	});

	test('has volume controls', async ({ page }) => {
		await page.goto('/settings');
		await expect(page.locator('input[type="range"]').first()).toBeVisible();
	});
});
