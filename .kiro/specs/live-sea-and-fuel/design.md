# Design Document

## Overview

`src/live.ts` exposes `useLive()`. Home, Weather, Math, What-If, and Map consume one bundle.

## Sources

- Open-Meteo forecast + marine, timezone Asia/Manila
- Solunar windows from moonrise / moonset
- PAGASA marine gale page
- DOE NCR weekly pump PDF / HTML parse for diesel

## Cache

`tripwise-live-v1` and `tripwise-diesel` in localStorage. Show last sync time on Today.

## Coordinates

Bay default: 14.639, 120.933. Last catch location from the ledger overrides the “last spot” card, not the marine fetch grid unless we later add per-spot marine.
