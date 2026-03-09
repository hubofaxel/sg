# Mobile Target Matrix

## Runtime families

| Class | Platform | Browser | Install path | Debug tool |
|---|---|---|---|---|
| A | Android 16 (Pixel 10, Galaxy S26 class) | Chrome | PWA via WebAPK | Chrome DevTools |
| B | iOS 26 (iPhone 17 family) | Safari | Home Screen web app | Safari Web Inspector |
| C | iOS 26 (iPhone 17 family) | Chrome | Browser play only | Limited (WebKit engine) |

## Reference devices

| Category | Devices | Screen class | Use for |
|---|---|---|---|
| Android compact | Pixel 10, Galaxy S26 | 6.3" | Thumb reach, HUD scaling, touch targets |
| Android large | Pixel 10 Pro XL, Galaxy S26 Ultra | 6.8-6.9" | HUD oversizing, thermal stability |
| iPhone compact | iPhone 17, 17 Pro | 6.3" | Safe areas, Dynamic Island, Safari PWA |
| iPhone large | iPhone 17 Pro Max | 6.9" | Large-screen HUD, installed mode lifecycle |
| iPhone budget | iPhone 17e | Budget class | Performance floor |

## Policies

- **Performance:** 60fps guaranteed, 120Hz opportunistic. Frame-rate independent simulation.
- **Detection:** Runtime capability checks only. No UA-based platform gating.
- **Install:** Android Chrome is primary PWA path. Safari is primary iOS installed path. No beforeinstallprompt on iOS Chrome.
- **Storage:** Validate offline behavior in installed mode on iPhone (7-day eviction applies to non-installed sites).
- **Engine:** Target engine families (Chromium/Blink, WebKit), not device brands. Chrome on iPhone is WebKit-class, not Chromium-class.

## QA Checklist (Real Device)

- [ ] Verify game canvas does not render under the Dynamic Island in landscape on iPhone 17 Pro class
- [ ] Verify touch joystick works on both Android Chrome and iOS Safari
- [ ] Verify orientation overlay appears in portrait, game pauses
- [ ] Verify tab switch / app background pauses game, resume works cleanly
- [ ] Verify HUD text readable on smallest device (iPhone 17e landscape)
- [ ] Verify no horizontal scroll on settings page at 320px width
