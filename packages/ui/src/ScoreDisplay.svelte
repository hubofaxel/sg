<script lang="ts">
interface Props {
	score: number;
	label?: string;
}

let { score, label }: Props = $props();

const formatted = $derived(score.toLocaleString());
</script>

<div class="sg-score">
	{#if label}
		<span class="sg-score-label">{label}</span>
	{/if}
	<span class="sg-score-value">{formatted}</span>
</div>

<style>
	.sg-score {
		font-family: 'Courier New', Courier, monospace;
		display: inline-flex;
		align-items: baseline;
		gap: 0.5rem;
	}

	.sg-score-label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--sg-primary, #0af);
	}

	.sg-score-value {
		font-size: 1.5rem;
		font-weight: bold;
		color: var(--sg-text, #eee);
		font-variant-numeric: tabular-nums;
	}
</style>
