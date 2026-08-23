---
inclusion: always
---

# Layout

```
src/main.tsx          entry, mounts App
src/App.tsx           screens, onboarding, settings, home, weather, what-if
src/live.ts           Open-Meteo, solunar, gale, diesel, score
src/ledger.ts         trips, money, budget helpers
src/i18n.ts           en / fil copy and helpers
src/MapScreen.tsx     map, GPS share, departure
src/LedgerScreen.tsx  catch book
src/HistoryScreen.tsx trip journey
src/icons.tsx         icon set
src/index.css         theme and layout
src/assets/media.ts   photos and mascots
```

Keep live fetching in `live.ts`. Keep money math in `ledger.ts`. Keep user-facing strings in `i18n.ts` — do not scatter new Filipino/English copy into random JSX.

Default export for screens. Types for profile, trips, and live bundle stay next to the code that owns them.
