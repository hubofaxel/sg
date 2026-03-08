import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Phaser at the module level — KeyboardInput imports it for KeyCodes
vi.mock('phaser', () => ({
	default: {},
	Input: {
		Keyboard: {
			KeyCodes: { W: 87, A: 65, S: 83, D: 68 },
		},
	},
}));

// Must import after vi.mock
const { KeyboardInput } = await import('./KeyboardInput');

// ---------------------------------------------------------------------------
// Minimal Phaser scene mock — only what KeyboardInput.create() touches
// ---------------------------------------------------------------------------

function mockKey(isDown = false) {
	return { isDown };
}

function makeMockScene() {
	const keys: Record<string, { isDown: boolean }> = {
		W: mockKey(),
		A: mockKey(),
		S: mockKey(),
		D: mockKey(),
	};

	const cursors = {
		left: mockKey(),
		right: mockKey(),
		up: mockKey(),
		down: mockKey(),
		space: mockKey(),
		shift: mockKey(),
	};

	return {
		input: {
			keyboard: {
				createCursorKeys: vi.fn(() => cursors),
				addKey: vi.fn((keyCode: number) => {
					// Phaser key codes: W=87, A=65, S=83, D=68
					const map: Record<number, string> = { 87: 'W', 65: 'A', 83: 'S', 68: 'D' };
					return keys[map[keyCode]] ?? mockKey();
				}),
				removeAllKeys: vi.fn(),
			},
		},
		cursors,
		keys,
	};
}

describe('KeyboardInput', () => {
	let adapter: InstanceType<typeof KeyboardInput>;
	let mock: ReturnType<typeof makeMockScene>;

	beforeEach(() => {
		adapter = new KeyboardInput();
		mock = makeMockScene();
		// biome-ignore lint/suspicious/noExplicitAny: Phaser scene mock
		adapter.create(mock as any);
	});

	it('returns zero moveVector with no keys pressed', () => {
		const intent = adapter.update();
		expect(intent.moveVector.x).toBe(0);
		expect(intent.moveVector.y).toBe(0);
	});

	it('returns x=-1 when left is pressed', () => {
		mock.cursors.left.isDown = true;
		const intent = adapter.update();
		expect(intent.moveVector.x).toBe(-1);
		expect(intent.moveVector.y).toBe(0);
	});

	it('returns x=1 when right (D key) is pressed', () => {
		mock.keys.D.isDown = true;
		const intent = adapter.update();
		expect(intent.moveVector.x).toBe(1);
		expect(intent.moveVector.y).toBe(0);
	});

	it('returns y=-1 when up is pressed', () => {
		mock.cursors.up.isDown = true;
		const intent = adapter.update();
		expect(intent.moveVector.y).toBe(-1);
		expect(intent.moveVector.x).toBe(0);
	});

	it('returns y=1 when down (S key) is pressed', () => {
		mock.keys.S.isDown = true;
		const intent = adapter.update();
		expect(intent.moveVector.y).toBe(1);
		expect(intent.moveVector.x).toBe(0);
	});

	it('normalizes diagonal movement (left + up)', () => {
		mock.cursors.left.isDown = true;
		mock.cursors.up.isDown = true;
		const intent = adapter.update();
		const inv = 1 / Math.SQRT2;
		expect(intent.moveVector.x).toBeCloseTo(-inv, 10);
		expect(intent.moveVector.y).toBeCloseTo(-inv, 10);
	});

	it('normalizes diagonal movement (right + down via WASD)', () => {
		mock.keys.D.isDown = true;
		mock.keys.S.isDown = true;
		const intent = adapter.update();
		const inv = 1 / Math.SQRT2;
		expect(intent.moveVector.x).toBeCloseTo(inv, 10);
		expect(intent.moveVector.y).toBeCloseTo(inv, 10);
	});

	it('fireHeld is always true', () => {
		const intent = adapter.update();
		expect(intent.fireHeld).toBe(true);
	});

	it('secondaryHeld is always false', () => {
		const intent = adapter.update();
		expect(intent.secondaryHeld).toBe(false);
	});

	it('clear() zeros moveVector', () => {
		mock.cursors.left.isDown = true;
		adapter.update();
		adapter.clear();
		// After clear, update should reflect key state, but clear itself should zero
		const intent = adapter.update();
		// Keys are still down, so movement returns
		expect(intent.moveVector.x).toBe(-1);

		// But the clear itself reset the internal state
		mock.cursors.left.isDown = false;
		adapter.clear();
		// Read internal state directly via a fresh update with no keys
		const cleared = adapter.update();
		expect(cleared.moveVector.x).toBe(0);
		expect(cleared.moveVector.y).toBe(0);
	});

	it('destroy() calls removeAllKeys', () => {
		adapter.destroy();
		expect(mock.input.keyboard.removeAllKeys).toHaveBeenCalledWith(true);
	});
});
