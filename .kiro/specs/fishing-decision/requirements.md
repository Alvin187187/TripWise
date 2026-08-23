# Requirements Document

## Introduction

TripWise helps a Navotas fisher decide whether to leave. The first release is a phone-sized web app: onboard the boat, show a live sea score, and return GO, CAUTION, or STAY.

## Requirements

### Requirement 1

**User Story:** As a fisher, I want a short setup for my bangka, so that the fuel math matches how I actually run.

#### Acceptance Criteria

1. WHEN the fisher finishes setup with motor class, typical hours, and a fishing ground, THE SYSTEM SHALL save that profile on the device.
2. WHEN the fisher skips setup for demo, THE SYSTEM SHALL load a working demo profile and still honor the selected language.
3. WHEN the sea is dangerous, THE SYSTEM SHALL show a stay warning on setup and shall not hide it behind other copy.

### Requirement 2

**User Story:** As a fisher, I want one score for today, so that I do not have to read five apps before leaving.

#### Acceptance Criteria

1. WHEN live weather and marine data are available, THE SYSTEM SHALL compute a 0–100 fishing score.
2. WHEN a gale warning applies, or wind is at gale force, or waves are at or above 2.0 m, THE SYSTEM SHALL return STAY.
3. WHEN the trip is not an automatic stay, THE SYSTEM SHALL deduct for waves, wind, rain, falling tide, and high diesel, then map the score to GO, CAUTION, or STAY.
4. WHEN the network is down but a cache exists, THE SYSTEM SHALL show the last cached read and mark it as off-grid.

### Requirement 3

**User Story:** As a fisher, I want to see diesel and break-even kilos, so that I know if the trip can pay.

#### Acceptance Criteria

1. WHEN a profile exists, THE SYSTEM SHALL estimate fuel cost from motor L/h × hours × diesel.
2. WHEN last catch weight exists in the ledger, THE SYSTEM SHALL use that weight as the expected catch. Otherwise THE SYSTEM SHALL use a conservative default.
3. WHEN the fisher opens Show the Math, THE SYSTEM SHALL show the same inputs used for the estimate.
