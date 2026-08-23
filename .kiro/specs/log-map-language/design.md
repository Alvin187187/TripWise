# Design Document

## Ledger

`ledger.ts` is the source of truth. `LedgerScreen` and `HistoryScreen` only render. Map `onSaveCatch` writes through `applyCatchToTrips`.

## Map

MapLibre, live `watchPosition`, QR via a maps URL of lat/lng. Turtle mascot stays inside the Manila Bay card. Location sharing sits under that card, not on top of it.

## Language

`src/i18n.ts` holds `t()`, `greet()`, `statusLine()`, tide/condition/wind helpers. `tripwise-lang` plus `profile.language`. Settings updates both in one tap.
