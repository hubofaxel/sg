import { describe, expect, it } from 'vitest';
import { getSafeAreaInsets, toWorldInsets, ZERO_INSETS } from './SafeAreaInsets';

describe('ZERO_INSETS', () => {
	it('has all zero values', () => {
		expect(ZERO_INSETS).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
	});
});

describe('getSafeAreaInsets', () => {
	it('returns zero insets in test environment (no real cutouts)', () => {
		const insets = getSafeAreaInsets();
		expect(insets.top).toBe(0);
		expect(insets.right).toBe(0);
		expect(insets.bottom).toBe(0);
		expect(insets.left).toBe(0);
	});
});

describe('toWorldInsets', () => {
	it('returns zero when screen insets are zero', () => {
		const result = toWorldInsets(ZERO_INSETS, 1340, 600, 960, 432);
		expect(result).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
	});

	it('scales screen-pixel insets to world coordinates', () => {
		// Game: 1340×600, Display: 960×432
		// scaleX = 1340/960 ≈ 1.396, scaleY = 600/432 ≈ 1.389
		const insets = { top: 0, right: 0, bottom: 36, left: 67 };
		const result = toWorldInsets(insets, 1340, 600, 960, 432);

		// left: 67 * (1340/960) ≈ 93.5
		expect(result.left).toBeCloseTo(93.5, 0);
		// bottom: 36 * (600/432) = 50
		expect(result.bottom).toBe(50);
		expect(result.top).toBe(0);
		expect(result.right).toBe(0);
	});

	it('scales symmetric insets proportionally', () => {
		const insets = { top: 47, right: 47, bottom: 47, left: 47 };
		const result = toWorldInsets(insets, 800, 600, 800, 600);
		// 1:1 scaling — world coords equal screen pixels
		expect(result.top).toBe(47);
		expect(result.right).toBe(47);
		expect(result.bottom).toBe(47);
		expect(result.left).toBe(47);
	});

	it('handles iPhone-style top notch insets', () => {
		// iPhone 13: top=47, left=0, right=0, bottom=34
		// Game: 1333×600, Display: 844×390
		const insets = { top: 47, right: 0, bottom: 34, left: 0 };
		const result = toWorldInsets(insets, 1333, 600, 844, 390);

		// top: 47 * (600/390) ≈ 72.3
		expect(result.top).toBeCloseTo(72.3, 0);
		// bottom: 34 * (600/390) ≈ 52.3
		expect(result.bottom).toBeCloseTo(52.3, 0);
		expect(result.left).toBe(0);
		expect(result.right).toBe(0);
	});
});
