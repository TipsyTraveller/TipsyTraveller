# Beta scenario contract (schema 1)

Package A provides the pure content API in
`app/GameScreen/constants/betaScenario.js`. Gameplay and portal integration are
pending packages B and C; these helpers alone do not enable beta rooms in the app.

## Shared data and function boundaries

The editable draft and the snapshot have the same envelope:

```text
routeStops[]                         existing ordered country snapshots
betaScenario
  schemaVersion: 1
  presetId: nine-friends-2026-11-20
  playerCount: 9
  stops/{countryId}
    challenge                        complete challenge record, shared by all teams
    contentByTeam/{team1|team2|team3}  complete fixed-content record
```

Only interior stops have plans. Start and Greece have none. All three teams use
the chosen challenge at a stop, with their own minigame content. Fixed-content
records are discriminated by `type`:

| Type | Snapshot fields |
|---|---|
| `ordinary` | No extra content; use the shared challenge |
| `countryWordGuess` | `word`, `wordListVersion` |
| `personalMatch` | `question` (including four options), `poolVersion` |
| `geoGuessr` | `monument` (including coordinates, board position, photo and attribution), `poolVersion` |
| `sizeItUp` | `round` (including both complete measured items), `poolVersion` |

- `createBetaPreset()` returns a fresh editable draft from bundled content in
  fixed route/team order. It never reads remote content, seeds or used-content lists.
- `getBetaContentOptions(stop, challengeId, { difficulty })` returns detached
  `{ id, label, fixedContent }` options for the editor. Ordinary cards have no options.
- `createBetaStopPlan({ stop, challengeId, contentIdsByTeam, difficulty })` snapshots
  an editor selection. Typed challenges require one selected option ID per team.
  The caller updates both the route and `betaScenario.stops` when editing stops,
  then validates the entire draft before accepting it.
- `validateBetaScenario(draft, { difficulty })` returns `{ valid, errors }` with
  `{ path, code, message }` errors. Default difficulty is `easy`; Lethal-only
  questions require `hard`/`lethal`. Validation reads the snapshot itself, never
  replacing its content from the current catalogue or pools.
- `createBetaSnapshot(draft, options)` validates and deep-copies the envelope;
  invalid input throws an error with `code: INVALID_BETA_SCENARIO` and `errors`.
  Returned objects are independent, JSON/Firebase-compatible data, not live links
  to the draft or content pools. Store both fields together at room creation.
- `getBetaPlannedChallenge(betaScenario, stopId, teamId)` returns a detached
  `{ challenge, fixedContent }`, or `null` for ordinary rooms/start/finish.
- `getBetaReservedMonumentIds(betaScenario)` returns all planned photo IDs.

Three-player compatibility, unique countries, mandatory Belgium/Italy, allowed
edge-country start, Greece finish, and existing route geometry are required.
The preset has 18 stops; edited routes may differ in length. Questions, photos,
comparison pairs and words must not repeat across planned stop/team slots.
Ordinary instructions intentionally repeat for all teams. A photo cannot depict
its landing country. Invalid or incomplete content is rejected, never silently
rerolled. The preset uses the existing Norway `norway-captain-coordination` card
(display title `Captain {targetPlayerName}`).

## Integration ownership and remaining work

| Package | Files and responsibilities |
|---|---|
| A | `constants/betaScenario*.js`, content tests, this contract and relevant documentation |
| B | `constants/challenges.js`, `GameScreen.js`, multiplayer hook/state; round builders accept optional `fixedContent` (word builder: final positional argument; other builders: options field) |
| C | Dev Portal, draft storage, navigation, room/roster/settings services and screens |
| D | Shared test harness/build scripts, Android configuration and APK/device verification |

B must check roadblock/detour/roadside-duel precedence before planned lookup. A
planned lookup bypasses used-content selection. Additional GeoGuessr rounds must
exclude reserved photos from the actual candidate pool, including pool-exhaustion
fallbacks; merely adding them to `usedMonumentIds` is insufficient. Existing
timers, role rotation, result transactions and score/drink rules remain authoritative.

C stores one local draft and uses `createBetaSnapshot` for preview and room
creation. B/C must use the stored route/content on reconnect and rematch, without
catalogue merging or route regeneration. Rematch resets gameplay and creates a new
session ID while copying this envelope. The helpers do not create session IDs,
reset gameplay, write Firebase, or validate the live roster. C must atomically
enforce nine players, three per team and three distinct leader devices, with seven
initial registrations and two real joins. Rooms without `betaScenario` retain
existing behavior. No live room contract is changed until B/C wire these paths.

## Verification

Run `npm run test:beta-content` for package A's Node tests. They cover preset
geometry/content, invalid editor input, uniqueness, and independent snapshots,
including serialized copies for preview/room/reconnect/rematch consumers. Actual
consumer integration, concurrency, APK bundling and physical-device tests belong
to B/C/D and are not established by these pure tests.
