<script lang="ts">
import GameCanvas from '$lib/components/GameCanvas.svelte';
</script>

<svelte:head>
	<title>Play — Ship Game</title>
</svelte:head>

<main class="play-page">
	<GameCanvas />
</main>

<style>
	.play-page {
		width: 100vw;
		height: 100vh;
		overflow: hidden;
	}
</style>
