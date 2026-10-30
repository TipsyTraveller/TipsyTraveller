# Multiplayer, Firebase, and identity

## Data ownership

| Data | Owner |
|---|---|
| Device ID, saved profile, career sync checkpoints | AsyncStorage |
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
  roomRules/{challengeTimerPace, fastDiceAnimations, autoAdvance}
  HostName, createdAt, hostDeviceID, status, disconnectedAt?
  teamModels/{team1|team2|team3}: modelId
  teamNames/{team1|team2|team3}: displayName
  routeStops[]: ordered snapshot, immutable during one session and replaced on rematch
  gameplay
    schemaVersion: 10
    sessionId, revision, phase, activeTeamId, turnNumber, updatedAt
    teamProgress/{teamId}: currentLeg, isDone, score,
      challengePoints, finishPosition?, detour?
      playerDrinks/{playerPushKey}: name, drinks
    careerCounters/{playerPushKey}: diceRolls, challengesCompleted, toursCompleted
    currentAction: id, type, teamId, value, fromLeg, targetLeg,
      inputMethod, startedAt, movementStartsAt, movementEndsAt,
      movementPath?, detourStartStep?, detourStep?, detourSegmentType?
    challengeStop, challengeStopData, challengeId, challengeRound
    roadblock, roadblockHistory[], usedMonumentIds[], usedChallengeKeys[]
    targetCursors/{teamId:role}: next roster index
players/{gameID}
  playerCounter
  team1|team2|team3/{pushKey}: name, isLeader, deviceID
gameContent/countryStops: mirrored content fallback
gameContent/monumentPool: mirrored GeoGuessr fallback
```

Null Firebase fields may be omitted. Empty team placeholders begin as empty strings
and become objects when players are pushed. Preserve these compatibility quirks
unless every reader and writer is migrated together.

Schema 9 adds monotonic per-session career counters keyed by the stable roster player
ID. A saved local profile synchronizes only its matching roster entry into lifetime
AsyncStorage statistics, using per-session checkpoints so reconnects and rematches do
not replay increments. Session sips continue to come from the canonical drink ledger.

Schema 8 uses the roster push key as the stable player ID for drink totals. Team drink
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
  checked client-side, so simultaneous creators can theoretically collide.
- Creation writes settings, the route snapshot, host metadata, `status: lobby`, team
  placeholders, and the host player record.
- Lobby clients subscribe to both game and player records. Starting clears prior
  model choices and sets `status: characterSelection`.
- Each leader writes its team model. When all required teams are ready, the host
  transaction creates initial gameplay and sets `status: game`.
- The last active room code is stored locally and offered as a Resume action on Home.
  Rejoining from Resume or the normal Join screen restores the canonical state when
  the same local device is already present in the roster.

## Identity and disconnects

There is no Firebase Authentication. A locally generated persistent `deviceID`
supports duplicate prevention, leader lookup, and same-installation host recovery,
but it is resettable and forgeable. Never use it as authorization.

The host registers `onDisconnect` to write `disconnectedAt`. A room is treated as
expired when that timestamp is more than ten minutes old. The same host installation
may rejoin, clear the marker, and register a new disconnect handler. Rooms are not
automatically deleted.

## Synchronization rules

`useMultiplayerGame.js` observes gameplay, `.info/connected`, and server-time offset.
Revision numbers and unique action IDs make replayed updates idempotent. Roll,
movement completion, roadblock choice, challenge stage/completion, score awards,
finish assignment, and rematch use transactions. The host rematch transaction updates
the room route and clean gameplay session atomically, so every client observes the
same itinerary and reset state without recreating the room.

Typed challenge rounds snapshot `resolvedPenaltySips` from the room difficulty when
they are created. Result transactions record a stable `drinkAwardId` and accept only
the expected pre-result stage, so retrying a result cannot apply its drinks twice.
Drink adjustments update the stable per-player ledger transactionally; team-wide
adjustments apply the delta once to every current roster player.

Roster entries may include a badge and a persistent local `profileId`. The latter is
used only to associate that device's saved profile with career statistics; names are
never used to merge career records.

The host snapshots challenge timer pace, fast-dice animation mode, and auto-advance
into `roomRules` at room creation. Timer durations and roll deadlines derive from
that snapshot on every client. Typed challenge results store `resultAt` only after
score and drink changes are committed; auto-advance counts down from that timestamp,
and its cancellation flag is written transactionally into the challenge round.

Only the active leader's UI may roll or complete a challenge; only the host may
start a rematch. Any connected client may attempt idempotent movement finalization after the
stored deadline so one disconnected device cannot stall the room. Random roll values
are still generated by the active client, not trusted backend logic.

## Security requirements and known gaps

- Realtime Database rules are not versioned in this repository; never claim deployed
  rules were verified without inspecting them.
- Firestore rules are in `firestore.rules`. GeoGuessr content denies client writes;
  country/challenge authoring currently permits public writes.
- Before public deployment, add Authentication and rules that protect room reads,
  host actions, roster changes, model choices, and gameplay actions.
- Do not commit credentials, service accounts, private keys, or signing material.
