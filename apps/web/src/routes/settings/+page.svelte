<script lang="ts">
import { base } from '$app/paths';
import { settings } from '$lib/stores/settings.svelte';

function setVolume(key: 'masterVolume' | 'sfxVolume' | 'musicVolume', e: Event) {
	const input = e.target as HTMLInputElement;
	settings.update({ [key]: Number.parseFloat(input.value) });
}

function toggleFps() {
	settings.update({ showFps: !settings.value.showFps });
}

function setScreenShake(e: Event) {
	const input = e.target as HTMLInputElement;
	settings.update({ screenShake: Number.parseFloat(input.value) });
}

function resetDefaults() {
	settings.reset();
}
</script>

<div class="settings-page">
	<header>
		<a href="{base}/" class="back-link">&larr; BACK</a>
		<h1>SETTINGS</h1>
	</header>

	<section>
		<h2>AUDIO</h2>

		<label>
			<span class="label-text">Master Volume</span>
			<input
				type="range"
				min="0"
				max="1"
				step="0.05"
				value={settings.value.masterVolume}
				oninput={(e) => setVolume('masterVolume', e)}
			/>
			<span class="value">{Math.round(settings.value.masterVolume * 100)}%</span>
		</label>

		<label>
			<span class="label-text">SFX Volume</span>
			<input
				type="range"
				min="0"
				max="1"
				step="0.05"
				value={settings.value.sfxVolume}
				oninput={(e) => setVolume('sfxVolume', e)}
			/>
			<span class="value">{Math.round(settings.value.sfxVolume * 100)}%</span>
		</label>

		<label>
			<span class="label-text">Music Volume</span>
			<input
				type="range"
				min="0"
				max="1"
				step="0.05"
				value={settings.value.musicVolume}
				oninput={(e) => setVolume('musicVolume', e)}
			/>
			<span class="value">{Math.round(settings.value.musicVolume * 100)}%</span>
		</label>
	</section>

	<section>
		<h2>DISPLAY</h2>

		<label>
			<span class="label-text">Screen Shake</span>
			<input
				type="range"
				min="0"
				max="1"
				step="0.1"
				value={settings.value.screenShake}
				oninput={(e) => setScreenShake(e)}
			/>
			<span class="value">{Math.round(settings.value.screenShake * 100)}%</span>
		</label>

		<label class="toggle-row">
			<span class="label-text">Show FPS</span>
			<button class="toggle" class:active={settings.value.showFps} onclick={toggleFps}>
				{settings.value.showFps ? 'ON' : 'OFF'}
			</button>
		</label>
	</section>

	<section>
		<button class="reset-btn" onclick={resetDefaults}>RESET TO DEFAULTS</button>
	</section>
</div>

<style>
	.settings-page {
		max-width: 480px;
		margin: 0 auto;
		padding: 2rem clamp(0.75rem, 4vw, 1.5rem);
		font-family: 'Courier New', monospace;
		color: #e0e0e0;
		background: #0a0a1a;
		min-height: 100vh;
	}

	header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.back-link {
		color: #888;
		text-decoration: none;
		font-size: clamp(0.75rem, 2vw, 0.875rem);
		min-height: 44px;
		display: flex;
		align-items: center;
	}
	.back-link:hover {
		color: #fff;
	}

	h1 {
		font-size: clamp(1.25rem, 3vw, 1.75rem);
		color: #fff;
		margin: 0;
		letter-spacing: 4px;
	}

	h2 {
		font-size: clamp(0.75rem, 2vw, 0.875rem);
		color: #00ff88;
		letter-spacing: 2px;
		border-bottom: 1px solid #333;
		padding-bottom: 0.5rem;
		margin-bottom: 1rem;
	}

	section {
		margin-bottom: 2rem;
	}

	label {
		display: grid;
		grid-template-columns: minmax(100px, 140px) 1fr 50px;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
		font-size: clamp(0.75rem, 2vw, 0.875rem);
	}

	@media (max-width: 400px) {
		label {
			grid-template-columns: 1fr 50px;
			gap: 0.5rem;
		}

		.label-text {
			grid-column: 1 / -1;
		}
	}

	.toggle-row {
		grid-template-columns: minmax(100px, 140px) auto 1fr;
	}

	@media (max-width: 400px) {
		.toggle-row {
			grid-template-columns: 1fr auto;
		}
	}

	.value {
		text-align: right;
		color: #888;
		font-size: clamp(0.625rem, 1.5vw, 0.75rem);
	}

	input[type='range'] {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 4px;
		background: #333;
		border-radius: 2px;
		outline: none;
	}
	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: #00ff88;
		cursor: pointer;
		border: 2px solid #0a0a1a;
		box-shadow: 0 0 0 2px #00ff88;
	}
	input[type='range']::-moz-range-thumb {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: #00ff88;
		cursor: pointer;
		border: 2px solid #0a0a1a;
		box-shadow: 0 0 0 2px #00ff88;
	}

	.toggle {
		font-family: 'Courier New', monospace;
		font-size: clamp(0.625rem, 1.5vw, 0.75rem);
		padding: 8px 16px;
		min-height: 44px;
		border: 1px solid #555;
		background: #1a1a2e;
		color: #888;
		cursor: pointer;
		letter-spacing: 1px;
		width: fit-content;
	}
	.toggle.active {
		border-color: #00ff88;
		color: #00ff88;
	}

	.reset-btn {
		font-family: 'Courier New', monospace;
		font-size: clamp(0.75rem, 2vw, 0.875rem);
		padding: 12px 20px;
		min-height: 44px;
		border: 1px solid #ff4444;
		background: transparent;
		color: #ff4444;
		cursor: pointer;
		letter-spacing: 2px;
		width: 100%;
	}
	.reset-btn:hover {
		background: #ff444420;
	}
</style>
