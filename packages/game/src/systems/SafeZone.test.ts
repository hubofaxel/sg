import { describe, expect, it } from 'vitest';
import {
	computeWorldSize,
	createSafeZone,
	MAX_WORLD_WIDTH,
	MIN_WORLD_WIDTH,
	SAFE_ZONE_HEIGHT,
	SAFE_ZONE_WIDTH,
	WORLD_HEIGHT,
} from './SafeZone';

describe('computeWorldSize', () => {
	it('returns 800 at 4:3 (min width)', () => {
		const { width, height } = computeWorldSize(1024, 768);
		expect(width).toBe(800);
		expect(height).toBe(WORLD_HEIGHT);
	});

	it('returns 1067 at 16:9', () => {
		const { width, height } = computeWorldSize(1920, 1080);
		expect(width).toBe(1067);
		expect(height).toBe(WORLD_HEIGHT);
	});

	it('clamps to 1200 at ultra-wide 20:9', () => {
		const { width } = computeWorldSize(960, 432);
		// 600 * (960/432) = 1333, clamped to 1200
		expect(width).toBe(MAX_WORLD_WIDTH);
	});

	it('returns 800 at 1:1 (square)', () => {
		const { width } = computeWorldSize(500, 500);
		// 600 * 1 = 600, clamped to min 800
		expect(width).toBe(MIN_WORLD_WIDTH);
	});

	it('returns 800 for tall portrait aspect', () => {
		const { width } = computeWorldSize(375, 667);
		// 600 * (375/667) = 337, clamped to 800
		expect(width).toBe(MIN_WORLD_WIDTH);
	});

	it('returns exact value for 16:10', () => {
		const { width } = computeWorldSize(1280, 800);
		// 600 * (1280/800) = 960
		expect(width).toBe(960);
	});

	it('respects custom min/max overrides', () => {
		const { width } = computeWorldSize(1920, 1080, 900, 1100);
		// 600 * (1920/1080) = 1067, clamped to 1100
		expect(width).toBe(1067);
	});

	it('respects custom max override', () => {
		const { width } = computeWorldSize(960, 432, 800, 1000);
		// 1333 clamped to 1000
		expect(width).toBe(1000);
	});

	it('height is always fixed at 600', () => {
		expect(computeWorldSize(1920, 1080).height).toBe(600);
		expect(computeWorldSize(500, 500).height).toBe(600);
		expect(computeWorldSize(3000, 1000).height).toBe(600);
	});
});

describe('createSafeZone', () => {
	it('returns origin (0,0) at 4:3 (800x600)', () => {
		const sz = createSafeZone(800, 600);
		expect(sz.x).toBe(0);
		expect(sz.y).toBe(0);
		expect(sz.width).toBe(SAFE_ZONE_WIDTH);
		expect(sz.height).toBe(SAFE_ZONE_HEIGHT);
		expect(sz.centerX).toBe(400);
		expect(sz.centerY).toBe(300);
		expect(sz.right).toBe(800);
		expect(sz.bottom).toBe(600);
	});

	it('centers horizontally at 1200x600', () => {
		const sz = createSafeZone(1200, 600);
		expect(sz.x).toBe(200);
		expect(sz.y).toBe(0);
		expect(sz.right).toBe(1000);
		expect(sz.centerX).toBe(600);
	});

	it('centers at 1067x600 (16:9)', () => {
		const sz = createSafeZone(1067, 600);
		expect(sz.x).toBeCloseTo(133.5);
		expect(sz.y).toBe(0);
		expect(sz.width).toBe(800);
		expect(sz.height).toBe(600);
	});

	it('centers at 960x600 (16:10)', () => {
		const sz = createSafeZone(960, 600);
		expect(sz.x).toBe(80);
		expect(sz.centerX).toBe(480);
		expect(sz.right).toBe(880);
	});

	it('safe zone dimensions are always 800x600', () => {
		for (const w of [800, 960, 1067, 1200]) {
			const sz = createSafeZone(w, 600);
			expect(sz.width).toBe(800);
			expect(sz.height).toBe(600);
		}
	});
});
