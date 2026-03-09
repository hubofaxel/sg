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
		position: fixed;
		top: 0;
		bottom: 0;
		left: env(safe-area-inset-left, 0px);
		right: env(safe-area-inset-right, 0px);
		overflow: hidden;
		background: #000;
	}
</style>
