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

## Runtime Settings Bridge (Mobile)

Post-mount settings updates flow from Svelte to Phaser via `GameHandle.updateSettings()`:

```typescript
// In GameHandle (packages/game/src/types.ts)
interface GameHandle {
  // ... existing methods
  updateSettings(partial: Partial<RuntimeSettings>): void;
}

// Implementation (mountGame.ts) writes to Phaser registry
updateSettings(partial) {
  for (const [key, value] of Object.entries(partial)) {
    game.registry.set(key, value);
  }
}
```

Shell integration — use Svelte 5 `$effect` to push changes:

```typescript
// In GameCanvas.svelte or play/+page.svelte
$effect(() => {
  if (handle) {
    handle.updateSettings({
      masterVolume: settings.value.masterVolume,
      sfxVolume: settings.value.sfxVolume,
      musicVolume: settings.value.musicVolume,
    });
  }
});
```

**Important:** `$effect` tracks reactive dependencies automatically. Only include settings that should trigger runtime updates. Do not include `controlScheme` — adapter selection happens at mount time only (Phase A).

## Expanded Lifecycle Handling (Mobile)

Desktop uses `visibilitychange` only. Mobile requires additional lifecycle coverage:

```svelte
<script>
  // Existing: visibilitychange
  function handleVisibility() {
    if (document.hidden) handle?.pause();
    else handle?.resume();
  }

  // Addition: pagehide (complementary signal on mobile)
  function handlePageHide() {
    handle?.pause();
  }

  $effect(() => {
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
    };
  });
</script>
```

Pause is shell-authoritative. The game never self-pauses. All triggers (visibility, orientation, overlay button) call `handle.pause()` from the shell side.

## Orientation Handling

Shell detects portrait orientation and shows a rotate overlay:

```svelte
<script>
  let isPortrait = $state(false);

  function checkOrientation() {
    isPortrait = window.innerWidth < window.innerHeight;
    if (isPortrait) handle?.pause();
  }

  $effect(() => {
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  });
</script>

{#if isPortrait}
  <RotateOverlay />
{/if}
```

The game-side safety net: GameScene subscribes to `Phaser.Scale.Events.ORIENTATION_CHANGE` and calls `adapter.clear()` on portrait. This is a fallback — the shell overlay is the primary enforcement.
