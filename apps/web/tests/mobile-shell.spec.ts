import { expect, test } from '@playwright/test';

test.describe('mobile shell foundation', () => {
	test('all routes render without error', async ({ page }) => {
		for (const route of ['/', '/play', '/settings']) {
			const response = await page.goto(route);
			expect(response?.status()).toBeLessThan(400);
		}
	});

	test('play page uses dynamic viewport units', async ({ page }) => {
		await page.goto('/play');
		const playPage = page.locator('main.play-page');
		await expect(playPage).toBeVisible();
	});

	test('game container has touch-action none', async ({ page }) => {
		await page.goto('/play');
		const container = page.locator('.game-container');
		await expect(container).toBeVisible();
		const touchAction = await container.evaluate((el) => getComputedStyle(el).touchAction);
		expect(touchAction).toBe('none');
	});

	test('rotate overlay exists in DOM when portrait on touch device', async ({ browser }) => {
		const context = await browser.newContext({
			viewport: { width: 375, height: 667 },
			hasTouch: true,
		});
		const page = await context.newPage();
		await page.goto('/play');
		const overlay = page.locator('[role="alert"]');
		await expect(overlay).toBeVisible();
		await expect(overlay).toContainText('Rotate your device');
		await context.close();
	});

	test('rotate overlay hidden in landscape on touch device', async ({ browser }) => {
		const context = await browser.newContext({
			viewport: { width: 667, height: 375 },
			hasTouch: true,
		});
		const page = await context.newPage();
		await page.goto('/play');
		const overlay = page.locator('[role="alert"]');
		await expect(overlay).toHaveCount(0);
		await context.close();
	});

	test('rotate overlay responds to viewport change on touch device', async ({ browser }) => {
		const context = await browser.newContext({
			viewport: { width: 667, height: 375 },
			hasTouch: true,
		});
		const page = await context.newPage();
		await page.goto('/play');
		await expect(page.locator('[role="alert"]')).toHaveCount(0);

		await page.setViewportSize({ width: 375, height: 667 });
		await expect(page.locator('[role="alert"]')).toBeVisible();

		await page.setViewportSize({ width: 667, height: 375 });
		await expect(page.locator('[role="alert"]')).toHaveCount(0);
		await context.close();
	});

	test('rotate overlay does NOT show on desktop in portrait', async ({ page }) => {
		// Default Playwright has no touch — desktop browser
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto('/play');
		const overlay = page.locator('[role="alert"]');
		await expect(overlay).toHaveCount(0);
	});
});
