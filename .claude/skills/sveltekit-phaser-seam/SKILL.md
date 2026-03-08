---
name: sveltekit-phaser-seam
description: Integration contract between SvelteKit app shell and Phaser 4 game runtime. Load when working on GameCanvas.svelte or mountGame.
---

## SvelteKit <-> Phaser Integration Seam

### Principle
SvelteKit owns the DOM. Phaser owns a single canvas. They communicate through
a narrow event-based interface — never through shared mutable state.

### GameCanvas.svelte pattern
```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { mountGame, type GameHandle } from '@sg/game';

  let container: HTMLDivElement;
  let handle: GameHandle | null = $state(null);

  onMount(() => {
    handle = mountGame(container, { /* settings from store */ });
    handle.on('score', (s) => { /* update Svelte store */ });
    handle.on('death', () => { /* trigger save, show overlay */ });
  });

  onDestroy(() => {
    handle?.destroy();
    handle = null;
  });
</script>

<div bind:this={container} class="w-full h-full" />
```

### Rules
- ONE component mounts the game — `GameCanvas.svelte`
- Svelte stores drive settings -> pass into `mountGame(el, options)`
- Game events bubble up via `handle.on()` -> update Svelte stores
- Never import `phaser` in `apps/web/` — only `@sg/game`
- Handle tab visibility: pause on hidden, resume on visible
- WebGL context cleanup: always call `handle.destroy()` in `onDestroy`
