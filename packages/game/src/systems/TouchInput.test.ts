import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Phaser at the module level — TouchInput uses type imports only
vi.mock('phaser', () => ({}));

// Must import after vi.mock
const { TouchInput } = await import('./TouchInput');

// ---------------------------------------------------------------------------
// Minimal Phaser scene mock — only what TouchInput.create() touches
// ---------------------------------------------------------------------------

type Listener = (...args: unknown[]) => void;

function makeMockScene(sceneWidth = 800) {
	const listeners: Record<string, Listener[]> = {};
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

	return {
		input: {
			on: vi.fn((event: string, fn: Listener) => {
				if (!listeners[event]) listeners[event] = [];
				listeners[event].push(fn);
			}),
			off: vi.fn(),
		},
		add: {
			graphics: vi.fn(() => ({ ...mockGraphics })),
		},
		scale: { width: sceneWidth },
		game: {
			canvas: {
				addEventListener: vi.fn((event: string, fn: Listener) => {
					if (!canvasListeners[event]) canvasListeners[event] = [];
					canvasListeners[event].push(fn);
				}),
				removeEventListener: vi.fn(),
			},
		},
		emit(event: string, ...args: unknown[]) {
			for (const fn of listeners[event] ?? []) fn(...args);
		},
		emitCanvas(event: string, ...args: unknown[]) {
			for (const fn of canvasListeners[event] ?? []) fn(...args);
		},
	};
}

function pointer(id: number, x: number, y: number) {
	return { id, x, y };
}

describe('TouchInput', () => {
	let adapter: InstanceType<typeof TouchInput>;
	let mock: ReturnType<typeof makeMockScene>;

	beforeEach(() => {
		adapter = new TouchInput();
		mock = makeMockScene(800);
		// biome-ignore lint/suspicious/noExplicitAny: Phaser scene mock
		adapter.create(mock as any);
	});

	it('returns zero moveVector with no active pointer', () => {
		const intent = adapter.update();
		expect(intent.moveVector.x).toBe(0);
		expect(intent.moveVector.y).toBe(0);
	});

	it('ignores pointerdown on right half of screen', () => {
		mock.emit('pointerdown', pointer(1, 500, 300)); // x > width/2
		const intent = adapter.update();
		expect(intent.moveVector.x).toBe(0);
		expect(intent.moveVector.y).toBe(0);
	});

	it('activates joystick on left-half pointerdown', () => {
		mock.emit('pointerdown', pointer(1, 200, 300));
		// Move to the right, beyond dead zone
		mock.emit('pointermove', pointer(1, 260, 300));
		const intent = adapter.update();
		expect(intent.moveVector.x).toBe(1);
		expect(intent.moveVector.y).toBe(0);
	});

	it('dead zone: small movements produce zero vector', () => {
		mock.emit('pointerdown', pointer(1, 200, 300));
		// Move 5px — within 10px dead zone
		mock.emit('pointermove', pointer(1, 205, 300));
		const intent = adapter.update();
		expect(intent.moveVector.x).toBe(0);
		expect(intent.moveVector.y).toBe(0);
	});

	it('max radius: movements beyond 60px are clamped to magnitude 1.0', () => {
		mock.emit('pointerdown', pointer(1, 200, 300));
		// Move 120px right — way beyond max radius of 60
		mock.emit('pointermove', pointer(1, 320, 300));
		const intent = adapter.update();
		expect(intent.moveVector.x).toBeCloseTo(1, 5);
		expect(intent.moveVector.y).toBeCloseTo(0, 5);
	});

	it('diagonal movement is correctly normalized', () => {
		mock.emit('pointerdown', pointer(1, 200, 300));
		// Move 60px diagonally (42.4px each axis = beyond dead zone)
		const diag = 60 / Math.SQRT2;
		mock.emit('pointermove', pointer(1, 200 + diag, 300 + diag));
		const intent = adapter.update();
		const expected = diag / 60; // ~0.707
		expect(intent.moveVector.x).toBeCloseTo(expected, 2);
		expect(intent.moveVector.y).toBeCloseTo(expected, 2);
	});

	it('pointer capture: second finger does not steal joystick', () => {
		mock.emit('pointerdown', pointer(1, 200, 300));
		mock.emit('pointermove', pointer(1, 260, 300)); // finger 1 moves right
		mock.emit('pointerdown', pointer(2, 100, 100)); // finger 2 touches
		mock.emit('pointermove', pointer(2, 100, 200)); // finger 2 moves
		const intent = adapter.update();
		// Should still track finger 1's position
		expect(intent.moveVector.x).toBe(1);
	});

	it('pointerup releases joystick', () => {
		mock.emit('pointerdown', pointer(1, 200, 300));
		mock.emit('pointermove', pointer(1, 260, 300));
		mock.emit('pointerup', pointer(1, 260, 300));
		const intent = adapter.update();
		expect(intent.moveVector.x).toBe(0);
		expect(intent.moveVector.y).toBe(0);
	});

	it('pointercancel clears all touch state', () => {
		mock.emit('pointerdown', pointer(1, 200, 300));
		mock.emit('pointermove', pointer(1, 260, 300));
		mock.emitCanvas('pointercancel');
		const intent = adapter.update();
		expect(intent.moveVector.x).toBe(0);
		expect(intent.moveVector.y).toBe(0);
	});

	it('clear() zeros moveVector and releases pointer tracking', () => {
		mock.emit('pointerdown', pointer(1, 200, 300));
		mock.emit('pointermove', pointer(1, 260, 300));
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
});
