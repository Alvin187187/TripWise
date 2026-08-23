# Design Document

## Overview

Single React app. `App.tsx` owns screens and profile. `live.ts` owns fetch + score. `ledger.ts` owns trips and money.

## Score

Inputs: PAGASA gale flag, wind km/h, significant wave height, rain chance, tide trend, diesel peso/L.

Hard STAY if gale, wind ≥ 62 km/h, or waves ≥ 2.0 m.

Else start from 100 and subtract. Stay / caution / go bands stay visible in the UI as STAY / CAUTION / GO.

## Persistence

`localStorage` keys stay on the device. They are not part of the git repo.

## UI

Phone shell. Today is the home screen: greeting, score ring, sky card, bite windows, fuel, economics, last spot, start departure.

## Correctness

Safety copy is never decorative. STAY means do not leave.
