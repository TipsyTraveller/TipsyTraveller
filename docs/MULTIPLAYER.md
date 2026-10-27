# Multiplayer, Firebase, and identity

## Data ownership

| Data | Owner |
|---|---|
| Device ID, player preferences | AsyncStorage |
| Room settings, route snapshot, roster, vehicle choices | Realtime Database |
| Turn, roll, progress, challenge, roadblock, score, completion | Realtime Database gameplay record |
| Country and challenge authoring | Cloud Firestore |
| Per-frame animation and camera state | Local React/Three.js refs |

`firebaseConfig.js` exports `db` (Realtime Database) and `firestore`. The web API key
identifies the Firebase project; it is not a secret or an authorization boundary.

## Realtime Database shape

```text
games/{gameID}
  difficulty, duration, nrOfPlayers, persons
  HostName, createdAt, hostDeviceID, status, disconnectedAt?
  presence/{deviceID}: connected, teamId, isLeader, lastSeenAt
  teamModels/{team1|team2|team3}: modelId
  routeStops[]: immutable ordered room snapshot
  gameplay
    schemaVersion: 9
    sessionId, revision, phase, activeTeamId, turnNumber, updatedAt
    teamProgress/{teamId}: currentLeg, isDone, score,
      challengePoints, targetCursor, finishPosition?, detour?
      playerDrinks/{playerPushKey}: name, drinks
    currentAction: id, type, teamId, value, fromLeg, targetLeg,
      inputMethod, startedAt, movementStartsAt, movementEndsAt,
      movementPath?, detourStartStep?, detourStep?, detourSegmentType?
    challengeStop, challengeStopData, challengeId, challengeRound
    roadblock, roadblockHistory[], usedMonumentIds[]
players/{gameID}
  playerCounter
  team1|team2|team3/{pushKey}: name, isLeader, deviceID
gameContent/countryStops: mirrored content fallback
gameContent/monumentPool: mirrored GeoGuessr fallback
```

Null Firebase fields may be omitted. Empty team placeholders begin as empty strings
and become objects when players are pushed. Preserve these compatibility quirks
unless every reader and writer is migrated together.

Schema 9 adds a per-team `targetCursor`; targeted challenge creation advances it in
the same transaction that stores the selected player ID/name and outcome rules in
`challengeRound`. Reconnects therefore cannot select a different player. Schema 8
uses the roster push key as the stable player ID for drink totals. Team drink
totals are derived by summing `playerDrinks`; they are not stored separately. When an
older room is opened, its name-keyed player ledger (or team-only total) is migrated in
a gameplay transaction. Names are retained only as display snapshots, so renaming a
roster entry keeps the same total. Schema 7 stores an active detour under the affected
team's progress so turn ownership can rotate normally. In-flight schema 6 detour
waypoint indexes are normalized when their movement or challenge completes.

## Firestore content

- `countries/{stopId}`: identity, name/code/city/landmark, order, board position and
  version, accent, embedded challenges, update time.
- `challenges/{challengeDocId}`: normalized challenge fields, country relation,
  content, authoritative base `penaltySips`, type, timing/scoring/word metadata,
  order, update time.
- `geoGuessrChallenges/{locationId}`: normalized location, map position, photo URL,
  attribution, clue, and version metadata.
- `gameContent/monumentPool`: collection/version/count manifest.

`countryStopsService.js` reads Firestore first, seeds or migrates country content when
needed, and maintains localStorage/Realtime Database fallbacks. GeoGuessr content is
client-read-only: invalid or incomplete versioned content falls back to bundled data.
Country/challenge authoring remains unauthenticated for Dev Portal compatibility and
is a known development-only security risk.

## Room lifecycle

- Room codes are random four-digit strings and may start with zero. Availability is
  reserved with a transaction before the room is initialized. Final room settings
  and the host roster record are then written together in a root transaction.
- Joins transact against the game and roster together. Device duplicate detection,
  capacity validation, balanced team assignment, leader selection, insertion, and
  `playerCounter` all commit atomically.
- Lobby clients subscribe to both game and player records. The host may move a
  player without changing the player's push key, remove non-leaders, or assign a
  device-backed teammate as leader. These roster actions are transactional.
- A lobby may continue only when every required team has exactly one leader backed
  by a distinct device ID. The UI reports the first unmet requirement. Starting
  clears prior model choices and sets `status: characterSelection` transactionally.
- Each leader writes its team model. When every required team has both its valid
  leader and model, the host root transaction creates initial gameplay from the
  canonical roster and sets `status: game`.
- Rejoining an active room restores the canonical gameplay state.
- Game devices publish room-scoped presence and register an `onDisconnect` fallback.
  Leaving the game marks only that device offline; it does not erase the roster or
  canonical gameplay, so the same installation can reopen the room exactly where it
  left off.
- The current host can transfer room ownership to another connected team leader.
  If the host disconnects first, a connected team leader can claim host only while
  the stored host presence is offline.
  During gameplay, the host can also replace a disconnected team leader with a
  connected device-backed teammate without changing either player's stable roster ID.

## Identity and disconnects

There is no Firebase Authentication. A locally generated persistent `deviceID`
supports duplicate prevention, leader lookup, and same-installation host recovery,
but it is resettable and forgeable. Never use it as authorization.

Every gameplay device writes `games/{gameID}/presence/{deviceID}` and registers an
`onDisconnect` write at that path. Foreground/background transitions update the same
record so the UI can distinguish an unavailable team leader from a connected
spectator. The current host separately registers `onDisconnect` to write
`disconnectedAt`; transferring host cancels the old device's room marker and makes
the new host responsible for it. A room is treated as expired when that timestamp is
more than ten minutes old. The same host installation may rejoin, clear the marker,
and register a new disconnect handler. Rooms are not automatically deleted.

## Synchronization rules

`useMultiplayerGame.js` observes gameplay, `.info/connected`, and server-time offset.
Revision numbers and unique action IDs make replayed updates idempotent. Roll,
movement completion, roadblock choice, challenge stage/completion, score awards,
finish assignment, and restart use transactions.

Challenge rounds snapshot targeting, outcome rules, and `resolvedPenaltySips` from
the room difficulty when they are created. Result transactions record stable
`resultActionId` and `drinkAwardId` values and accept only the expected pre-result
stage, so retrying a result cannot apply its drinks twice.
Drink adjustments update the stable per-player ledger transactionally; team-wide
adjustments apply the delta once to every current roster player.

Only the active leader's UI may roll or choose manual challenge/roadblock outcomes;
only the host may restart. Any connected client may attempt idempotent movement,
challenge-timeout, GeoGuessr-timeout, and roadblock-timeout finalization after the
stored server-relative deadline, so a disconnected leader cannot stall automatic
progress. Random roll values are still generated by the active client, not trusted
backend logic.

## Security requirements and known gaps

- Realtime Database rules are not versioned in this repository; never claim deployed
  rules were verified without inspecting them.
- Firestore rules are in `firestore.rules`. GeoGuessr content denies client writes;
  country/challenge authoring currently permits public writes.
- Before public deployment, add Authentication and rules that protect room reads,
  host actions, roster changes, model choices, and gameplay actions.
- Do not commit credentials, service accounts, private keys, or signing material.

Lobby readiness currently uses the presence of a stable device ID to establish that
a leader has a controlling phone. Live online/offline presence is added separately
by the connection and recovery flow.
