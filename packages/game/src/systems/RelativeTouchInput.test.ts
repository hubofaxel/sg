import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({}));

const { RelativeTouchInput } = await import('./RelativeTouchInput');

type Listener = (e: unknown) => void;

function makeMockScene(sceneWidth = 800, sceneHeight = 600) {
	const canvasListeners: Record<string, Listener[]> = {};

	const canvas = {
		addEventListener: vi.fn((event: string, fn: Listener) => {
			if (!canvasListeners[event]) canvasListeners[event] = [];
			canvasListeners[event].push(fn);
		}),
		removeEventListener: vi.fn(),
		getBoundingClientRect: vi.fn(() => ({
			left: 0,
			top: 0,
			width: sceneWidth,
			height: sceneHeight,
		})),
	};

	return {
		input: { on: vi.fn(), off: vi.fn() },
		add: { graphics: vi.fn() },
		scale: { width: sceneWidth, height: sceneHeight },
		game: { canvas },
		emitCanvas(event: string, e: unknown) {
			for (const fn of canvasListeners[event] ?? []) fn(e);
		},
	};
}

function pointerEvent(pointerId: number, clientX: number, clientY: number) {
	return { pointerId, clientX, clientY };
}

function mockPlayer(x: number, y: number) {
	return { x, y };
}

describe('RelativeTouchInput', () => {
	let adapter: InstanceType<typeof RelativeTouchInput>;
	let mock: ReturnType<typeof makeMockScene>;
	let player: ReturnType<typeof mockPlayer>;

	beforeEach(() => {
		adapter = new RelativeTouchInput();
		mock = makeMockScene(800, 600);
		player = mockPlayer(400, 500);
		// biome-ignore lint/suspicious/noExplicitAny: Phaser scene mock
		adapter.create(mock as any);
		// biome-ignore lint/suspicious/noExplicitAny: Phaser sprite mock
		adapter.setPlayer(player as any);
	});

	it('isPositionDelta is always true', () => {
		const intent = adapter.update();
		expect(intent.isPositionDelta).toBe(true);
	});

	it('returns zero moveVector with no active pointer', () => {
		const intent = adapter.update();
		expect(intent.moveVector.x).toBe(0);
		expect(intent.moveVector.y).toBe(0);
	});

	it('ignores pointerdown on right half of screen', () => {
		mock.emitCanvas('pointerdown', pointerEvent(1, 500, 300));
		const intent = adapter.update();
		expect(intent.moveVector.x).toBe(0);
	});

	it('1:1 tracking: finger moves 50px right, ship delta is 50px right', () => {
		// Touch at (200, 300), ship at (400, 500)
		mock.emitCanvas('pointerdown', pointerEvent(1, 200, 300));
		// Drag finger 50px right to (250, 300)
		mock.emitCanvas('pointermove', pointerEvent(1, 250, 300));

		const intent = adapter.update();
		// Target = 400 + (250 - 200) = 450. Delta = 450 - 400 = 50
		expect(intent.moveVector.x).toBe(50);
		expect(intent.moveVector.y).toBe(0);
	});

	it('1:1 tracking: diagonal finger movement', () => {
		mock.emitCanvas('pointerdown', pointerEvent(1, 200, 300));
		mock.emitCanvas('pointermove', pointerEvent(1, 230, 340));

		const intent = adapter.update();
		// deltaX = 30, deltaY = 40
		expect(intent.moveVector.x).toBe(30);
		expect(intent.moveVector.y).toBe(40);
	});

	it('ship follows finger continuously', () => {
		mock.emitCanvas('pointerdown', pointerEvent(1, 200, 300));
		mock.emitCanvas('pointermove', pointerEvent(1, 250, 300));

		// First frame: delta = 50
		let intent = adapter.update();
		expect(intent.moveVector.x).toBe(50);

		// Simulate GameScene applying the delta
		player.x = 450;

		// Second frame: no further finger movement, delta should be 0
		intent = adapter.update();
		expect(intent.moveVector.x).toBe(0);
	});

	it('pointerup stops tracking', () => {
		mock.emitCanvas('pointerdown', pointerEvent(1, 200, 300));
		mock.emitCanvas('pointermove', pointerEvent(1, 260, 300));
		mock.emitCanvas('pointerup', pointerEvent(1, 260, 300));

		const intent = adapter.update();
		expect(intent.moveVector.x).toBe(0);
		expect(intent.moveVector.y).toBe(0);
	});

	it('second finger does not steal tracking', () => {
		mock.emitCanvas('pointerdown', pointerEvent(1, 200, 300));
		mock.emitCanvas('pointermove', pointerEvent(1, 250, 300));
		mock.emitCanvas('pointerdown', pointerEvent(2, 100, 100));
		mock.emitCanvas('pointermove', pointerEvent(2, 50, 50));

		const intent = adapter.update();
		// Still tracking finger 1: delta = 50
		expect(intent.moveVector.x).toBe(50);
	});

	it('pointercancel clears state', () => {
		mock.emitCanvas('pointerdown', pointerEvent(1, 200, 300));
		mock.emitCanvas('pointermove', pointerEvent(1, 260, 300));
		mock.emitCanvas('pointercancel', pointerEvent(1, 260, 300));

		const intent = adapter.update();
		expect(intent.moveVector.x).toBe(0);
	});

	it('clear() zeros everything', () => {
		mock.emitCanvas('pointerdown', pointerEvent(1, 200, 300));
		mock.emitCanvas('pointermove', pointerEvent(1, 260, 300));
		adapter.clear();

		const intent = adapter.update();
		expect(intent.moveVector.x).toBe(0);
		expect(intent.moveVector.y).toBe(0);
	});

	it('fireHeld is always true (auto-fire)', () => {
		expect(adapter.update().fireHeld).toBe(true);
	});

	it('handles CSS-scaled canvas correctly', () => {
		// Canvas is 400 CSS pixels but world is 800
		const scaled = makeMockScene(800, 600);
		(scaled.game.canvas.getBoundingClientRect as ReturnType<typeof vi.fn>).mockReturnValue({
			left: 0,
			top: 0,
			width: 400,
			height: 300,
		});
		const a = new RelativeTouchInput();
		const p = mockPlayer(400, 300);
		// biome-ignore lint/suspicious/noExplicitAny: mock
		a.create(scaled as any);
		// biome-ignore lint/suspicious/noExplicitAny: mock
		a.setPlayer(p as any);

		// Touch at CSS (100, 150) = world (200, 300)
		scaled.emitCanvas('pointerdown', pointerEvent(1, 100, 150));
		// Move to CSS (125, 150) = world (250, 300) → delta = 50 world px
		scaled.emitCanvas('pointermove', pointerEvent(1, 125, 150));

		const intent = a.update();
		expect(intent.moveVector.x).toBe(50);
		expect(intent.moveVector.y).toBe(0);
	});
});
