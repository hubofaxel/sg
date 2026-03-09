<script lang="ts">
interface Props {
	label: string;
	variant?: 'primary' | 'secondary' | 'danger';
	size?: 'sm' | 'md' | 'lg';
	disabled?: boolean;
	onclick?: (e: MouseEvent) => void;
}

let { label, variant = 'primary', size = 'md', disabled = false, onclick }: Props = $props();
</script>

<button
	class="sg-button {variant} {size}"
	{disabled}
	{onclick}
>
	{label}
</button>

<style>
	.sg-button {
		font-family: 'Courier New', Courier, monospace;
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border: 2px solid var(--sg-border, #444);
		cursor: pointer;
		min-height: 44px;
		transition: background-color 0.15s, border-color 0.15s, transform 0.1s;
	}

	.sg-button:hover:not(:disabled) {
		transform: scale(1.02);
	}

	.sg-button:active:not(:disabled) {
		transform: scale(0.98);
	}

	.sg-button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	/* Variants */
	.primary {
		background: var(--sg-primary, #0af);
		color: var(--sg-bg, #111);
		border-color: var(--sg-primary, #0af);
	}

	.primary:hover:not(:disabled) {
		background: color-mix(in srgb, var(--sg-primary, #0af) 80%, white);
	}

	.secondary {
		background: transparent;
		color: var(--sg-text, #eee);
		border-color: var(--sg-border, #444);
	}

	.secondary:hover:not(:disabled) {
		border-color: var(--sg-text, #eee);
	}

	.danger {
		background: #c33;
		color: #fff;
		border-color: #c33;
	}

	.danger:hover:not(:disabled) {
		background: #e44;
	}

	/* Sizes */
	.sm {
		padding: 0.25rem 0.75rem;
		font-size: 0.75rem;
	}

	.md {
		padding: 0.5rem 1.25rem;
		font-size: 0.875rem;
	}

	.lg {
		padding: 0.75rem 2rem;
		font-size: 1rem;
	}
</style>
