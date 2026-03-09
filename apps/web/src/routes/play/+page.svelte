<script lang="ts">
import type { GameHandle } from '@sg/game';
import GameCanvas from '$lib/components/GameCanvas.svelte';
import GameOverlay from '$lib/components/GameOverlay.svelte';
import RotateOverlay from '$lib/components/RotateOverlay.svelte';

let gameHandle: GameHandle | null = $state(null);
</script>

<svelte:head>
	<title>Play — Ship Game</title>
</svelte:head>

<main class="play-page">
	<GameCanvas onhandle={(h) => (gameHandle = h)} />
	<GameOverlay handle={gameHandle} />
	<RotateOverlay />
</main>

<style>
	.play-page {
		position: relative;
		width: 100dvw;
		height: 100dvh;
		overflow: hidden;
		background: #000;
		padding:
			env(safe-area-inset-top)
			env(safe-area-inset-right)
			env(safe-area-inset-bottom)
			env(safe-area-inset-left);
	}
</style>
