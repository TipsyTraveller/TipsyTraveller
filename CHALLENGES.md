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
2. The app randomly selects one player from the active team and asks the group to pass the phone to them.
3. After `I'M READY`, the selected player sees one randomly selected country-themed word.
4. Pressing `START` hides the word and begins the 30-second countdown.
5. The selected player describes the word without saying it while their teammates guess.
6. The active team chooses `GUESSED` or `NOT GUESSED`. An expired timer automatically records `timeout`.
7. A successful guess adds 10 points to the active team's score; failure or timeout adds zero.
8. The result screen enables `NEXT TURN`.

### UI states

- **Intro:** `PASS THE PHONE` and `Give the phone to [player name]`.
- **Secret word:** `YOUR SECRET WORD`, the country-themed word, the explanation rules, and `START`.
- **Playing:** a `00:30` countdown, hidden-word message, `GUESSED`, and `NOT GUESSED`.
- **Result:** `GUESSED! +10 POINTS`, `NOT GUESSED — 0 POINTS`, or `Time ran out`.
- **Other clients:** a non-secret in-progress message; the secret word is shown only on the active team leader's device being passed around.

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
- **State:** `intro -> secret -> playing -> result`.
- **Timer:** 30 seconds, started only after the explainer presses `START`.
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
