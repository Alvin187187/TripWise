# Requirements Document

## Introduction

Today and Weather must read the real sea off Navotas, not a static mock. Diesel should follow the latest DOE NCR pump watch we can parse.

## Requirements

### Requirement 1

**User Story:** As a fisher, I want wind, waves, rain, and tide for the coast I work, so that the score matches what I see outside.

#### Acceptance Criteria

1. WHEN the app loads Today, THE SYSTEM SHALL request Open-Meteo forecast and marine for Manila Bay coordinates.
2. WHEN hourly and daily series arrive, THE SYSTEM SHALL render them on Weather (now, 7-day, tide, 24-hour).
3. WHEN moonrise and moonset are known, THE SYSTEM SHALL show Major and Minor peak bite windows.

### Requirement 2

**User Story:** As a fisher, I want to know if PAGASA posted a gale warning, so that I do not leave into a named warning.

#### Acceptance Criteria

1. WHEN a gale warning covers the area, THE SYSTEM SHALL force STAY and show the warning text.
2. WHEN no warning is found, THE SYSTEM SHALL say there is no gale warning in the area.

### Requirement 3

**User Story:** As a fisher, I want the diesel number used in the math to follow DOE, so that break-even is not a guess.

#### Acceptance Criteria

1. WHEN a current DOE NCR weekly table can be read, THE SYSTEM SHALL use common diesel as the live price.
2. WHEN the live read fails, THE SYSTEM SHALL keep the last stored diesel and still compute fuel cost.
