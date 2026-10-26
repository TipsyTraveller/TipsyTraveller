# Challenge system

## Selection and ordinary challenges

Each country stop owns a challenge pool. Penalty-bearing challenge records contain
an authoritative numeric `penaltySips` base value alongside country, title, prompt,
display copy, accent, and optional type/timing/scoring fields. Sip amounts are never
derived from display copy. The shared resolver applies the room difficulty multiplier
(`easy` ×1, `medium` ×2, `hard`/Lethal ×3) and caps one event at nine sips. In
multiplayer, movement completion deterministically selects from the snapshotted stop
using the action ID and stores both `challengeStop` and `challengeId` so every client
shows the same content.

Ordinary cards are social instructions: they do not record pass/fail or change score.
Only the active leader may complete them. Completion transactionally closes the card,
selects the next unfinished team, clears the roll, and enters `waiting` (or `done`).

The React Native `ChallengePopup` is a two-part travel ticket. It animates from the
landed 3D marker, flips from branded back to front, and tears away before calling
`onComplete`. Keep the action disabled until the opening animation finishes and do
not let a parent render restart animations. During the overlay, the 3D canvas is
paused to reduce mobile contention.

## Guess the Country Word

Every bundled country includes this typed challenge with six country-themed entries,
a 30-second duration, and 10 success points. It is excluded for one-player teams.
The action ID deterministically selects both explainer and secret word.

The active leader device runs `intro → playing → result`: pass the phone, press
`START`, show a seven-second explanation overlay while the timer runs, then reveal
the secret for the remaining time. Other clients never receive a secret-display UI.
The synchronized round snapshots `resolvedPenaltySips`. The result is `guessed`,
`failed`, or `timeout`; only `guessed` awards 10 points, while failure or timeout
assigns the resolved penalty to the describer, exactly once through an idempotent
transaction. Next Turn remains disabled
until a result exists.

## GeoGuessr Place Duel

Every bundled country includes `geo-guessr-duel` (`type: geoGuessr`). It can be
selected from the normal pool and is guaranteed as a Roadside Duel when the active
vehicle lands on or passes a parked team.

The version-5 bundled pool has 67 European photo locations across all 51 catalogue
countries. Each record includes stable legacy-compatible ID, country/city/name, clue,
category, `subjectType`, longitude/latitude, board position, curated Wikimedia photo
URL/source, author, and license. The duel map and target positions share one Web
Mercator projection; SVG and board positions are derived from geographic coordinates
when content is normalized so cached or remote values cannot drift from the reveal map.
Multiplayer tracks `usedMonumentIds`; selection excludes both prior
locations and the landed country. Place/landmark subject types alternate when
possible. Firestore and fallback storage are described in
[MULTIPLAYER.md](MULTIPLAYER.md).

Stages:

1. `photo` (18 seconds): teams inspect the real photo, clue, and attribution. A failed
   download is shown as unavailable; never substitute an illustration as the clue.
2. `pinning` (20 seconds): leaders zoom/pan the Europe SVG map, place a guess, and
   lock it. Bot teams receive generated proximity guesses; local games pass the
   device between teams.
3. `result`: reveal the target, connect guesses, display distances, award the closest
   team 15 points, and assign the difficulty-scaled two-sip base penalty to losing teams.

`challengeRound` stores the selected player/word or duel stage, server-adjusted start
time, results, awarded points, the resolved penalty, and the drink award ID. Stage,
score, and drink transitions are transactional and idempotent. Local development
games follow the same sequence without Firebase.

## Content and UI extension points

- Put reusable selection and fallback logic in `constants/challenges.js` and
  `constants/monumentPool.js`, not in presentation components.
- Add authored content through the established stop/challenge data shape. Preserve
  IDs used by existing rooms.
- `getChallengeForStop` uses stop `code`, `city`, and optional `landmark`, with
  `STOP_VISUALS` fallback for legacy IDs. Country flag palettes come from
  `COUNTRY_FLAGS`.
- Add city silhouettes in `components/CityLandmark.js` and their mapping in
  `STOP_VISUALS`; absence of a landmark must remain valid.
- See [DEV_PORTAL.md](DEV_PORTAL.md) for web authoring and
  [TESTING.md](TESTING.md) for synchronized challenge checks.
