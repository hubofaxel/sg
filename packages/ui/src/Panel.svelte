<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
	title?: string;
	variant?: 'default' | 'dark' | 'transparent';
	children: Snippet;
}

let { title, variant = 'default', children }: Props = $props();
</script>

<div class="sg-panel {variant}">
	{#if title}
		<div class="sg-panel-header">{title}</div>
	{/if}
	<div class="sg-panel-body">
		{@render children()}
	</div>
</div>

<style>
	.sg-panel {
		font-family: 'Courier New', Courier, monospace;
		border: 1px solid var(--sg-border, #444);
		border-radius: 4px;
	}

	.default {
		background: var(--sg-bg, #111);
		color: var(--sg-text, #eee);
	}

	.dark {
		background: #0a0a0a;
		color: var(--sg-text, #eee);
		border-color: #333;
	}

	.transparent {
		background: transparent;
		color: var(--sg-text, #eee);
		border-color: transparent;
	}

	.sg-panel-header {
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--sg-border, #444);
		font-weight: bold;
		text-transform: uppercase;
		font-size: 0.75rem;
		letter-spacing: 0.1em;
		color: var(--sg-primary, #0af);
	}

	.sg-panel-body {
		padding: 0.75rem;
	}
</style>
