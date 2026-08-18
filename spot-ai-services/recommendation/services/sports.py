"""Shared sport-code mapping between the two casings used across schemas.

`schema_matchmaking.matches.sport` stores `FOOTBALL`/`BADMINTON` (upper).
`schema_venue.fields.sport_type` stores `Football`/`Badminton` (title case,
per spot-backend's `SPORT_TYPES`, shared/constants/venue.js). Both
`services/signals.py` and `services/candidates.py` need this mapping, so it
lives here rather than being duplicated.
"""

FIELD_SPORT_TYPE = {
    "FOOTBALL": "Football",
    "BADMINTON": "Badminton",
}
