# Game Challenges

This file records challenge concepts and their implementation status. Add future ideas at the bottom as `Challenge 2`, `Challenge 3`, and so on.

## Overview

| ID | Name | Type | Status |
| --- | --- | --- | --- |
| 1 | Guess the Country Word | Team / explanation game | Implemented |

---

## Challenge 1 — Guess the Country Word

### Concept

When a team lands in a country, one randomly selected player explains a secret word associated with that country. The rest of the active team has 30 seconds to guess it.

### Game flow

1. The team lands in a country and the challenge is selected from that country's pool.
2. The app randomly selects one player from the active team and asks the group to pass the phone to them (`PASS THE PHONE` with a `START` button).
3. Pressing `START` begins the 30-second countdown immediately and displays an explanation popup explaining what the player has to do.
4. During the first 7 seconds, the player reads the instructions while the countdown is already running and the popup counts down (`WORD REVEALS IN 7s...`).
5. After the explanation countdown finishes, the popup dismisses to reveal the secret word with the remaining time (~23 seconds), creating pressure to describe it immediately.
6. The selected player describes the word without saying it while their teammates guess.
7. The active team chooses `GUESSED` or `NOT GUESSED`. An expired timer automatically records `timeout`.
8. A successful guess adds 10 points to the active team's score; failure or timeout adds zero.
9. The result screen enables `NEXT TURN`.

### UI states

- **Intro:** `PASS THE PHONE`, `Give the phone to [player name]`, and `START`.
- **Playing (0-7s):** explanation popup overlay with rules briefing and `WORD REVEALS IN [N]s` countdown while the 30s timer is already ticking.
- **Playing (7-30s):** secret word revealed, `00:[N]` countdown, `GUESSED`, and `NOT GUESSED`.
- **Result:** `GUESSED! +10 POINTS`, `NOT GUESSED — 0 POINTS`, or `Time ran out`.
- **Other clients:** a non-secret in-progress message; the secret word and explanation are shown only on the active team leader's device being passed around.

### Rules

- The explainer may not say the target word or any part of it.
- The explainer may not translate or spell the target word.
- Only the active team may guess.
- The challenge is excluded when the active team has fewer than two players.
- Each of the 51 bundled countries contains exactly one copy of this challenge and six medium-to-hard country-themed words or phrases.

### Scoring

| Result | Points |
| --- | ---: |
| Guessed within 30 seconds | +10 |
| Not guessed / timer expired | 0 |

### Technical implementation

- **Input:** country stop, active team ID, and the active team's player list.
- **Selection:** deterministic challenge, player, and word selection from the roll action ID in multiplayer; equivalent seeded local selection in development games.
- **State:** `intro -> playing -> result` (with legacy fallback for `secret`).
- **Timer:** 30 seconds, started immediately when the explainer presses `START` on the pass-the-phone screen; the first 7 seconds display the explanation popup overlay before revealing the secret word for the remaining time.
- **Result:** `guessed | failed | timeout`, synchronized in `gameplay.challengeRound`.
- **Score:** successful results transactionally increase `teamProgress[teamId].challengePoints` and the displayed total score exactly once.
- **Content:** `app/GameScreen/constants/countryStops.js` owns the versioned word lists for the 51 bundled countries. Each list avoids basic country names, capitals, and overly obvious clues.
- **Persistence:** both `countries/{countryId}.challenges` and `challenges/{countryId}__guess-country-word` store the complete list in Cloud Firestore. Existing documents are batch-migrated when their `wordListVersion` is outdated.

---

## Template for new challenges

```md
## Challenge X — Name

### Concept
<Short description>

### Game flow
1. <Step 1>
2. <Step 2>

### UI states
- <Which text, buttons, or animations appear?>

### Rules
- <Rules>

### Scoring
- Success: <points>
- Failure: <points>

### Technical implementation
- Trigger:
- Input:
- State:
- Timer:
- Other:
```
