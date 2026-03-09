import { expect, test } from '@playwright/test';

test.describe('game overlay', () => {
	test('play page has overlay toolbar in landscape', async ({ page }) => {
		await page.setViewportSize({ width: 667, height: 375 });
		await page.goto('/play');
		const toolbar = page.locator('[role="toolbar"]');
		await expect(toolbar).toBeVisible();
	});

	test('pause button has aria-label and meets 44px touch target', async ({ page }) => {
		await page.setViewportSize({ width: 667, height: 375 });
		await page.goto('/play');
		const pauseBtn = page.locator('button[aria-label="Pause game"]');
		await expect(pauseBtn).toBeVisible();
		const box = await pauseBtn.boundingBox();
		expect(box).not.toBeNull();
		expect(box?.width).toBeGreaterThanOrEqual(44);
		expect(box?.height).toBeGreaterThanOrEqual(44);
	});

	test('mute button has aria-label and meets 44px touch target', async ({ page }) => {
		await page.setViewportSize({ width: 667, height: 375 });
		await page.goto('/play');
		const muteBtn = page.locator('button[aria-label="Mute audio"]');
		await expect(muteBtn).toBeVisible();
		const box = await muteBtn.boundingBox();
		expect(box).not.toBeNull();
		expect(box?.width).toBeGreaterThanOrEqual(44);
		expect(box?.height).toBeGreaterThanOrEqual(44);
	});
});

test.describe('responsive layout', () => {
	test('home page has no horizontal overflow at 320px', async ({ page }) => {
		await page.setViewportSize({ width: 320, height: 568 });
		await page.goto('/');
		const hasOverflow = await page.evaluate(
			() => document.documentElement.scrollWidth > document.documentElement.clientWidth,
		);
		expect(hasOverflow).toBe(false);
	});

	test('settings page has no horizontal overflow at 320px', async ({ page }) => {
		await page.setViewportSize({ width: 320, height: 568 });
		await page.goto('/settings');
		const hasOverflow = await page.evaluate(
			() => document.documentElement.scrollWidth > document.documentElement.clientWidth,
		);
		expect(hasOverflow).toBe(false);
	});

	test('home nav buttons meet 44px min-height', async ({ page }) => {
		await page.setViewportSize({ width: 320, height: 568 });
		await page.goto('/');
		const playBtn = page.locator('a[href="/play"]');
		await expect(playBtn).toBeVisible();
		const box = await playBtn.boundingBox();
		expect(box).not.toBeNull();
		expect(box?.height).toBeGreaterThanOrEqual(44);
	});
});

test.describe('overlay and rotate overlay interaction', () => {
	test('portrait shows rotate overlay, landscape shows game overlay (touch device)', async ({
		browser,
	}) => {
		const context = await browser.newContext({
			viewport: { width: 667, height: 375 },
			hasTouch: true,
		});
		const page = await context.newPage();

		// Start in landscape — game overlay visible, rotate overlay absent
		await page.goto('/play');
		await expect(page.locator('[role="toolbar"]')).toBeVisible();
		await expect(page.locator('[role="alert"]')).toHaveCount(0);

		// Switch to portrait — rotate overlay appears
		await page.setViewportSize({ width: 375, height: 667 });
		await expect(page.locator('[role="alert"]')).toBeVisible();

		// Switch back to landscape — rotate overlay gone, game overlay still present
		await page.setViewportSize({ width: 667, height: 375 });
		await expect(page.locator('[role="alert"]')).toHaveCount(0);
		await expect(page.locator('[role="toolbar"]')).toBeVisible();
		await context.close();
	});
});
