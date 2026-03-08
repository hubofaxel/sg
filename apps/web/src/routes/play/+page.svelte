<script lang="ts">
import GameCanvas from '$lib/components/GameCanvas.svelte';
import RotateOverlay from '$lib/components/RotateOverlay.svelte';
</script>

<svelte:head>
	<title>Play — Ship Game</title>
</svelte:head>

<main class="play-page">
	<GameCanvas />
	<RotateOverlay />
</main>

<style>
	.play-page {
		width: 100dvw;
		height: 100dvh;
		overflow: hidden;
		padding:
			env(safe-area-inset-top)
			env(safe-area-inset-right)
			env(safe-area-inset-bottom)
			env(safe-area-inset-left);
	}
</style>
