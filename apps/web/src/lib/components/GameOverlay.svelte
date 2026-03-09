<script lang="ts">
import type { GameHandle } from '@sg/game';
import { settings } from '../stores/settings.svelte';

interface Props {
	handle: GameHandle | null;
}

let { handle }: Props = $props();

let paused = $state(false);
let previousVolume = $state(0.8);

let muted = $derived(settings.value.masterVolume === 0);

function togglePause() {
	if (!handle) return;
	if (paused) {
		handle.resume();
		paused = false;
	} else {
		handle.pause();
		paused = true;
	}
}

function toggleMute() {
	if (muted) {
		settings.update({ masterVolume: previousVolume || 0.8 });
	} else {
		previousVolume = settings.value.masterVolume;
		settings.update({ masterVolume: 0 });
	}
}
</script>

{#if handle}
	<div class="game-overlay" role="toolbar" aria-label="Game controls">
		<div class="overlay-buttons">
			<button
				class="overlay-btn"
				onclick={togglePause}
				aria-label={paused ? 'Resume game' : 'Pause game'}
			>
				{#if paused}
					<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
						<polygon points="6,4 20,12 6,20" />
					</svg>
				{:else}
					<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
						<rect x="5" y="4" width="4" height="16" />
						<rect x="15" y="4" width="4" height="16" />
					</svg>
				{/if}
			</button>
			<button
				class="overlay-btn"
				onclick={toggleMute}
				aria-label={muted ? 'Unmute audio' : 'Mute audio'}
			>
				{#if muted}
					<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
						<polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
						<line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="2" />
						<line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-width="2" />
					</svg>
				{:else}
					<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
						<polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
						<path d="M15.54 8.46a5 5 0 0 1 0 7.07" fill="none" stroke="currentColor" stroke-width="2" />
						<path d="M19.07 4.93a10 10 0 0 1 0 14.14" fill="none" stroke="currentColor" stroke-width="2" />
					</svg>
				{/if}
			</button>
		</div>

		{#if paused}
			<div class="pause-screen">
				<p class="pause-text">PAUSED</p>
				<button class="resume-btn" onclick={togglePause} aria-label="Resume game">
					TAP TO RESUME
				</button>
			</div>
		{/if}
	</div>
{/if}

<style>
	.game-overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 20;
	}

	.overlay-buttons {
		position: absolute;
		top: calc(8px + env(safe-area-inset-top, 0px));
		right: calc(8px + env(safe-area-inset-right, 0px));
		display: flex;
		gap: 4px;
		padding: 8px;
		pointer-events: auto;
	}

	.overlay-btn {
		min-width: 44px;
		min-height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 8px;
		color: rgba(255, 255, 255, 0.8);
		cursor: pointer;
		padding: 8px;
		-webkit-tap-highlight-color: transparent;
	}

	.overlay-btn:active {
		background: rgba(255, 255, 255, 0.15);
	}

	.overlay-btn svg {
		width: 20px;
		height: 20px;
	}

	.pause-screen {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
		background: rgba(0, 0, 0, 0.6);
		pointer-events: auto;
	}

	.pause-text {
		font-family: 'Courier New', monospace;
		font-size: clamp(1.5rem, 4vw, 2.5rem);
		color: #fff;
		letter-spacing: 8px;
		margin: 0;
	}

	.resume-btn {
		font-family: 'Courier New', monospace;
		font-size: clamp(0.75rem, 2vw, 1rem);
		color: rgba(255, 255, 255, 0.7);
		background: none;
		border: 1px solid rgba(255, 255, 255, 0.3);
		padding: 12px 24px;
		min-height: 44px;
		cursor: pointer;
		letter-spacing: 2px;
		-webkit-tap-highlight-color: transparent;
	}

	.resume-btn:active {
		background: rgba(255, 255, 255, 0.1);
	}
</style>
