---
inclusion: always
---

# Stack

- React 19 + Vite 8 + TypeScript
- Tailwind CSS v4 via `@tailwindcss/vite` (`src/index.css` imports `tailwindcss`)
- MapLibre GL for the map
- Live sea and wind from Open-Meteo forecast + marine
- PAGASA gale text and DOE diesel via public page reads (no official JSON for those)
- Persistence is browser `localStorage` only (`tripwise-profile`, `tripwise-trips`, `tripwise-spots`, `tripwise-budget`, `tripwise-lang`, live cache keys)

## Constraints

- Default-export screen components.
- Double quotes when a string contains an apostrophe.
- No extra UI icon packs. Use `src/icons.tsx`.
- Theme: chassis `#E8F3FC`, header `#0E4C81`, primary `#1A6BAD`. Display font Barlow Condensed. Body Nunito / Outfit.
- Phone-first shell, max width ~430px.
- `#[[file:package.json]]`
- `#[[file:vite.config.ts]]`
