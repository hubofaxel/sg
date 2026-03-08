import { type GameSettings, GameSettingsSchema } from '@sg/contracts';

const STORAGE_KEY = 'sg-settings';

function loadSettings(): GameSettings {
	if (typeof localStorage === 'undefined') return GameSettingsSchema.parse({});

	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return GameSettingsSchema.parse({});
		return GameSettingsSchema.parse(JSON.parse(raw));
	} catch {
		return GameSettingsSchema.parse({});
	}
}

function saveSettings(settings: GameSettings): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

let current = $state<GameSettings>(loadSettings());

export const settings = {
	get value() {
		return current;
	},
	update(partial: Partial<GameSettings>) {
		current = { ...current, ...partial };
		saveSettings(current);
	},
	reset() {
		current = GameSettingsSchema.parse({});
		saveSettings(current);
	},
};
