<script lang="ts">
interface Props {
	value: number;
	color?: string;
	label?: string;
	showText?: boolean;
}

let { value, color, label, showText = false }: Props = $props();

const clamped = $derived(Math.max(0, Math.min(1, value)));
const pct = $derived(Math.round(clamped * 100));
</script>

<div class="sg-progress">
	{#if label}
		<div class="sg-progress-label">{label}</div>
	{/if}
	<div class="sg-progress-track">
		<div
			class="sg-progress-fill"
			style="width: {pct}%; {color ? `background: ${color};` : ''}"
		></div>
		{#if showText}
			<span class="sg-progress-text">{pct}%</span>
		{/if}
	</div>
</div>

<style>
	.sg-progress {
		font-family: 'Courier New', Courier, monospace;
	}

	.sg-progress-label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--sg-text, #eee);
		margin-bottom: 0.25rem;
	}

	.sg-progress-track {
		position: relative;
		height: 12px;
		background: #222;
		border: 1px solid var(--sg-border, #444);
		border-radius: 2px;
		overflow: hidden;
	}

	.sg-progress-fill {
		height: 100%;
		background: var(--sg-primary, #0af);
		transition: width 0.2s ease;
	}

	.sg-progress-text {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.6rem;
		font-weight: bold;
		color: #fff;
		text-shadow: 0 0 2px #000;
	}
</style>
