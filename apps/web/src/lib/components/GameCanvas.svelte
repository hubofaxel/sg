<script lang="ts">
import type { GameHandle } from '@sg/game';
import { onDestroy, onMount } from 'svelte';
import { settings } from '../stores/settings.svelte';

let container: HTMLDivElement;
let handle: GameHandle | null = $state(null);

const onVisibility = () => {
	if (!handle) return;
	if (document.hidden) {
		handle.pause();
	} else {
		handle.resume();
	}
};

onMount(() => {
	// Dynamic import — Phaser accesses `window` at module scope,
	// so it must never be imported during SSR.
	import('@sg/game').then(({ mountGame }) => {
		const s = settings.value;
		handle = mountGame(container, {
			settings: {
				masterVolume: s.masterVolume,
				sfxVolume: s.sfxVolume,
				musicVolume: s.musicVolume,
				showFps: s.showFps,
			},
		});

		handle.on('ready', () => {
			console.log('[GameCanvas] game ready');
		});

		handle.on('error', (err) => {
			console.error('[GameCanvas] game error:', err);
		});
	});

	document.addEventListener('visibilitychange', onVisibility);

	return () => {
		document.removeEventListener('visibilitychange', onVisibility);
	};
});

onDestroy(() => {
	handle?.destroy();
	handle = null;
});
</script>

<div bind:this={container} class="game-container"></div>

<style>
	.game-container {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #000;
		touch-action: none;
	}
</style>
