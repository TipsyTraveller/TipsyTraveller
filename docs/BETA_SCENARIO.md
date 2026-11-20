# Beta scenario contract (schema 1)

Package A provides the pure content API in
`app/GameScreen/constants/betaScenario.js`. Package C connects it to the Beta Test
tab, local drafts, preview and real lobby creation. Fixed in-game selection,
special-event reservations and rematch preservation remain pending package B.

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
creation. `betaDraft.js` owns route/challenge/team-content edits and the
`tipsytraveller_beta_draft_v1` AsyncStorage record (schema version, scenario, host
name and two guest names per team). Invalid edits leave the prior draft intact;
corrupt storage is not silently overwritten. Restore Preset resets the scenario
while preserving the entered names; Save Draft explicitly persists the result.

`BetaTestTab.js` provides a read-only route/content preview using a detached
snapshot, with Team 1/2/3 views and photo attribution. It does not launch a playable
GameScreen preview; that integration belongs to B. It is host preparation and
shows secret answers. Rooms currently use Easy difficulty and the host's timing
defaults, with `nrOfPlayers: '9-12'` retained for three-team compatibility and an
effective beta capacity of exactly nine.

`betaRoomService.js` creates seven registrations through the existing code
reservation service: host as Team 1 leader, plus two device-less guests on each
team. `betaLobbyState.js` supplies the same pure reducer used by Firebase and the
transaction tests. Beta joins, host roster mutations, lobby start and final game
initialization run transactions at the common database root so `games/{id}` status
and `players/{id}` roster are checked together on every retry. Joins fill only a
vacant leader slot; same-device retries/reconnects do not insert another player.
The service holds a temporary root subscription until the transaction finishes,
so a fresh phone has complete local input before the first callback. It releases
that listener on success, rejection and errors; deployed root read/write
permissions still need live verification.
Local additions reserve one place per team for a leader phone. Start requires
exactly nine players, three per team and three distinct non-bot leader devices.

The ordinary room-settings editor refuses beta changes before route generation
and again inside its transaction. Dev bot/fill/vehicle shortcuts reject beta
rooms. Room navigation passes the saved scenario to vehicle selection and the
game. Ordinary rooms retain their existing capacity, join and start paths.

B must still use the stored route/content in gameplay and rematch without
catalogue merging or route regeneration. Rematch must reset gameplay and create
a new session ID while copying this envelope. The pure package A helpers do not
create session IDs, reset gameplay or write Firebase.

## Verification

Run `npm run test:beta-content` for package A's Node tests. They cover preset
geometry/content, invalid editor input, uniqueness, and independent snapshots,
including serialized copies for preview/room/reconnect/rematch consumers. Actual
gameplay integration, APK bundling and physical-device tests belong to B/D and
are not established by these pure tests.

Run `npm run test:beta-lobby` for C's creation, editor, storage, readiness and
transaction tests. An in-memory optimistic transaction harness exercises two
concurrent joins, same-phone duplicates, the tenth player, and roster/start races
in both commit orders. It runs the production reducer/transaction wrapper, not
the Firebase SDK or deployed rules. Browser smoke checks cover the portal,
required names, saved-draft reload, exact team content, invalid geometry and
responsive preview. Live Firebase joins, root-transaction permissions and the
three-device flow still require verification.
