import { describe, expect, it } from 'vitest';
import {
	BOSS_LABEL_MIN_PX,
	computeScaleFactor,
	computeTextScaleFactor,
	HUD_TEXT_MIN_PX,
	scaleFontSize,
	scaleMargin,
	TEXT_SCALE_FLOOR,
} from './HudScale';

describe('computeScaleFactor', () => {
	it('returns 1.0 at reference size (800×600)', () => {
		expect(computeScaleFactor(800, 600)).toBeCloseTo(1.0);
	});

	it('returns 1.0 at iPad mini size (1024×683)', () => {
		expect(computeScaleFactor(1024, 683)).toBeCloseTo(1.0, 0);
	});

	it('clamps to floor at iPhone SE (568×320)', () => {
		const raw = Math.min(568 / 800, 320 / 600); // 0.533
		expect(raw).toBeCloseTo(0.533, 2);
		expect(computeScaleFactor(568, 320)).toBe(0.6);
	});

	it('returns 0.65 at iPhone 15 (844×390)', () => {
		expect(computeScaleFactor(844, 390)).toBeCloseTo(0.65, 2);
	});

	it('returns 0.72 at Pixel 8 (960×432)', () => {
		expect(computeScaleFactor(960, 432)).toBeCloseTo(0.72, 2);
	});

	it('returns 1.28 at iPad Air (1366×1024)', () => {
		expect(computeScaleFactor(1366, 1024)).toBeCloseTo(1.28, 0);
	});

	it('clamps to ceiling at very large displays', () => {
		expect(computeScaleFactor(3000, 2000)).toBe(1.5);
	});

	it('clamps to floor at very small displays', () => {
		expect(computeScaleFactor(400, 200)).toBe(0.6);
	});
});

describe('computeTextScaleFactor', () => {
	it('returns 1.0 at reference size (800×600)', () => {
		expect(computeTextScaleFactor(800, 600)).toBeCloseTo(1.0);
	});

	it('floors small phone displays to 1.0', () => {
		expect(computeTextScaleFactor(960, 432)).toBe(TEXT_SCALE_FLOOR);
		expect(computeTextScaleFactor(568, 320)).toBe(TEXT_SCALE_FLOOR);
	});

	it('scales up on larger displays', () => {
		expect(computeTextScaleFactor(1024, 768)).toBeCloseTo(1.28, 2);
	});
});

describe('scaleFontSize', () => {
	it('returns base size at factor 1.0', () => {
		expect(scaleFontSize(16, 1.0)).toBe(16);
	});

	it('scales proportionally without floor', () => {
		expect(scaleFontSize(40, 0.6)).toBeCloseTo(24);
	});

	it('applies HUD text floor at small scale', () => {
		// 16 * 0.6 = 9.6, floor = 10
		expect(scaleFontSize(16, 0.6, HUD_TEXT_MIN_PX)).toBe(HUD_TEXT_MIN_PX);
	});

	it('applies HUD text floor for wave text at small scale', () => {
		// 14 * 0.6 = 8.4, floor = 10
		expect(scaleFontSize(14, 0.6, HUD_TEXT_MIN_PX)).toBe(HUD_TEXT_MIN_PX);
	});

	it('applies boss label floor at small scale', () => {
		// 12 * 0.6 = 7.2, floor = 9
		expect(scaleFontSize(12, 0.6, BOSS_LABEL_MIN_PX)).toBe(BOSS_LABEL_MIN_PX);
	});

	it('does not apply floor when scaled size exceeds it', () => {
		// 16 * 1.0 = 16 > 10
		expect(scaleFontSize(16, 1.0, HUD_TEXT_MIN_PX)).toBe(16);
	});

	it('scales at ceiling factor', () => {
		expect(scaleFontSize(16, 1.5)).toBeCloseTo(24);
	});

	it('returns 0 for zero base size', () => {
		expect(scaleFontSize(0, 1.0)).toBe(0);
	});
});

describe('scaleMargin', () => {
	it('returns base margin at factor 1.0', () => {
		expect(scaleMargin(10, 1.0)).toBe(10);
	});

	it('scales margin proportionally', () => {
		expect(scaleMargin(10, 0.6)).toBeCloseTo(6);
	});

	it('scales margin at ceiling', () => {
		expect(scaleMargin(10, 1.5)).toBeCloseTo(15);
	});
});
