<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
	open: boolean;
	title?: string;
	closeable?: boolean;
	onclose?: () => void;
	children: Snippet;
}

let { open, title, closeable = true, onclose, children }: Props = $props();

function handleKeydown(e: KeyboardEvent) {
	if (e.key === 'Escape' && closeable && onclose) {
		onclose();
	}
}

function handleBackdrop() {
	if (closeable && onclose) {
		onclose();
	}
}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div class="sg-modal-backdrop" onclick={handleBackdrop} onkeydown={handleKeydown} role="presentation">
		<div class="sg-modal" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title ?? 'Dialog'} tabindex="-1">
			{#if title || closeable}
				<div class="sg-modal-header">
					{#if title}
						<span class="sg-modal-title">{title}</span>
					{/if}
					{#if closeable}
						<button class="sg-modal-close" onclick={onclose}>&times;</button>
					{/if}
				</div>
			{/if}
			<div class="sg-modal-body">
				{@render children()}
			</div>
		</div>
	</div>
{/if}

<style>
	.sg-modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.75);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.sg-modal {
		font-family: 'Courier New', Courier, monospace;
		background: var(--sg-bg, #111);
		border: 1px solid var(--sg-border, #444);
		border-radius: 4px;
		min-width: 280px;
		max-width: 90vw;
		max-height: 90vh;
		overflow-y: auto;
		color: var(--sg-text, #eee);
	}

	.sg-modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--sg-border, #444);
	}

	.sg-modal-title {
		font-weight: bold;
		text-transform: uppercase;
		font-size: 0.8rem;
		letter-spacing: 0.1em;
		color: var(--sg-primary, #0af);
	}

	.sg-modal-close {
		background: none;
		border: none;
		color: var(--sg-text, #eee);
		font-size: 1.25rem;
		cursor: pointer;
		padding: 0 0.25rem;
		line-height: 1;
	}

	.sg-modal-close:hover {
		color: #fff;
	}

	.sg-modal-body {
		padding: 0.75rem;
	}
</style>
