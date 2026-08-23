# Requirements Document

## Introduction

After the decision, the fisher logs the trip, shares location, and can run the app in Filipino.

## Requirements

### Requirement 1

**User Story:** As a fisher, I want a catch book that does the peso math, so that I see kita or lugi without a calculator.

#### Acceptance Criteria

1. WHEN a catch is saved from the map, THE SYSTEM SHALL add it to the trip list and recompute income, expenses, and net.
2. WHEN the ledger is open, THE SYSTEM SHALL show trips, running income and expenses, and budget remaining.
3. WHEN net is positive, THE SYSTEM SHALL show it as green and signed. WHEN net is negative, THE SYSTEM SHALL show it as red and signed.

### Requirement 2

**User Story:** As a fisher, I want to share where I am, so that family can open the pin.

#### Acceptance Criteria

1. WHEN location sharing is on and GPS is available, THE SYSTEM SHALL update the map pin from the live fix.
2. WHEN the fisher opens Share GPS via QR, THE SYSTEM SHALL encode the current coordinates for Google Maps.
3. WHEN GPS is not ready, THE SYSTEM SHALL say it is waiting for GPS instead of a fake pin.

### Requirement 3

**User Story:** As a fisher, I want Filipino on the buttons I already use, so that I do not have to read English to leave or stay.

#### Acceptance Criteria

1. WHEN Filipino is chosen on landing, setup, or Settings, THE SYSTEM SHALL apply it immediately and persist it.
2. WHEN Filipino is on, THE SYSTEM SHALL translate chrome, nav, Today, Weather, ledger, map labels, and What-If talk.
3. WHEN English is chosen again, THE SYSTEM SHALL restore English without resetting the profile.
