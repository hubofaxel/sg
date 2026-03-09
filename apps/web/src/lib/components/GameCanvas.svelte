<script lang="ts">
import type { GameHandle } from '@sg/game';
import { onDestroy, onMount } from 'svelte';
import { base } from '$app/paths';
import { settings } from '../stores/settings.svelte';

interface Props {
	onhandle?: (handle: GameHandle | null) => void;
}

let { onhandle }: Props = $props();

// Push runtime-updatable settings to the game when they change
$effect(() => {
	if (!handle) return;
	const s = settings.value;
	handle.updateSettings({
		masterVolume: s.masterVolume,
		sfxVolume: s.sfxVolume,
		musicVolume: s.musicVolume,
		showFps: s.showFps,
	});
});

let container: HTMLDivElement;
let handle: GameHandle | null = $state(null);

// Notify parent when handle changes
$effect(() => {
	onhandle?.(handle);
});

onMount(() => {
	// Dynamic import — Phaser accesses `window` at module scope,
	// so it must never be imported during SSR.
	import('@sg/game').then(({ mountGame }) => {
		const s = settings.value;
		handle = mountGame(container, {
			basePath: base,
			settings: {
				masterVolume: s.masterVolume,
				sfxVolume: s.sfxVolume,
				musicVolume: s.musicVolume,
				showFps: s.showFps,
				touchControlsEnabled: s.touchControlsEnabled,
				controlScheme: s.controlScheme,
				touchStyle: s.touchStyle,
			},
		});

		handle.on('ready', () => {
			console.log('[GameCanvas] game ready');
		});

		handle.on('error', (err) => {
			console.error('[GameCanvas] game error:', err);
		});
	});
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
		background: #000;
		touch-action: none;
	}
</style>
