<script lang="ts">
let isPortrait = $state(false);
let isTouchDevice = $state(false);

$effect(() => {
	isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

	function check() {
		isPortrait = window.innerWidth < window.innerHeight;
	}

	check();
	window.addEventListener('resize', check);

	return () => {
		window.removeEventListener('resize', check);
	};
});
</script>

{#if isPortrait && isTouchDevice}
	<div
		class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[#0A0A1A]/95"
		role="alert"
		aria-live="assertive"
	>
		<svg
			class="h-16 w-16 animate-[spin_3s_ease-in-out_infinite] text-white"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			aria-hidden="true"
		>
			<rect x="5" y="2" width="14" height="20" rx="2" />
			<line x1="12" y1="18" x2="12" y2="18.01" stroke-width="2" stroke-linecap="round" />
		</svg>
		<p class="text-lg font-semibold text-white">Rotate your device</p>
		<p class="text-sm text-white/70">This game is best played in landscape mode</p>
	</div>
{/if}
