---
name: pwa-delivery
description: PWA configuration using @vite-pwa/sveltekit. Load when working on service worker, manifest, or install UX.
---

## PWA Delivery with @vite-pwa/sveltekit

### Setup
```typescript
// vite.config.ts
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
    SvelteKitPWA({
      registerType: 'prompt',
      manifest: {
        name: 'Ship Game',
        short_name: 'ShipGame',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'fullscreen',
        orientation: 'landscape',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,webp,json}'],
        runtimeCaching: [
          {
            urlPattern: /\.(?:png|webp|jpg|svg)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'game-assets',
              expiration: { maxEntries: 200 },
            },
          },
        ],
      },
    }),
  ],
});
```

### Offline strategy
- Core app shell: precached (Workbox `globPatterns`)
- Game assets: CacheFirst with size limit
- Save data: localStorage (never in service worker cache)
- Update flow: prompt user, reload on accept

### Install prompt
- Detect `beforeinstallprompt` event
- Show custom install UI (Svelte component with Tailwind)
- Track install state in localStorage
