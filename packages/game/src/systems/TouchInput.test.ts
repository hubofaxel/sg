import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Phaser at the module level — TouchInput uses type imports only
vi.mock('phaser', () => ({}));

// Must import after vi.mock
const { TouchInput } = await import('./TouchInput');

// ---------------------------------------------------------------------------
// Minimal mock — simulates canvas with DOM pointer events
// ---------------------------------------------------------------------------

type Listener = (e: unknown) => void;

function makeMockScene(sceneWidth = 800, sceneHeight = 600) {
	const canvasListeners: Record<string, Listener[]> = {};

	const mockGraphics = {
		setDepth: vi.fn().mockReturnThis(),
		setVisible: vi.fn().mockReturnThis(),
		setPosition: vi.fn().mockReturnThis(),
		clear: vi.fn().mockReturnThis(),
		lineStyle: vi.fn().mockReturnThis(),
		strokeCircle: vi.fn().mockReturnThis(),
		fillStyle: vi.fn().mockReturnThis(),
		fillCircle: vi.fn().mockReturnThis(),
		destroy: vi.fn(),
	};

	const canvas = {
		addEventListener: vi.fn((event: string, fn: Listener) => {
			if (!canvasListeners[event]) canvasListeners[event] = [];
			canvasListeners[event].push(fn);
		}),
		removeEventListener: vi.fn(),
		// Canvas fills the viewport 1:1 (no CSS scaling in tests)
		getBoundingClientRect: vi.fn(() => ({
			left: 0,
			top: 0,
			width: sceneWidth,
			height: sceneHeight,
		})),
	};

	return {
		input: {
			on: vi.fn(),
			off: vi.fn(),
		},
		add: {
			graphics: vi.fn(() => ({ ...mockGraphics })),
		},
		scale: { width: sceneWidth, height: sceneHeight },
		game: { canvas },
		emitCanvas(event: string, e: unknown) {
			for (const fn of canvasListeners[event] ?? []) fn(e);
		},
	};
}

/** Create a DOM PointerEvent-like object */
function pointerEvent(pointerId: number, clientX: number, clientY: number) {
	return { pointerId, clientX, clientY };
}

describe('TouchInput', () => {
	let adapter: InstanceType<typeof TouchInput>;
	let mock: ReturnType<typeof makeMockScene>;

	beforeEach(() => {
		adapter = new TouchInput();
		mock = makeMockScene(800, 600);
		// biome-ignore lint/suspicious/noExplicitAny: Phaser scene mock
		adapter.create(mock as any);
	});

	it('returns zero moveVector with no active pointer', () => {
		const intent = adapter.update();
		expect(intent.moveVector.x).toBe(0);
		expect(intent.moveVector.y).toBe(0);
	});

	it('ignores pointerdown on right half of screen', () => {
		mock.emitCanvas('pointerdown', pointerEvent(1, 500, 300)); // x > width/2
		const intent = adapter.update();
		expect(intent.moveVector.x).toBe(0);
		expect(intent.moveVector.y).toBe(0);
	});

	it('activates joystick on left-half pointerdown', () => {
		mock.emitCanvas('pointerdown', pointerEvent(1, 200, 300));
		// Move to the right, beyond dead zone
		mock.emitCanvas('pointermove', pointerEvent(1, 260, 300));
		const intent = adapter.update();
		expect(intent.moveVector.x).toBe(1);
		expect(intent.moveVector.y).toBe(0);
	});

	it('dead zone: small movements produce zero vector', () => {
		mock.emitCanvas('pointerdown', pointerEvent(1, 200, 300));
		// Move 5px — within 10px dead zone
		mock.emitCanvas('pointermove', pointerEvent(1, 205, 300));
		const intent = adapter.update();
		expect(intent.moveVector.x).toBe(0);
		expect(intent.moveVector.y).toBe(0);
	});

	it('max radius: movements beyond 60px are clamped to magnitude 1.0', () => {
		mock.emitCanvas('pointerdown', pointerEvent(1, 200, 300));
		// Move 120px right — way beyond max radius of 60
		mock.emitCanvas('pointermove', pointerEvent(1, 320, 300));
		const intent = adapter.update();
		expect(intent.moveVector.x).toBeCloseTo(1, 5);
		expect(intent.moveVector.y).toBeCloseTo(0, 5);
	});

	it('diagonal movement is correctly normalized', () => {
		mock.emitCanvas('pointerdown', pointerEvent(1, 200, 300));
		// Move 60px diagonally (42.4px each axis = beyond dead zone)
		const diag = 60 / Math.SQRT2;
		mock.emitCanvas('pointermove', pointerEvent(1, 200 + diag, 300 + diag));
		const intent = adapter.update();
		const expected = diag / 60; // ~0.707
		expect(intent.moveVector.x).toBeCloseTo(expected, 2);
		expect(intent.moveVector.y).toBeCloseTo(expected, 2);
	});

	it('pointer capture: second finger does not steal joystick', () => {
		mock.emitCanvas('pointerdown', pointerEvent(1, 200, 300));
		mock.emitCanvas('pointermove', pointerEvent(1, 260, 300)); // finger 1 moves right
		mock.emitCanvas('pointerdown', pointerEvent(2, 100, 100)); // finger 2 touches
		mock.emitCanvas('pointermove', pointerEvent(2, 100, 200)); // finger 2 moves
		const intent = adapter.update();
		// Should still track finger 1's position
		expect(intent.moveVector.x).toBe(1);
	});

	it('pointerup releases joystick', () => {
		mock.emitCanvas('pointerdown', pointerEvent(1, 200, 300));
		mock.emitCanvas('pointermove', pointerEvent(1, 260, 300));
		mock.emitCanvas('pointerup', pointerEvent(1, 260, 300));
		const intent = adapter.update();
		expect(intent.moveVector.x).toBe(0);
		expect(intent.moveVector.y).toBe(0);
	});

	it('pointercancel clears touch state', () => {
		mock.emitCanvas('pointerdown', pointerEvent(1, 200, 300));
		mock.emitCanvas('pointermove', pointerEvent(1, 260, 300));
		mock.emitCanvas('pointercancel', pointerEvent(1, 260, 300));
		const intent = adapter.update();
		expect(intent.moveVector.x).toBe(0);
		expect(intent.moveVector.y).toBe(0);
	});

	it('clear() zeros moveVector and releases pointer tracking', () => {
		mock.emitCanvas('pointerdown', pointerEvent(1, 200, 300));
		mock.emitCanvas('pointermove', pointerEvent(1, 260, 300));
		adapter.clear();
		const intent = adapter.update();
		expect(intent.moveVector.x).toBe(0);
		expect(intent.moveVector.y).toBe(0);
	});

	it('fireHeld is always true', () => {
		const intent = adapter.update();
		expect(intent.fireHeld).toBe(true);
	});

	it('secondaryHeld is always false', () => {
		const intent = adapter.update();
		expect(intent.secondaryHeld).toBe(false);
	});

	it('handles CSS-scaled canvas (coords mapped to world)', () => {
		// Canvas is 400 CSS pixels wide but world is 800
		const scaled = makeMockScene(800, 600);
		(scaled.game.canvas.getBoundingClientRect as ReturnType<typeof vi.fn>).mockReturnValue({
			left: 0,
			top: 0,
			width: 400,
			height: 300,
		});
		const a = new TouchInput();
		// biome-ignore lint/suspicious/noExplicitAny: Phaser scene mock
		a.create(scaled as any);

		// Touch at CSS x=100 → world x=200 (left half)
		scaled.emitCanvas('pointerdown', pointerEvent(1, 100, 150));
		// Move to CSS x=130 → world x=260 (60px in world = max radius)
		scaled.emitCanvas('pointermove', pointerEvent(1, 130, 150));
		const intent = a.update();
		expect(intent.moveVector.x).toBe(1);
		expect(intent.moveVector.y).toBe(0);
	});
});
