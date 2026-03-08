import { describe, expect, it } from 'vitest';
import { ControlSchemeSchema, defaultGameSettings, GameSettingsSchema } from './settings.schema';

describe('ControlSchemeSchema', () => {
	it.each(['wasd', 'arrows', 'touch'])('accepts valid value: %s', (value) => {
		expect(ControlSchemeSchema.parse(value)).toBe(value);
	});

	it.each([
		'gamepad',
		'',
		'WASD',
		'keyboard',
		123,
		null,
		undefined,
	])('rejects invalid value: %s', (value) => {
		expect(() => ControlSchemeSchema.parse(value)).toThrow();
	});
});

describe('GameSettingsSchema', () => {
	it('returns wasd as default controlScheme', () => {
		const settings = GameSettingsSchema.parse({});
		expect(settings.controlScheme).toBe('wasd');
	});

	it('accepts touch as controlScheme', () => {
		const settings = GameSettingsSchema.parse({ controlScheme: 'touch' });
		expect(settings.controlScheme).toBe('touch');
	});

	it('parses existing persisted settings without error', () => {
		const persisted = { controlScheme: 'wasd', masterVolume: 0.5 };
		const settings = GameSettingsSchema.parse(persisted);
		expect(settings.controlScheme).toBe('wasd');
		expect(settings.masterVolume).toBe(0.5);
	});

	it('round-trip parse is stable', () => {
		const first = GameSettingsSchema.parse({});
		const second = GameSettingsSchema.parse(first);
		expect(second).toEqual(first);
	});

	it('defaultGameSettings returns all defaults', () => {
		const defaults = defaultGameSettings();
		expect(defaults.controlScheme).toBe('wasd');
		expect(defaults.touchControlsEnabled).toBe(true);
		expect(defaults.masterVolume).toBe(0.8);
		expect(defaults.showFps).toBe(false);
	});
});
