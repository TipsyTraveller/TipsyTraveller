# TipsyTraveller: Game and Architecture Documentation

> Detailed reference for the current implementation of TipsyTraveller.
>
> Last reviewed against the source code: 25 October 2026.

## Table of contents

1. [Project overview](#1-project-overview)
2. [Current implementation status](#2-current-implementation-status)
3. [Player experience and game rules](#3-player-experience-and-game-rules)
4. [Application flow](#4-application-flow)
5. [Gameplay state machine](#5-gameplay-state-machine)
6. [Technical architecture](#6-technical-architecture)
7. [Screen-by-screen reference](#7-screen-by-screen-reference)
8. [3D board architecture](#8-3d-board-architecture)
9. [Dice implementation](#9-dice-implementation)
10. [Vehicle movement](#10-vehicle-movement)
11. [Challenges](#11-challenges)
12. [Firebase and multiplayer data](#12-firebase-and-multiplayer-data)
13. [Navigation contracts](#13-navigation-contracts)
14. [Assets and visual design](#14-assets-and-visual-design)
15. [Native projects and platform configuration](#15-native-projects-and-platform-configuration)
16. [Running and building the project](#16-running-and-building-the-project)
17. [Testing guide](#17-testing-guide)
18. [Known limitations and technical debt](#18-known-limitations-and-technical-debt)
19. [Safe extension points](#19-safe-extension-points)
20. [File and component reference](#20-file-and-component-reference)

---

## 1. Project overview

TipsyTraveller is a mobile party board game built around a configurable road trip. Players join a four-digit room, are divided into teams, select a vehicle, roll a 3D die, travel between destinations on a rendered map, and perform a location-themed challenge after each stop.

The route, destinations, map artwork, and challenge content should be treated as replaceable game data rather than a permanent list. More locations, alternate routes, and new challenge types can be added as the game grows.

The presentation combines two rendering systems:

- React Native renders screens, forms, buttons, lobby content, the HUD, and challenge cards.
- Three.js, through React Three Fiber and Expo GL, renders the map, route, markers, vehicles, camera, and interactive die.

Firebase Realtime Database provides room creation, joining, team rosters, lobby updates, host reconnection metadata, selected team models, and synchronized live gameplay state. AsyncStorage gives each installation a persistent anonymous device identifier.

### Product identity

- App name: `TipsyTraveller`
- Package version: `1.0.0`
- iOS bundle identifier: `com.nielspet.TipsyTraveller`
- Android application ID: `com.nielspet.TipsyTraveller`
- Firebase project: `tipsy-travellers`
- EAS project ID: `fc6c433d-6c8c-4f79-b758-1d6b47ed5ee9`
- Primary visual palette:
  - Cream: `#FAF3E0` / `#FFF1CD`
  - Dark blue: `#2C3E50` / `#223144`
  - Teal: `#1BA39C`
  - Red: `#D71920`
  - Yellow: `#FFD700`
- Primary typefaces: Dogica Pixel and Dogica Pixel Bold

### Main technology stack

| Area | Technology |
|---|---|
| Application framework | Expo SDK 58 |
| UI framework | React Native 0.88 / React 19.3 |
| JavaScript engine | Hermes |
| Native architecture | React Native New Architecture enabled |
| Navigation | React Navigation stack |
| 3D rendering | Three.js, React Three Fiber, Drei, Expo GL |
| Realtime backend | Firebase Realtime Database (live rooms, lobbies, turns) |
| Content database | Cloud Firestore (`countries`, `challenges`, and `geoGuessrChallenges` collections, plus the `gameContent/monumentPool` manifest) |
| Local identity | AsyncStorage |
| Animation | React Native Animated and Lottie |
| Orientation | Expo Screen Orientation |
| Native builds | Xcode/CocoaPods and Gradle |
| Cloud builds | Expo Application Services (EAS) |

---

## 2. Current implementation status

This document distinguishes between the visible product concept and what the current code actually does.

### Implemented

- Home screen with create-game and join-game routes.
- Three-step game setup: difficulty, duration, and player range.
- Four-digit room creation with collision checking.
- Anonymous device identity persisted in AsyncStorage.
- Room joining and automatic team balancing.
- Two-team games for the `1-4` and `5-8` settings.
- Three-team games for the `9-12` setting.
- Realtime lobby roster updates.
- Basic host reconnection/expiration metadata.
- Team-leader vehicle selection with a rotating 3D preview.
- Independent team-leader choices with shared readiness and synchronized entry into the game.
- Landscape 3D board.
- Interactive 3D die with pickup, drag, throw, bounce, and result animation.
- Compact tracker button for immediately generating a roll.
- Animated vehicle movement along a curved route.
- Animated country markers and camera following.
- Configurable location challenge cards.
- Duration-driven routes: every room samples a fresh, geographically ordered 6, 9, or 12-stop itinerary from Belgium to Greece.
- The bundled long-route catalogue contains one stop for each of 51 European countries under an inclusive convention: sovereign states wholly or partly in Europe plus Kosovo. Each bundled stop has a country code, representative city, flag palette, and at least one original challenge.
- Web-only country-stop authoring in the Dev Portal, including map placement, reordering, removal, and per-stop challenge pools backed by Cloud Firestore (`countries` and `challenges` collections) with local cache and Realtime Database fallback.
- Firebase-synchronized turns, die results, route progress, challenges, completion, and host restart.
- Firebase-synchronized team scores and finish positions, with a final ranked winner board.
- Firebase-synchronized random roadblocks for teams leading by at least two stops, with a difficult break-through challenge or a longer detour through countries outside the room itinerary.
- A thin light-blue route line that connects every selected stop on the board from the moment GameScreen opens.
- Compact right-side race progress tracker with every team's vehicle position, the finish line, and the roll action while waiting for a throw.
- Active-game re-entry through the room PIN with canonical state restoration.
- Dedicated interactive Player Account screen (`AccountScreen`) with username persistence, party titles/badges, preferred vehicles, tour career statistics, and anonymous device ID management.
- Dedicated Game Settings screen (`SettingsScreen`) with audio/haptics toggles, party drinking modes (classic vs sips & dares), challenge timer pace, 3D board options, and interactive rules guide.
- Interactive retro arcade Header buttons for Account and Settings with vector SVG iconography and tactile press states.
- iOS 27/Xcode 27 development support through Device Hub.

### Partially implemented

- Difficulty is stored in Firebase but does not modify gameplay.
- The lobby `RULES` button opens a concise rules summary.

### Development-mode behavior

`app/app/devGameRoute.js` contains `START_ON_DEV_GAME_SCREEN = false`, so development and production builds start by default on `Home`.

In development mode, a floating on-screen **Dev Lab** button is rendered across all screens (managed by `app/shared/dev/DevPortal.js`), offset to the left of right-hand header icons and the in-game race tracker so all interactive buttons remain accessible. Long-pressing the badge or selecting a position in the portal cycles its corner placement. The portal uses a responsive dark tool panel with explicit current-screen and room context, icon-and-label tabs, larger touch targets, and accessible tab/close semantics. Its presence is controlled by:

1. `EXPO_PUBLIC_ENABLE_DEV_PORTAL` in `.env` or `.env.local` (set to `true` or `false`).
2. `__DEV__` React Native global flag (fallback when the env variable is omitted).

The Dev Portal provides four cross-platform capability suites plus one web-only authoring suite:

- **Screens / Quick Start**: Instant 1-tap navigation to `GameScreen` with mock 2-team or 3-team configurations (zero Firebase/lobby setup required), mock `CharacterSelection`, live Firebase test room creation directly to `LobbyScreen`, or arbitrary app screens (`Home`, `CreateGameScreen`, `HostName`, `JoinGameScreen`).
- **Multiplayer & Bots**: Detects or accepts any 4-digit game PIN and provides 1-tap lobby filling (`autoFillLobby`), adding bot players to specific teams (`+ Bot Team 1/2/3`), auto-assigning default vehicles to unready teams in Firebase (`readyUpTeams`), and clearing added test bots without needing multiple physical devices or manual database edits.
- **Board & Game Tools**: Allows forcing exact dice roll values (1 to 3) to test specific travel legs and stop arrival animations, driving the active turn's team directly to any country stop on the active route followed by opening its challenge card, skipping active challenges or roadblock challenges immediately to advance turn state, and resetting board state.
- **Countries (web only)**: Lists the Firestore-backed master stop catalogue in driving order, with route-length guidance, coordinate metadata, and visually grouped stop/challenge controls. Developers can reorder or remove stops, add and remove challenges, start a map-placement flow for a new stop, or fine-tune an existing point. Removing a stop requires confirmation and explains that existing room route snapshots are unchanged. When moving a point, the camera centers on the target country, the marker bounces in glowing cyan with an animated beacon wave, vertical beam, and floating billboard name badge, other pins are dimmed, hovering over any pin surfaces its country name, and the 3D dice is hidden so the board and country targets remain fully visible and clickable. Pressing anywhere on the map immediately updates the marker's position optimistically and persists the coordinates as a single-document update to Cloud Firestore (`countries/{stopId}`) alongside the local cache and Realtime Database fallback. The tab and placement UI are not exposed on iOS or Android.
- **Identity & Tools**: Displays the persistent anonymous `deviceID` from AsyncStorage, supports 1-tap device ID regeneration to simulate fresh installations, and displays runtime environment flags. Clearing all local application data requires confirmation and identifies the account, settings, identity, and Dev Portal preferences that will be reset.

The development mock game assigns room ID `DEV-INSTANT` or `DEV-MOCK`. Instant GameScreen shortcuts load the current Firebase-authored catalogue and use the 12-stop long itinerary by default; matching authored stop edits remain visible after a browser refresh. If the catalogue cannot be read, the content service falls back to bundled defaults. The Dev Portal's country authoring tools still show the complete catalogue, while its board tools use the active duration itinerary. Live multiplayer rooms retain their immutable room route snapshot.

---

## 3. Player experience and game rules

### Intended session

1. One player creates a game and becomes the host and Team 1 leader.
2. The host chooses difficulty, duration, and a player-count range.
3. The host enters a name and receives a four-digit game ID.
4. Other players enter that ID and a username.
5. The backend assigns joining devices to the least populated valid team.
6. The host sees the realtime team roster and starts the game when the minimum number of players is present.
7. Each team leader selects a vehicle.
8. Teams take turns rolling a die with results from 1 through 3.
9. A team advances by the rolled number of route stops, capped at the final stop.
10. On a non-final landing, the active team performs the displayed country challenge.
11. Pressing `DONE / NEXT TURN` passes play to the next unfinished team.
12. Finished teams are skipped in later turn rotation.
13. Each route leg advanced earns 10 points. Finishing adds 30 points for first, 15 for second, and 5 for third.
14. The game ends after every team reaches Greece and shows the ranked winner board.

### Team count rules

| Player setting | Teams | Room capacity | Minimum to start |
|---|---:|---:|---:|
| `1-4` | 2 | 4 | 2 |
| `5-8` | 2 | 8 | 2 |
| `9-12` | 3 | 12 | 3 |

The host is inserted into Team 1 as its leader. In a two-team room, the first joining player assigned to Team 2 becomes Team 2’s leader. In a three-team room, the first member of any empty team becomes that team’s leader.

### Route and stop numbering

The board route is an ordered collection of destination coordinates joined by travel legs. Every new room starts in Belgium and finishes in Greece. Duration sets the stop count, while one of several Atlantic, Alpine, Central, or Northern European corridors and evenly distributed stops within it are selected randomly:

- Short: 6 stops, sampling four intermediate countries across the selected corridor.
- Medium: 9 stops, sampling seven intermediate countries across the selected corridor.
- Long: 12 stops, sampling ten intermediate countries across the selected corridor.

Stop index `0` is the initial position. Every following index represents another destination along the route. Intermediate stops may resolve to a challenge, while the final stop completes that team’s journey. The exact number of stops and their names are content choices and can change without altering the basic turn state machine.

The editable master catalogue lives in Cloud Firestore (`countries/{stopId}` and `challenges/{challengeId}`) with a mirrored fallback at Firebase Realtime Database `gameContent/countryStops` and `localStorage` (`tipsy_authored_country_stops_v2`). Creating a room randomly samples a duration-sized corridor and copies it into `games/{gameID}/routeStops`; removed intermediate catalogue countries are excluded from selection, authored content and positions are retained, and the required Belgium/Greece endpoints have bundled fallbacks. This snapshot prevents later random calls or authoring changes from altering an active room. `constants/countryStops.js` supplies the route corridors, sampling logic, and 51-country catalogue fallback, while `constants/route.js` builds the runtime Three.js route model from the snapshot. Existing room snapshots keep their content and order. Former Western Europe snapshots are remapped into the widened viewport, while known Europe stops carrying an older or missing `positionVersion` receive the current bundled pin coordinates at load time.

### Roll behavior

- Rolls are integers from 1 through 3, including the physical die, tracker shortcut, synchronized action validation, and Dev Portal force-roll controls.
- Movement cannot overshoot the finish.
- Landing at the finish immediately marks that team done.
- Landing before the finish opens a challenge.
- There is no collision rule; multiple teams may occupy the same stop. A stop's marker is hidden while one or more cars are parked on it and reappears as soon as the last car starts moving away. Co-located vehicles use center, left, and right parking slots. When a moving vehicle passes a team parked at an intermediate stop, it performs a visual kickflip over that vehicle without changing either team's gameplay state.
- There are no shortcuts, reverse movement, bonus rolls, or stored penalties in the current code.
- Ordinary challenge penalties are social instructions only. The `Guess the Country Word` challenge records `guessed`, `failed`, or `timeout` and awards 10 points for a successful guess.
- A team's live score is `currentLeg × 10 + challengePoints`, plus its podium bonus after finishing. Finish order is assigned transactionally and remains the competition tiebreaker represented by the bonus.

### Roadblock events

- A roadblock is eligible only when the active team is at least two route stops ahead of the closest unfinished opponent, has already reached route leg 2, and is not moving to the finish.
- Eligible rolls use a deterministic 38% check based on the synchronized action ID. The same team cannot receive another roadblock for at least three turns.
- The roll pauses in a synchronized `roadblock` phase before vehicle movement. Every client sees the same smaller 3D barrier, the same difficult challenge, and a gold preview route through two countries omitted from the room's original itinerary. The overview camera frames the full alternate route, the choice card names both countries, and the temporary stops use the normal 3D location pins.
- The active team leader may start the timed difficult challenge. Marking it complete removes the barrier and travels along the original route. Choosing the detour, or letting the challenge timer expire, keeps the barrier in place and splits travel into three synchronized segments: each hidden country becomes a temporary stop with its own standard country challenge, then the vehicle rejoins the rolled destination. Canonical route progress is awarded only after that final arrival.
- Detour countries are temporary challenge stops for that move. They do not rewrite the immutable room route snapshot or award extra route-progress points; their standard authored challenges are stored with the synchronized roadblock event so every client shows the same content.

---

## 4. Application flow

```mermaid
flowchart TD
    Entry[index.js] --> App[App navigator]
    App -->|Development flag true| DevGame[GameScreen with mock data]
    App -->|Normal mode| Home[Home]
    Home --> Create[Create Game]
    Home --> Join[Join Game]
    Create --> HostName[Enter host name]
    HostName -->|Create Firebase room| Lobby[Lobby]
    Join -->|Validate room and join team| Lobby
    Lobby -->|Host sets status to characterSelection| Character[Character Selection]
    Character -->|Every team leader selects a model| Ready[All teams ready]
    Ready -->|Host transaction sets status to game| Game[GameScreen]
    Game --> Roll[Roll die]
    Roll --> Move[Move vehicle]
    Move -->|Non-final stop| Challenge[Country challenge]
    Challenge -->|Done| Next[Next unfinished team]
    Move -->|Final stop| Next
    Next -->|Teams remain| Roll
    Next -->|All teams finished| Complete[Ranked winner board]
    Complete -->|Restart| Game
```

### Navigation stack

The root `Stack.Navigator` contains:

1. `Home`
2. `CreateGameScreen`
3. `HostName`
4. `JoinGameScreen`
5. `LobbyScreen`
6. `GameScreen`
7. `CharacterSelection`
8. `AccountScreen`
9. `SettingsScreen`

Every stack header is hidden; each screen supplies its own header or controls. The application root is wrapped in `GestureHandlerRootView` to coordinate gesture recognizers across React Navigation, and screens with full-length vertical scrolling (`LobbyScreen`, `AccountScreen`, `SettingsScreen`) set `gestureEnabled: false` to ensure swipe recognizers do not conflict with or block scrollable content.

---

## 5. Gameplay state machine

`GameScreen` owns the game rules and visual state machine. In a real room, a versioned Firebase gameplay record is authoritative and `GameScreen` animates each client toward that shared state. Development mock games keep the original local-only controller path.

```mermaid
stateDiagram-v2
    [*] --> waiting
    waiting --> rolling: 3D die picked up/thrown
    waiting --> moving: HUD Roll Dice button
    rolling --> moving: die animation reports result
    rolling --> roadblock: eligible lead + deterministic chance
    roadblock --> moving: challenge complete or detour chosen
    moving --> challenge: arrive at a temporary detour country
    challenge --> moving: complete a temporary detour challenge
    moving --> challenge: vehicle lands before finish
    moving --> waiting: vehicle finishes; another team remains
    moving --> done: vehicle finishes; all teams done
    challenge --> waiting: Done / Next Turn
    challenge --> done: no unfinished team remains
    done --> waiting: Restart
```

### State values

| State | Meaning | Input allowed |
|---|---|---|
| `waiting` | Active team may roll | 3D die and tracker roll button enabled |
| `rolling` | 3D die is animating | Additional rolls blocked |
| `roadblock` | Leading team chooses a hard challenge or previewed detour | Active team leader chooses; other clients spectate |
| `moving` | Active vehicle is travelling | Roll controls blocked |
| `challenge` | Landing challenge is visible | Only challenge completion advances play |
| `done` | Every team has finished | Restart button enabled |

### State owned by `GameScreen`

| Value | Purpose |
|---|---|
| `state` | Current phase listed above |
| `activeTeamIndex` | Index of the team whose turn it is |
| `lastRoll` | Most recent die result |
| `remainingMoves` | Remaining route legs in the current move, decremented as intermediate stops are crossed |
| `movingPieceId` | Team ID whose model should animate |
| `moveStartDelay` | Minimum delay before driving begins, used to let a physical die result leave the screen first |
| `moveStartLeg` | Starting leg of the active move used to lay out the animated route path |
| `passedLeg` | Latest stop crossed during the current move |
| `isCarDriving` | Whether the path reveal has finished and the active vehicle is currently driving |
| `moveTargets` | Map of team ID to destination leg |
| `currentChallenge` | Challenge record for the latest non-final landing |
| `teamProgress` | Per-team `{ currentLeg, isDone, score, challengePoints, finishPosition }` data |
| `pieceRefs` | React refs for each Three.js vehicle group, used by the camera |
| `activeCarProgressRef` | React ref tracking the active vehicle's normalized curve progress so the route ribbon trims behind the car |

### Turn rotation

`getNextActiveTeamIndex` scans forward, wraps around, and returns the next team whose `isDone` flag is false. If no unfinished team exists, it returns `null` and the game enters `done`.

### Reset behavior

In a multiplayer room, only the host can restart. Restart transactionally replaces the Firebase gameplay record with a new session ID and initial team progress, which resets every connected client. Development mock games still restart locally.

---

## 6. Technical architecture

### High-level layers

```mermaid
flowchart LR
    UI[React Native screens and overlays]
    Controller[GameScreen state controller]
    Scene[React Three Fiber scene]
    Backend[Firebase Realtime Database]
    Storage[AsyncStorage device identity]
    Native[Expo / iOS / Android native shells]

    UI --> Controller
    Controller --> Scene
    UI <--> Backend
    UI <--> Storage
    Native --> UI
    Scene --> GL[Expo GL / Three.js]
```

### Responsibilities

- `index.js` registers the root React component through Expo.
- `app/app/app.js` loads fonts and owns navigation.
- Screen folders own user-flow pages and Firebase actions.
- `GameScreen.js` owns game rules, local animation state, and scene/overlay orchestration.
- `useMultiplayerGame.js` subscribes to the shared gameplay record and exposes transaction-backed roll, movement, challenge, and restart actions.
- `GameScene.js` composes the 3D world but does not decide game rules.
- `GameScreen/constants/` contains board geometry, route data, challenges, team definitions, camera positions, and model metadata.
- `firebaseConfig.js` initializes the Firebase app and exports the Realtime Database client.
- `assets/` holds board textures, vehicle models, marker geometry, fonts, images, and Lottie animations.
- `ios/` and `android/` are generated/prebuilt native projects with local compatibility changes.

### Rendering boundary

The game screen deliberately overlays ordinary React Native views above the GL canvas:

```text
GameScreen root View
├── GameScene (full-screen GL Canvas)
├── GameHud (React Native absolute overlay)
├── RaceProgressTracker (React Native absolute overlay)
└── ChallengePopup (React Native modal-style absolute overlay)
```

This keeps long text, buttons, and accessibility semantics out of WebGL while reserving WebGL for spatial content.

### Data ownership

| Data | Owner | Persistent? | Shared? |
|---|---|---:|---:|
| Device ID | AsyncStorage | Yes | No |
| Room settings | Firebase `games/{gameID}` | Yes | Yes |
| Master country-stop catalogue | Firebase `gameContent/countryStops` | Yes | Yes |
| Room route snapshot | Firebase `games/{gameID}/routeStops` | Yes | Yes |
| Team roster | Firebase `players/{gameID}` | Yes | Yes |
| Team model choice | Firebase `games/{gameID}/teamModels` | Yes | Yes |
| Current turn | Firebase gameplay record | Yes | Yes |
| Die result/action | Firebase gameplay record | Yes | Yes |
| Team route progress | Firebase gameplay record | Yes | Yes |
| Current challenge stop | Firebase gameplay record | Yes | Yes |
| Roadblock choice, challenge, detour segments, temporary stop data, and waypoint challenges | Firebase gameplay record | Yes | Yes |
| Per-frame animation state | `GameScreen` / Three.js refs | No | No |

---

## 7. Screen-by-screen reference

### `Home`

Purpose: entry point for normal sessions.

- Shows the looping globe Lottie animation and TipsyTraveller wordmark.
- Shows the tagline “Take a roadtrip and drink your way to victory!”
- `CREATE GAME` navigates to `CreateGameScreen`.
- `JOIN GAME` navigates to `JoinGameScreen`.
- The content scrolls when necessary and the globe/wordmark scales to the available viewport height instead of relying on a fixed-size layout. Web uses explicit, compact vertical spacing so wide desktop viewports do not stretch the controls apart.
- Profile and settings header buttons navigate to `AccountScreen` and `SettingsScreen` with tactile press animations and vector SVG iconography.

### `CreateGameScreen`

Purpose: collect the room configuration in three sequential steps.

1. Difficulty: `easy`, `medium`, or `hard` (displayed as Easy, Medium, Lethal).
2. Duration: `short`, `medium`, or `long`.
3. Player range: `1-4`, `5-8`, or `9-12`.

The next button only advances after the current option is selected. The final step navigates to `HostName` with the settings as route parameters.
The back control returns to the previous setup step before leaving the setup flow, and the next control is visibly disabled until the current choice is made.
The setup globe and wordmark use a larger compact presentation, while each option group is anchored near the bottom controls so the choices remain visually connected to the navigation arrows.

When the host returns from an existing lobby, the same setup screen is opened in edit mode with the current choices preselected. Completing the steps transactionally updates the existing `games/{gameID}` record while preserving its ID, host metadata, and `players/{gameID}` roster. A player-range reduction is rejected if the current roster would not fit or Team 3 still has members.

Duration is consumed when the room route snapshot is created: short samples 6 stops, medium 9 stops, and long 12 stops from one randomly selected, geographically ordered corridor. Editing duration while the room is still in the lobby generates a fresh route snapshot. Difficulty remains unused. All three duration choices also reuse the beer-bottle images originally used for difficulty.

### `HostName`

Purpose: establish host identity and create the Firebase room.

Creation sequence:

1. Reject an empty username.
2. Read `deviceID` from AsyncStorage or generate one from random base-36 text plus the current timestamp.
3. Generate a random four-digit string.
4. Query `games/{code}` and retry until the code is unused.
5. Read the authored stop catalogue (falling back to bundled defaults if unavailable) and select the duration-sized route snapshot.
6. Write settings, `routeStops`, host name, creation timestamp, device ID, and `status: "lobby"`.
7. Initialize `players/{code}` with a counter and three empty team placeholders.
8. Push the host into Team 1 as `isLeader: true`.
9. Register an `onDisconnect` update that writes `disconnectedAt` on the game.
10. Reset navigation to `Home → LobbyScreen`, removing the completed setup and username screens so native back navigation cannot accidentally repeat room creation.

The username form uses a keyboard-avoiding, scrollable layout. Empty input is disabled, repeated submissions are blocked while creation is in progress, and connection failures are surfaced to the player.

### `JoinGameScreen`

Purpose: validate a room, restore host identity if appropriate, and join a team.

- Game IDs are numeric and limited to four digits by `NumberInput`.
- The screen rejects missing fields and unknown room codes.
- If `disconnectedAt` is more than ten minutes old, the room is treated as expired.
- If the saved device ID matches `hostDeviceID`, the player is recognized as the host, the disconnect marker is cleared, and a new disconnect handler is registered.
- A device already found in a team is not inserted again.
- New players are assigned to the least populated team allowed by the selected player range.
- The PIN and username form moves above the software keyboard, supports moving focus from the PIN to the username, prevents repeated join attempts, and shows recoverable connection errors.

### `LobbyScreen`

Purpose: show synchronized teams and allow the host to start.

- Subscribes to `players/{gameID}` and `games/{gameID}` using Firebase `onValue`.
- Renders Team 1, Team 2, and optionally Team 3.
- The host may remove non-leaders.
- Once the minimum team-leader count is reached, the host may manually add local/offline players by name.
- Only the host can start.
- Start atomically clears any earlier `teamModels` choices and writes `games/{gameID}/status = "characterSelection"`, ensuring every required leader makes a fresh selection for the session.
- Every lobby client observing that status navigates to `CharacterSelection`.
- Native swipe-back is disabled on the lobby. For hosts, the visible back control opens the explicit edit-settings route; the completed username/creation flow is no longer retained beneath the lobby.
- Team panels scroll independently of the fixed room header and lower controls, keeping large rosters usable on shorter phones.
- The optional local-player field moves above the keyboard and blocks empty or duplicate submissions.
- The host-only local-player control uses a compact labeled name field and teal add action with clear disabled/pressed feedback.
- The `RULES` button opens a concise overview of the current turn and completion rules.

### `CharacterSelection`

Purpose: let every device identified as a team leader independently choose that team’s vehicle and coordinate entry into the game.

- Loads vehicle GLBs on demand instead of eagerly uploading every embedded 2048×2048 texture to the mobile GPU.
- Locates the current device in the passed `teamMembers` object.
- Only leaders see the model carousel and confirm button; other players see the shared readiness state.
- The selection UI follows the setup flow's cream, white-card, teal-accent visual system, with team-readiness badges and the rotating vehicle contained in a light garage card.
- The garage content scrolls on short screens, and the 3D preview height scales to the available viewport.
- The preview and board use the same normalized vehicle renderer, so differently sized source models have a consistent scale, ground position, material treatment, and orientation.
- The preview rotates continuously and labels the bundled models with player-facing names such as Rally Truck, Party Van, Moon Buggy, and Disco Cruiser.
- Confirm writes the selected model ID to `games/{gameID}/teamModels/{teamKey}`.
- The screen subscribes to the game record so every client sees which teams are still choosing.
- When every required team has selected a model, the host transactionally changes the room status from `characterSelection` to `game`.
- Every client observing `status: "game"` replaces the selection screen with `GameScreen` using the complete model map.

When the host observes that every required team is ready, one transaction creates the initial versioned gameplay record and changes the room status to `game`. Every client then replaces the selection screen with `GameScreen` and subscribes to that gameplay record.

### `GameScreen`

Purpose: run the board state machine, assemble team pieces, and connect 3D events to native overlays.

- Locks the device to landscape while mounted.
- Creates two or three game pieces based on `nrOfPlayers`.
- Resolves model choices from `gameData.teamModels`, falling back to the Rally Truck.
- Creates a ref and progress record for each team.
- Subscribes to the room gameplay record and renders synchronized rolls, movement targets, landings, challenges, turn switching, finish state, and restart.
- Limits roll and challenge controls to the active team's leader and restart to the host; other devices render the same action in spectator mode.
- Keeps development mock games local so the Dev Portal does not require Firebase.
- Shows the complete selected itinerary directly on the board as a thin light-blue route line before the first roll.
- Unlocks orientation on unmount.
- The native HUD and race tracker respect landscape safe-area insets, while long challenge cards become scrollable and use a compact layout on short landscape viewports.
- Shows a shadow-free, 56-pixel-wide mini race tracker only during the `waiting` phase. It sits four pixels inside the device's right safe-area inset, maps each team's current stop to the route's arc-length progress, and renders enlarged team-colored car silhouettes without icon background boxes. Co-located cars overlap slightly, while the active team's car scales up and stacks above the others. The tracker marks the finish with a checkered flag and incorporates the compact roll action. A native-driver opacity animation fades it in over 180 ms and out over 140 ms; touch and accessibility focus are disabled as soon as it begins hiding during dice animation, vehicle movement, challenges, loading, and game completion. The completed-game restart action lives in `GameHud` instead.
- Displays the active team's score in the HUD and replaces the generic completion message with ranked team scores and a winner announcement.

### `AccountScreen`

Purpose: manage local player identity, party badges, preferred vehicle models, lifetime statistics, and anonymous device state.

- Renders a retro-arcade styled profile card where players set their default username (persisted in AsyncStorage) and party title/badge (Party Legend, Road Captain, Shotgun King, Navigator, Mixologist, High Roller, Daredevil, Chill Tourist).
- When a username is saved, `HostName` and `JoinGameScreen` auto-populate the field so players do not have to re-type their names every game session.
- Allows browsing and selecting preferred vehicles from `MODEL_OPTIONS`.
- Tracks and displays lifetime career statistics: tours completed, challenges won, sips logged, and total dice rolled.
- Displays the active anonymous `deviceID` used by Firebase for room re-entry and turn management, with a quick action to regenerate device identity when testing fresh installations.
- Supports resetting statistics and clearing local account data.

### `SettingsScreen`

Purpose: configure audio, haptic, drinking rules, and 3D board preferences, plus access the game guide.

- Audio & Haptics: toggle Sound Effects (SFX), Ambient Music, and Haptic Feedback.
- Party & Drinking Rules: switch between "Classic Tipsy" (alcoholic party mode with sips and drinks) and "Sips & Dares" (driver and non-drinker friendly mode with soft drinks or party dares).
- Challenge Timer: switch between "Relaxed" (untimed) and "Speed Run" (45-second timer).
- Gameplay & 3D Board: toggle Fast Dice Animations (quick settle without waiting for complete physics bounce), Camera Follow Vehicle (smooth cinematic 3D camera tracking of the active vehicle), and Auto-Advance Turn.
- How To Play Quick Guide: interactive accordion covering dice & turns, destination challenges, the mid-air kickflip pass, and tour completion.
- About TipsyTraveller: version info (1.0.0), platform stack (Expo SDK 58, React Three Fiber, Firebase), and credits.
- Revert all settings back to default values with one tap.

---

## 8. 3D board architecture

### Canvas

`GameScene` creates a React Three Fiber native `Canvas` with:

- Three.js color management uses the current renderer defaults rather than legacy mode.
- A 50-degree field of view.
- Antialiasing enabled in development and production.
- Device-pixel ratio capped at 1.5.
- High-performance power preference requested.
- Premultiplied alpha disabled.
- One ambient light, one hemisphere light, and two directional lights.

The vector map model, vehicle models, and country-marker model use separate React
`Suspense` boundaries. Primitive loading geometry remains visible when one of
those assets is still resolving, so one slow asset does not hide the entire
physical-device board. The route and die do not load external models.

`CharacterSelection` calls `preloadBoardAssets()` (`constants/boardAssets.js`) on
mount, which warms the `useGLTF` cache for the map and marker GLBs so they are
already decoded when `GameScreen` mounts. Vehicle GLBs are not preloaded as a
set; the ones players browse in the selection screen are already cached.

In development (`__DEV__`) the map load is timed with `[perf]` console logs
(`constants/boardAssets.js` helpers `perfLog`/`perfNow`, used by `MapPlane`):
preload start, time until the GLB is ready after the first render attempt (and
whether a preload ran), material preparation time, and time to the first frame
after mount. On web against a local dev server a cold load measured about 33 ms
until the GLB was ready and about 326 ms until the first frame; with a preload
the GLB was ready immediately and the first frame came after about 46 ms. These
are web numbers on localhost; device numbers have not been measured. Preload
was verified on web only; confirm it on iOS/Android before relying on it.

The 3D components (`GameScene`, `GamePieces`, `GamePiece`, `CountryMarkers`,
`MapPlane`, `DottedRouteLine`, `BoardDice`, `VehicleModel`) are wrapped in
`React.memo`. `GameScreen` passes its handlers through `useLatestCallback`
(stable identity, always calls the latest closure), so HUD-only state changes
such as `lastRoll` or `remainingMoves` no longer re-render the Canvas tree.

### Scene graph

```text
Canvas
├── Lights
├── Suspense(MapFallback)
│   └── MapPlane
├── DottedRouteLine (persistent route line plus animated current-move ribbon)
├── RoadblockFigure (optional low-poly roadblocks with hazard stripes, strobe beacons, detour sign, and cones)
├── Suspense(GamePiecesFallback)
│   └── GamePieces
│       └── GamePiece × 2 or 3
├── Suspense(CountryMarkersFallback)
│   └── CountryMarkers
│       └── CountryMarker × route stop count
├── CameraController
└── BoardDice
```

### Coordinate system

The map is treated as a 20-by-15 Three.js plane:

- Width: `20`
- Height: `15`
- Vertical center: `0.5`
- Base Z depth: `-1`
- Default content clearance above the map: `0.08`

Route coordinates are authored in the coordinate space of the original world
map SVG. `svgPoint(x, y)` normalizes those source coordinates, `MAP_VIEWPORT`
selects the Europe area used by the current route, and `uv(u, v)`
converts normalized coordinates into board coordinates:

```text
x = ((u - viewport center U) ÷ viewport width) × map width
y = ((viewport center V - v) ÷ viewport height) × map height + map center Y
z = map Z + clearance
```

The viewport spans Iceland through Kazakhstan and the Caucasus, and from the
Nordic countries through Cyprus. Because the source artwork does not expose a
reliable geographic projection, every bundled country pin is manually authored
in source-SVG coordinates against the rendered country outlines. The bundled
stops carry a `positionVersion`; known catalogue entries with older or missing
versions are upgraded in memory to the current positions while preserving their
order, names, and challenge content. The resulting positions use the same
board-coordinate shape as authored Firebase points.

### Map plane

`MapPlane` builds the map in 3D space from three visual layers:

1. A large dark-blue ocean plane that matches the Canvas background, so no board boundary or horizon edge is visible.
2. A shallow extruded land relief generated from the welded `st2..st9` country paths in `assets/map.svg`, plus an unlit cream cap over its top surface.
3. A dark border mesh (`CountryBorders`) derived from the same welded country outlines — covering both deduplicated internal borders and outer coastal/island edges — raised slightly above the land surface.

The board no longer renders a raster map underneath the vector geometry. The
GLB is scaled to the current `MAP_VIEWPORT` without rectangular clipping,
keeping the active Europe route large while allowing the surrounding
ocean to continue naturally. The top land surface uses an unlit, non-tone-mapped cream material
(`#FFF1CD`), keeping its warm palette color stable instead of being bleached
toward white by ACES Filmic tone mapping or darkened by scene lighting. The
exposed relief sides retain a darker lit material so coastlines still read as
three-dimensional; the ocean uses the primary dark-blue palette color
(`#2C3E50`) with tone mapping disabled so the ocean plane and Canvas background
match.
Because `assets/map.svg` stores long country paths using 1-decimal-place relative
commands that accumulate slight drift along long perimeters (and caused the
separate `st1` Eurasia silhouette to drift up to `1.5` SVG units relative to
the `st2..st9` country paths in Europe), `scripts/build-vector-map.mjs`
welds reversed twin curves between adjacent countries back to canonical shared
knot positions before building all three meshes (`RaisedLand`, `LandTop`, and
`CountryBorders`) from the exact same country shapes. Shared internal border
segments are deduplicated while coastal and island outlines are preserved, so
every country border and coastline edge has a clean line that aligns with the
3D land surface. Border geometry is limited to the active Europe
viewport to keep the mobile asset smaller. The GLB is prebuilt so Expo Go does
not need to parse, triangulate, extrude, or weld the large SVG at runtime.
The animated route path renders above the raised land and border geometry.

`RaisedLand` contains only the extruded side walls (about 61k shared vertices
with smooth normals). Its top cap is fully covered by `LandTop` and its bottom
cap lies on the ocean plane, so neither is exported. `LandTop` carries positions
only (it is unlit), and no mesh has UVs because the map uses no textures. The
generated file is then run through `gltf-transform quantize`
(`KHR_mesh_quantization`: int16 positions, int8 normals), which needs no runtime
decoder; Draco and Meshopt were deliberately not used because they depend on
WASM or a CDN download that is unverified on Hermes/Expo GL. The command is
documented at the top of `scripts/build-vector-map.mjs`. Result: the GLB went
from 10.3 MB to about 1.9 MB and the board from about 224k to about 146k triangles per
frame, measured on web before the Europe viewport expansion. The wider border
crop adds line segments but does not add land triangles. The look was compared on web; verify on iOS and
Android that quantized attributes render correctly.

### Route curve

`createRouteModel(countryStops)` converts the room's ordered stop positions into a centripetal Catmull-Rom curve with `1,400` arc-length divisions. The model also exposes names, marker positions, the final stop index, and route-relative stop distances; board components receive this model rather than importing a fixed route.

The global curve is used for:

- Animated route-ribbon geometry.
- Vehicle positions.
- Smooth look-ahead vehicle tangent/heading.
- Mapping country stops to travel distances.

Each ordered stop is a Catmull-Rom control point. Its parameter-space index is mapped through the curve's 1,400-sample cumulative arc-length table to produce a monotonic route progress value. Those progress values are multiplied by the total curve length to create the movement distances used by rendering and synchronized timing. This avoids ambiguous nearest-point matches when an edited route crosses itself or revisits a coordinate.

### Route line

`DottedRouteLine` precomputes two sleek ribbon geometries along the runtime route curve. A very thin, semi-transparent medium-blue line (`#5FAFD0`, `opacity: 0.62`) connects every selected stop as soon as the board opens, so players can read the itinerary without a separate route-preview overlay. A slightly wider dark-blue ribbon (`#2F8FB7`, `opacity: 0.9`) uses `BufferGeometry.setDrawRange` for the active move, so no geometry buffers are reallocated per frame:

- When a dice roll determines the move target, the ribbon smoothly draws out (`easeInOutCubic`) from the active vehicle’s current stop to the target stop before the vehicle begins driving.
- As the vehicle drives along the path, `activeCarProgressRef` advances the tail of the ribbon with the vehicle so the path is consumed cleanly into the destination stop.

### Country markers

- The marker model is `assets/models/location.glb`.
- Every marker clones the shared GLTF scene.
- Mesh materials are replaced with red or gold `MeshStandardMaterial` instances.
- While waiting to roll, the next stop is active; during a move, the destination stop for that roll is highlighted as active.
- Active markers rotate and display a pulsing outer ring.
- Marker geometry is centered horizontally and aligned at its bottom tip (`box.min.y`) with a Three.js bounding box so the pin stands above the map surface.
- Sized to remain readable without covering smaller countries or nearby stops: inactive markers scale at `0.095` and active destination markers scale at `0.12`, floating with corresponding ground shadow and ring meshes.
- Markers at occupied stops are omitted from both the GLTF render and loading fallback. When the last parked car leaves a stop, its marker fades in over the first 40% of that route leg (capped at `0.7` world units); the destination marker fades out across the matching final approach and is omitted once the car arrives. If another car remains parked at either stop, its marker stays hidden. Marker meshes use per-instance cloned materials so these opacity transitions do not affect other stops. The Dev Portal's actively edited marker remains visible even when that stop is occupied.

### Roadblock obstacles

`RoadblockFigure` (`components/RoadblockFigure.js`) renders a stylized, procedural low-poly roadworks barrier on the 3D board to signal closed roads where vehicles must navigate around:

- **Construction barricade**: A Type II/III sawhorse barricade with two dark-navy A-frame stanchions (`#223144`), cross-tie spreaders, and ballast sandbag counterweights (`#D4B895`) on the feet.
- **Diagonal warning stripes**: Dual horizontal planks display alternating 45-degree hazard stripes in Safety Orange-Red (`#E8412F`) and Warm Cream (`#FFF1CD`). Striping is procedurally triangulated into exact polygon facets at runtime, requiring zero external texture downloads or canvas dependencies for cross-platform fidelity on Hermes, iOS, Android, and Web.
- **Hazard strobe beacons**: Two amber warning lamps atop the barrier stanchions feature an arcade emergency double-flash cadence in `useFrame` (`emissiveIntensity` pulsed between 0.2 and 2.8) alongside expanding corona glow spheres.
- **Detour direction sign**: A gold caution diamond (`#FFD700`) with a dark border and a stylized low-poly detour arrow (`right`, `left`, or `both`) indicates the detour direction around the obstacle.
- **Traffic cones**: Chunky flanking low-poly pylons in Safety Orange (`#FF5722`) with reflective cream collars (`#FFF1CD`) and dark rubber bases.
- **Spawn pop-in**: Bounces into place using spring overshoot easing (`easeOutBack`) and an expanding ground ripple ring.
- **On-route placement**: `createRoadblockOnRoute(routeModel, legIndex, progressAlongLeg, options)` calculates the tangent angle along the route curve and orients the roadblock perpendicular to oncoming vehicles. Developers can toggle and clear roadblocks from the Dev Portal's Board & Game Tools tab (`dev:toggleRoadblock`, `dev:clearRoadblocks`, `dev:spawnRoadblock`).
- **Board scale**: Runtime roadblocks use a `0.52` scale so the barrier remains legible beside a vehicle without covering nearby country borders or dominating the regional camera.
- **Gameplay route preview**: An eligible event adds a gold alternate ribbon through two currently hidden catalogue countries. Copies of the normal 3D country pins mark both stops, the choice card names them, and the overview camera widens to include the full detour while the team chooses. After detour selection, travel advances one segment at a time and each temporary country opens its authored standard challenge popup before the next segment. After roadblock-challenge success the obstacle disappears and movement follows the original route.
- **Dev flow**: The Board tools include `Test Roadblock Event`, which forces the complete local choice flow without first manufacturing a two-stop lead. The existing visual-only toggle remains available for scale and placement checks.

### Camera

The camera has two modes:

- `done`: smoothly frames every team vehicle together with the active team's next destination (or rolled destination during the initial path reveal). The regional overview uses a closer phone-friendly base zoom (`OVERVIEW_BASE_SCALE = 0.58`, `OVERVIEW_MAX_SCALE = 0.82`), widens gently as teams spread apart across the continent, and includes intelligent western ocean avoidance: when stops/vehicles are located in western Europe (Iceland, Ireland, UK, Portugal, Spain), the camera shifts look-at eastward so western destinations are framed comfortably near the left edge of the display with a natural coastal margin (`DESIRED_WEST_MARGIN = 0.85`) instead of centering directly on them into the Atlantic Ocean, keeping the European continent prominently visible across the phone display.
- `follow`: follows the active vehicle from a wider fixed offset once the vehicle begins driving along the revealed path, keeping the car and nearby route context visible without filling the frame.

Position and look-at target are interpolated every frame using exponential damping (`1 - Math.exp(-damping * delta)`), preventing frame-rate-dependent jumps.

---

## 9. Dice implementation

`BoardDice` is a custom 3D interaction and animation system; it does not use a physics engine.

### Geometry

- The die body is a Drei `RoundedBox` measuring `0.48` units per side.
- Each of six faces has a manually defined transform.
- Pips are small circle meshes placed from lookup tables.
- The six physical faces show `1`, `2`, and `3` twice each on opposite sides, matching the reduced gameplay roll range.
- A pixel-art “THROW ME” label is built once as a centered merged geometry and rendered within a warm cream rounded badge (#FFF1CD) with dark navy text (#2C3E50) and a thin navy rim matching the HUD and die; dice pips share one geometry and material.

### Internal modes

The die keeps its high-frequency animation state in refs rather than React state:

| Mode | Behavior |
|---|---|
| `idle` | Floats, spins, and displays “THROW ME” |
| `held` | Follows the pointer above the board |
| `throwing` | Performs airborne and rolling animation |
| `result` | Flies the die toward the camera with the rolled face forward, then fades it out |
| `hidden` | Keeps the die off the board during movement and challenges until rolling is enabled again |

The idle die is positioned on the camera's center ray at a fixed viewing distance. Its drag bounds and board landing area move with that screen-relative anchor, so regional overview panning does not leave the die floating over an unrelated part of the map or outside the visible play area. `BoardDice` also accepts a `visible` prop (default `true`); when `visible` is false (such as during authoring placement mode or stop editing forms), the die mesh, badge label, and interaction planes are hidden and do not intercept pointer events.

### Interaction sequence

1. Pointer down on the die calls `beginPickup`.
2. Pointer movement is projected onto a foreground hold plane at `HOLD_Z` so the held die stays directly under the pointer.
3. The held point is clamped to `HOLD_BOUNDS` in the foreground, while landing and roll targets are clamped to `DICE_BOUNDS` on the board.
4. Recent drag displacement is smoothed into a throw direction.
5. Pointer up generates a random result from 1 through 3. All six physical sides also display only 1, 2, or 3 pips.
6. Throw strength slightly modifies rolling distance.
7. The die animates through a parabolic airborne stage.
8. It rolls and bounces toward the final position.
9. Rotation is interpolated to an orientation that shows the result face.
10. `onRollComplete(result)` tells `GameScreen` to lay out the animated path and move the vehicle.
11. The physical die flies toward the screen at a restrained scale, rotates the rolled face toward the camera, holds briefly, and fades out in place over 1.2 seconds.

The throw lasts 1.75 seconds; the first 42% is airborne. During the fade, only the rolled face remains rendered so pips from the other transparent faces cannot bleed through as a false second result. Physical-die rolls delay vehicle motion until the 1.2-second result animation has faded out. The die remains hidden during movement and challenges, then reappears at its idle position when rolling is enabled for the next turn. The tracker roll shortcut has no result animation and keeps the normal route-reveal timing.

### Tracker roll shortcut

The compact `ROLL` button at the bottom of `RaceProgressTracker` calls `GameScreen.requestRoll()` directly. It generates the same random range and triggers the animated route path and vehicle movement without animating the 3D die. The tracker then fades out until the next team returns to `waiting`, when it fades back in. The host-only `RESTART` action appears in the completed-state `GameHud`, preserving both controls without a separate turn panel.

---

## 10. Vehicle movement

### Model configuration

`MODEL_OPTIONS` defines eight vehicles:

- Rally Truck
- Neon Nomad
- Party Van
- Moon Buggy
- Disco Cruiser
- Turbo Comet
- Road Rocket
- Cosmic Camper

Each record contains:

- Stable ID stored in Firebase.
- Human-readable label.
- Bundled GLB source.
- Whether to preserve texture-based materials.
- Yaw rotation offset (`yaw: Math.PI / 2`) aligning the model's forward axis with vehicle heading and showroom preview.

Unknown IDs fall back to the Barrel Roadster. Every team also defaults to the Barrel Roadster when no model selection is present.

### Model preparation

`VehicleModel` clones the loaded GLTF scene so previews and teams do not mutate one shared scene instance. It then:

- Disables frustum culling on child meshes.
- Replaces materials with team-colored paint, dark parts, glass, or lights for the classic-style model.
- For `preserveMaterials` models, web keeps a cloned PBR material while native Expo GL uses a lightweight unlit material backed by the already-loaded shared texture. Both paths set sRGB color space and disable `flipY`.
- Uses a smaller board-only scale (`BOARD_SCALE = 0.38`) than the selection preview (`PREVIEW_SCALE = 1.45`), keeping vehicles proportional to country markers, stops, and route curves without dominating smaller European territories. Parked cars use proportionate lateral spacing (`0.22`), and intermediate kickflip jumps use scaled height (`0.52`) and radius (`0.55`).
- Disposes the materials it created when the prepared clone is replaced or unmounted (and, on web only, the cloned textures). Geometry and native textures belong to the cached GLTF and are never disposed here.

### Motion

- After a roll, the vehicle waits for the animated route path to lay out (`getPathRevealDuration`) before driving.
- Progress is stored as distance along the global route curve, advancing by `delta × 2` world units per frame while driving.
- Position comes directly from `routeModel.curve.getPointAt(normalizedDistance)`.
- Heading comes from a tight look-ahead chord tangent (`getSmoothRouteTangentAngle`) plus a 90-degree model correction, interpolated with shortest-angle exponential damping.
- An inner body group applies the driving sine bounce so the root group tracked by the camera remains free of vertical bounce jitter.
- Before movement begins, `GamePieces` identifies other teams parked at route stops strictly between the mover's start and destination. The inner body group first lifts the active vehicle on a high smooth arc, then performs one full longitudinal rotation while airborne and returns the vehicle upright before landing. This visual kickflip does not change route distance, stop occupancy, or camera tracking.
- `GamePieces` groups non-moving teams by stop and retains each car's center, left, or right assignment until that car departs. Two cars form a tight pair half a spacing to either side of the route; three use center, left, and right positions. Parked cars smoothly make room while an incoming car approaches. During movement, `GamePiece` follows a lane-change trajectory from its departure position onto the route centerline, then into its predicted destination position before stopping. Stable assignments prevent cars from swapping sides or sliding through one another when another team arrives or leaves.
- Crossed intermediate stops decrement `remainingMoves` in `GameScreen`, and when the target stop is reached, `onMoveComplete(teamId, targetLeg)` fires exactly once.

---

## 11. Challenges

Challenges are stored as a pool on each authored country stop. Each has:

- Country
- Title
- Prompt
- Failure penalty
- Accent color

`constants/challenges.js` retains country flag presentation and backwards-compatible fallback challenges. In multiplayer, movement completion deterministically chooses a challenge from the landed stop using the action ID and stores both `challengeStop` and `challengeId` in the canonical gameplay record, so every client renders the same prompt.

Every bundled country has exactly one `Guess the Country Word` entry alongside its original challenge. Each entry supplies six distinct medium-to-hard country-themed words or phrases, a 30-second duration, a 10-point success value, and a versioned word-list marker. Obvious answers such as the country name, capital, or best-known basic food were replaced by more specific geography, culture, history, architecture, and traditions. The challenge is excluded from selection when the active team contains fewer than two players. When selected, the action ID deterministically chooses both an explainer and a secret word. The active team leader's device runs `intro -> playing -> result`: it asks the group to pass the phone to the chosen player (`PASS THE PHONE` with `START`). Pressing `START` immediately begins the 30-second timer and opens an explanation popup overlay briefing the explainer on what to do. For the first 7 seconds, the explanation popup counts down while the timer ticks; once the explanation countdown finishes, the popup dismisses to reveal the secret word with the remaining time (~23 seconds), creating pressure to think and explain on the spot. The round records `guessed`, `failed`, or `timeout`. Other clients show a non-secret in-progress message until the result is available.

### GeoGuessr Place Duel

Every bundled country stop also contains a `GeoGuessr Place Duel` entry (`geo-guessr-duel`, `type: 'geoGuessr'`). It introduces an interactive, multi-team geographic guessing minigame inspired by GeoGuessr:

1. **Photo Location Pool (`constants/monumentPool.js`)**:
   - Contains a comprehensive catalogue of 67 European photo locations (`DEFAULT_MONUMENT_POOL`) covering every one of the 51 countries in `EUROPE_COUNTRIES`. The legacy `monument` identifiers remain in code and persisted data to preserve multiplayer compatibility.
   - The catalogue mixes famous landmarks with landscapes, waterfronts, villages, squares, and city scenes. Each entry is normalized with a `subjectType` of `place` or `landmark`; selection alternates between those types when candidates are available, making a broad place scene appear at least every other round instead of leaving the mix to chance.
   - Each entry defines `id`, `countryId`, `countryName`, `city`, `name`, `clue`, `category` (`cathedral`, `castle`, `ancient`, `tower`, `mountain`, `coast`, `palace`, `monument`), `subjectType`, `palette`, `svgPosition` in board map coordinates (`[svgX, svgY]`), `position` in 3D world units (`{ x, y }`), and a curated Wikimedia Commons photo URL plus source page, author, and license metadata.
   - Stored in Cloud Firestore as one independently addressable document per location (`geoGuessrChallenges/{locationId}`). Each document carries the complete GeoGuessr location definition and its curated photo URL plus attribution. A small `gameContent/monumentPool` manifest records the collection name, version, count, and update time. This normalized shape avoids Firestore's nested-array restriction while Realtime Database (`gameContent/monumentPool`) and local storage (`tipsy_monument_pool_v2`) retain the array-shaped fallback. Version 2 requires every bundled location to have a curated real-photo record; normalization derives `subjectType` for existing version-2 documents without requiring a destructive data migration.
   - **Non-Repeating Pool Guarantee**: In multiplayer, the `gameplay` record tracks `usedMonumentIds: [...]` (`usedMonumentIdsRef` locally). Whenever a duel occurs, `selectMonumentFromPool` picks a location not yet used in the session and excludes the landed country (`excludeCountryId: stop.id`) so the current destination never spoils the location.

2. **Trigger Mechanisms**:
   - **Stop Pool Chance**: Every country stop includes the duel in its challenge selection pool (1-in-3 chance alongside the stop's custom challenge and `Guess the Country Word`).
   - **Guaranteed Roadside Duel**: Whenever the active team lands directly on a stop already occupied by another team, or hops/passes over another parked team along their leg (`didTriggerRoadsideDuel`), a Roadside Duel is guaranteed. The ticket stub badge displays `Roadside Duel` instead of `Country Challenge`.

3. **Gameplay and Pinning Flow (`components/GeoGuessrDuelView.js`)**:
   - **Stage 1: Photo & Clue (`photo`, 18s)**: All teams inspect a real mystery-place photo with a scene clue and a compact Commons author/license credit. The former vector drawing is no longer used as a fallback; a failed download is shown honestly as an unavailable photo so an illustration can never be mistaken for the real clue.
   - **Stage 2: Map Pinning (`pinning`, 20s)**: The ticket expands to nearly the full safe landscape viewport and hides its narrow country stub so the interactive 2D SVG map receives almost all available space. The map (`EUROPE_MAP_FILL_PATH_DATA` and `EUROPE_MAP_BORDER_PATH_DATA`, `minX: 440, minY: 190, width: 290, height: 218`) is generated from `assets/map.svg`, supports 1x–4x zoom controls and drag-to-pan navigation, and converts a final tap through the active viewport back into board coordinates. The generator welds neighboring country geometry and omits duplicate shared edges before producing the dedicated border layer, removing the former overlaps and double outlines. Country outlines use a thin, scale-compensated blue-grey stroke, while compact guess, result, and target pins remain the same small on-screen size at every zoom level. Each team leader presses `LOCK IN PIN` after placing or adjusting a guess. Bot-only teams automatically place realistic proximity pins (`generateFallbackPin`). On single-device local games, the phone is passed sequentially between teams.
   - **Stage 3: Result & Leaderboard (`result`)**: Once all teams lock in or the 20-second timer expires, the true location is revealed with a glowing gold ring. Dashed lines connect each team's pin to the target, displaying exact calculated kilometer distances (`calculateBoardDistanceKm`). The closest team wins `+15` points (`challengePoints`), while all losing teams take 2 sips.

In multiplayer, `challengeRound` stores the selected player, secret word, stage, server-adjusted start timestamp, result, and awarded points. Stage changes and the score award use Realtime Database transactions. The score award is idempotent because only a `playing` round can transition to `result`. Local development games use the same state sequence without Firebase.

For the challenge ticket, `getChallengeForStop` reads the two-letter country `code`, representative `city`, and optional `landmark` from the stop snapshot, falling back to `STOP_VISUALS` for legacy default stop IDs. Stops without a landmark render a flexible spacer instead. The flag strip reads its colors from `COUNTRY_FLAGS`/`getCountryFlag` by country name; the bundled 51-country catalogue has a palette for every country. The popup derives two more labels from the challenge text: `getPenaltyTag` (for example `2 SIPS` or `DOWN IT`, or an explicit `penaltyTag` on a challenge) and `getChallengeTimer` (for example `20 SEC`, shown only when the text names a number of seconds).


The popup is a React Native overlay styled as a two-part travel ticket. The navy stub on the left carries a thin vertical country-flag strip on its left edge, the "Country Challenge" label, the city landmark (`components/CityLandmark.js`, flat pixel silhouettes drawn with `react-native-svg`), country name, city name, team badge, and the Next Turn button. The cream body on the right carries the mission code (`MISSION FR-01`), optional timer chip, title, prompt, and a penalty row with a red tag plus the penalty sentence. A dashed perforation separates the two parts. On a phone (shorter screen side under 600 px) the ticket is exactly 75% of the screen width and 85% of its height (capped by the safe area). On larger screens it keeps the same landscape rectangle, the phone's aspect ratio (75% x 85% of an 844 x 390 screen, about 1.9:1), scaled to fit inside the same 75% x 85% box and at most 520 px tall. When the ticket is 280 px tall or more, the title and prompt use larger type, and the landmark is sized from the ticket height and centered in the stub. Landmarks currently exist for Paris, Madrid, Lisbon, Sevilla, Rome, Berlin, and Brussels; add a new key in `CityLandmark.js` and `STOP_VISUALS` to introduce another city.

The ticket is the front face of a two-sided card. The back face (`CardBack`) matches the ticket's black border and hard shadow: a cream field with a faint navy diagonal stripe pattern (`react-native-svg` `Pattern`), teal/cream/red brand strips on both side edges, four navy corner studs, the app logo (`assets/icons/splash-icon-light.png`) in a sand circular halo with a hard shadow, the two-line navy `TIPSY TRAVELLER` wordmark with a teal hard text shadow, and a teal `COUNTRY CHALLENGE` badge.

### Animation system

Three `Animated.Value` objects drive the card, all with the native driver:

1. **Marker arc fly-out (`fly`)**: Projects the landed stop's 3D marker coordinate to 2D screen space (`getMarkerScreenOffset`) and flies the card along a parabolic arc (`860ms`, `scale: 0.06 -> 1`, with a small `rotateZ` tilt) to the center of the screen with the back face toward the viewer, while the backdrop dim fades in. Uses an Easy Ease bezier (`Easing.bezier(0.42, 0, 0.58, 1)`).
2. **Card turn (`flip`)**: After a 120 ms hold, the back face squeezes to nothing with `scaleX` and the ticket opens out again (`780ms`), swapping faces at the midpoint without any opacity change. It deliberately uses `scaleX` instead of `rotateY`/`perspective`/`backfaceVisibility`, which rendered unreliably (flicker, clipped edges) on Android and some iOS GPUs. The ticket ignores touches and its button stays disabled until the turn has finished.
3. **Tear-off (`tear`)**: Pressing Next Turn does not complete the challenge immediately. The stub and the body are separate halves, each with its own border and hard shadow. Over 720 ms (ease-in) the stub rips off along the perforation and falls away to the lower left while the body follows to the lower right, both fading out. `onComplete` fires only when the animation finishes. The halves are plain animated views (no `ScrollView`), so nothing clips them while they fall; the ticket therefore relies on its compact layout instead of scrolling on very short screens.

While a challenge is open, `GameScreen` passes `lowPower` to `GameScene`, which sets the canvas to `frameloop="never"`. The board is covered by the dim backdrop, and a running GL loop competes with the card animation on phones; the loop resumes (and the camera continues from where it stopped) when the challenge closes. The opening animation starts two animation frames after the card mounts (`requestAnimationFrame` twice), so mounting and layout do not eat its first frames; `InteractionManager` is deprecated and not used. To keep the animated layers cheap, the card animates transforms only (no opacity fades except a one-step reveal), the hidden face is moved off-screen, and there is no `adjustsFontSizeToFit` or SVG pattern in the card. Verified on web only; Android and iOS devices still need a manual check. On phones the 85%-tall ticket can overlap the HUD panels at the top corners; it is drawn above them.

The fly wrapper sets `renderToHardwareTextureAndroid` and `shouldRasterizeIOS`, and, while tearing, both halves set `renderToHardwareTextureAndroid`, so the card is animated as a cached texture instead of being re-drawn each frame. The Next Turn button uses a bottom border for its hard shadow, because `shadowOffset` has no effect on Android.

There are no looping effects: no shimmer, floating, button pulse, accent beam, or stacked backing cards. The animations are keyed on the challenge's `stop` and `title`, not on object identity, so a parent re-render cannot restart them.

### Completion semantics

Ordinary challenge cards do not record success or failure. Their completion button is enabled only for the active team's leader; pressing it transactionally closes the challenge, identifies the next unfinished team, clears the latest roll, and returns every client to `waiting`. The word challenge keeps Next Turn disabled until its result stage. `GUESSED` adds 10 points exactly once, while `NOT GUESSED` and timer expiry add none. Ordinary penalties remain social instructions for the players to apply themselves.

---

## 12. Firebase and multiplayer data

### Hybrid database architecture

TipsyTraveller uses a hybrid Firebase data architecture exported from `firebaseConfig.js`:

1. **Cloud Firestore (`firestore`)** owns structured, queryable game content:
   - `countries/{stopId}`: Ordered country stops (`id`, `name`, `code`, `city`, `landmark`, `order`, `position`, `positionVersion`, `accent`, `challenges`, `updatedAt`). Single-document writes (`writeBatch` / `merge: true`) allow moving a single marker or updating one stop without rewriting the entire 51-country catalogue.
   - `challenges/{challengeDocId}`: Normalized per-challenge documents (`id`, `countryId`, `countryName`, `title`, `prompt`, `penalty`, `type`, `durationSeconds`, `successPoints`, `wordListVersion`, `words`, `order`, `updatedAt`) indexed by `countryId` for filtered queries (`getChallengesForCountry`).
   - `geoGuessrChallenges/{locationId}`: One document for each of the 67 European photo locations. Each document contains its location/clue data, map position, version, working `imageUrl`, and `imageSourceUrl`, `imageAuthor`, `imageLicense`, and `photoSource` attribution fields. Firestore stores the URL and metadata rather than copying the Wikimedia image bytes.
   - `gameContent/monumentPool`: Lightweight manifest for the normalized GeoGuessr collection (`version`, `count`, `collection`, `updatedAt`).
2. **Firebase Realtime Database (`db`)** owns live ephemeral multiplayer state (`games/{gameID}` and `players/{gameID}`) and keeps a mirrored fallback copy of `gameContent/countryStops` and `gameContent/monumentPool`.

If the `countries` Firestore collection is empty on load, `services/countryStopsService.js` automatically seeds the 51-country European catalogue (or migrates existing `gameContent/countryStops` edits) via a Firestore batch write. When the collection already exists, the service compares both the embedded country challenge and normalized challenge document against `wordListVersion`; missing or outdated word lists are updated together in one batch without recreating removed countries. `ensureMonumentPoolSeeded()` retains its compatibility name but now only reads and validates the administratively seeded, client-read-only `geoGuessrChallenges` collection; if any required version-2 photo record is missing or outdated, the app uses its bundled pool instead of attempting a client write. The previous single-document array shape was not Firestore-compatible because each location contains array fields of its own. Country-stop edits continue to update the relevant remote data and local cache, while GeoGuessr reads refresh `localStorage` (`tipsy_monument_pool_v2`).

The Realtime Database expects this conceptual structure:

```json
{
  "games": {
    "1234": {
      "difficulty": "medium",
      "duration": "short",
      "nrOfPlayers": "1-4",
      "persons": {},
      "HostName": "Niels",
      "createdAt": 1792195200000,
      "hostDeviceID": "random-and-timestamp-id",
      "status": "lobby",
      "disconnectedAt": 1792195800000,
      "teamModels": {
        "team1": "car1",
        "team2": "vehicle003"
      },
      "routeStops": [
        {
          "id": "belgium-start",
          "name": "Belgium",
          "order": 0,
          "position": { "x": -0.4, "y": 1.93 },
          "accent": "#1ba39c",
          "challenges": []
        }
      ],
      "gameplay": {
        "schemaVersion": 6,
        "sessionId": "m8abc123-roomrun",
        "revision": 4,
        "phase": "moving",
        "activeTeamId": "team1",
        "turnNumber": 3,
        "teamProgress": {
          "team1": { "currentLeg": 2, "isDone": false, "score": 30, "challengePoints": 10 },
          "team2": { "currentLeg": 1, "isDone": false, "score": 10, "challengePoints": 0 }
        },
        "currentAction": {
          "id": "device-action-id",
          "type": "roll",
          "teamId": "team1",
          "value": 4,
          "fromLeg": 2,
          "targetLeg": 6,
          "inputMethod": "boardDice",
          "startedAt": 1792195200000,
          "movementStartsAt": 1792195201850,
          "movementEndsAt": 1792195207000
        },
        "challengeStop": null,
        "challengeStopData": null,
        "challengeId": null,
        "challengeRound": null,
        "roadblock": null,
        "roadblockHistory": [],
        "usedMonumentIds": ["fr-eiffel-tower"],
        "updatedAt": 1792195200000
      }
    }
  },
  "gameContent": {
    "countryStops": {
      "france": {
        "id": "france",
        "name": "France",
        "order": 1,
        "position": { "x": -1.09, "y": 0.1 },
        "accent": "#d71920",
        "challenges": {
          "0": {
            "id": "cafe-charades",
            "title": "Cafe Charades",
            "prompt": "Act out an order without words.",
            "penalty": "Take 1 sip if nobody guesses."
          }
        }
      }
    },
    "monumentPool": {
      "version": 2,
      "monuments": {
        "fr-eiffel-tower": {
          "id": "fr-eiffel-tower",
          "countryName": "France",
          "name": "Eiffel Tower",
          "imageUrl": "https://thumb.wikimedia.org/...",
          "imageSourceUrl": "https://commons.wikimedia.org/wiki/File:...",
          "imageAuthor": "Wikimedia contributor",
          "imageLicense": "CC BY-SA 4.0",
          "photoSource": "wikimedia-commons-curated-v2"
        }
      }
    }
  },
  "players": {
    "1234": {
      "playerCounter": 0,
      "team1": {
        "firebasePushKey": {
          "name": "Niels",
          "isLeader": true,
          "deviceID": "random-and-timestamp-id"
        }
      },
      "team2": {
        "firebasePushKey": {
          "name": "Player 2",
          "isLeader": true,
          "deviceID": "another-id"
        }
      },
      "team3": ""
    }
  }
}
```

The timestamp and route coordinates above are illustrative, and the single `routeStops` item abbreviates the complete room snapshot. Firebase may omit keys whose values are set to `null`, and empty-string team placeholders become objects once players are pushed.

### Room creation

Room IDs are random four-digit strings. They can begin with zero. Collision avoidance is performed client-side by reading the candidate game path and retrying until it does not exist.

This is not transactional: two hosts could theoretically test the same unused ID simultaneously. A production implementation should reserve IDs atomically or use Firebase-generated room IDs plus a separate join-code mapping.

### Identity model

There are no Firebase Authentication users. The client stores a locally generated `deviceID` and includes it in player records. This supports duplicate-join prevention, leader detection, and recognizing the original host on the same installation.

Consequences:

- Clearing app storage changes identity.
- A reinstall generally changes identity.
- Device IDs are not cryptographic credentials.
- Authorization depends on database rules and client behavior, not authenticated roles.

### Disconnect and expiration

The host registers an `onDisconnect` operation that writes a server timestamp to `games/{gameID}/disconnectedAt`. A joining client rejects a room if that timestamp is older than ten minutes.

When the original host rejoins from the same device:

1. The host device ID matches.
2. `disconnectedAt` is cleared.
3. A fresh disconnect handler is registered.

The room is not automatically deleted. Earlier removal code is present but commented out.

### Realtime listeners

The lobby listens to:

- `players/{gameID}` for roster changes.
- `games/{gameID}` for settings and status changes.

Listeners are detached when the lobby unmounts.

`GameScreen` listens to `games/{gameID}/gameplay`, `.info/connected`, and
`.info/serverTimeOffset`. The gameplay listener drives the local board toward
the shared phase and progress. A monotonically increasing revision and unique
action ID make transitions and animations idempotent. Roll, movement-complete,
roadblock-choice, challenge-stage, challenge-complete, and restart writes use Realtime Database transactions.
Movement completion updates route points without overwriting earned challenge points. A successful country-word round transactionally adds its configured points. Reaching Greece
transactionally assigns the next finish position and its podium bonus, so
simultaneous clients cannot award two teams the same place.

The active team's leader is the only client UI allowed to roll and complete a
challenge. Every connected client may attempt the idempotent internal movement
finalization after the stored movement deadline so a disconnected rolling
device does not permanently stall the room. The host alone can restart a
completed session.

### Security considerations

The repository does not include Firebase Realtime Database security rules. Before public deployment, verify that the deployed rules prevent arbitrary users from:

- Editing unrelated rooms.
- Claiming host privileges.
- Removing leaders or other players.
- Modifying another team’s selected model.
- Reading rooms without an appropriate join mechanism.

The Firebase web API key in `firebaseConfig.js` identifies the project but is not, by itself, an authorization boundary. Security must be enforced through Authentication and database rules.

Cloud Firestore rules are versioned in `firestore.rules` and deployed through `firebase.json`. GeoGuessr location/photo documents and their manifest are publicly readable game content but deny all client creates, updates, and deletes. The pre-existing `countries` and `challenges` collections retain public writes for compatibility with the unauthenticated web Dev Portal; this is a known development-only risk until Firebase Authentication and an administrator role protect those authoring paths.

---

## 13. Navigation contracts

### Create setup → HostName

```js
{
  difficulty: 'easy' | 'medium' | 'hard',
  duration: 'short' | 'medium' | 'long',
  nrOfPlayers: '1-4' | '5-8' | '9-12',
  persons: {}
}
```

### HostName → LobbyScreen

```js
{
  gameID,
  isHost: true,
  hostName,
  ...gameSettings
}
```

The lobby ultimately reloads the canonical game record from Firebase.

### JoinGameScreen → LobbyScreen

```js
{
  gameID,
  isHost,
  gameSettings
}
```

### LobbyScreen → CharacterSelection

```js
{
  gameID,
  gameData,
  teamMembers
}
```

### LobbyScreen → CreateGameScreen (host edits)

```js
{
  editingGameID,
  gameSettings: {
    difficulty,
    duration,
    nrOfPlayers,
    persons
  }
}
```

Completing this edit flow returns to the same mounted `LobbyScreen` for the same game ID; its realtime listener receives the updated settings. The edit path does not call the room-creation or host-insertion path.

### CharacterSelection → GameScreen

```js
{
  gameID,
  gameData: {
    ...gameData,
    teamModels: {
      ...existingModels,
      [playerTeam]: selectedModelId
    }
  },
  teamMembers
}
```

`GameScreen` consumes all three values. `gameID` selects the gameplay record,
`teamMembers` maps the local AsyncStorage device ID to its team/leader role, and
`gameData` supplies host identity, room settings, and vehicle models.

### Header / DevPortal → AccountScreen & SettingsScreen

Header buttons across setup screens (`Home`, `CreateGameScreen`, `HostName`, `JoinGameScreen`, `CharacterSelection`) and the DevPortal screen switcher navigate to `AccountScreen` and `SettingsScreen` without required parameters. Both screens mount a `<Header showBackButton title="..." onBackPress={() => navigation.navigate('Home')} />` control and a navigation `beforeRemove` listener that always return players directly to `Home`. Tapping between `AccountScreen` and `SettingsScreen` via the header icon buttons uses route replacement (`replace`) to prevent nested back stacks.

---

## 14. Assets and visual design

### Active asset groups

| Directory/file | Purpose |
|---|---|
| `assets/animations/animatie-wereld.json` | Main looping globe animation |
| `assets/animations/splash-animation.json` | Loading animation asset |
| `assets/fonts/` | Dogica fonts |
| `assets/icons/` | App and splash icons |
| `assets/images/` | Beer difficulty graphics and UI icons |
| `assets/map.svg` | Editable vector source for the country geometry (unused raster map exports were removed; see git history) |
| `assets/models/world-map-vector.glb` | Prebuilt extruded world silhouette and Europe country borders |
| `DRINKING_GAME_CHALLENGE_RESEARCH.md` | Public app-mechanic research and an original, safety-filtered challenge bank |
| `scripts/build-vector-map.mjs` | Regenerates the runtime GLB from `assets/map.svg` |
| `assets/models/location.glb` | Country pin geometry |
| `assets/models/*.glb` | Selectable team vehicles |

The shared home/setup globe layout sizes the Lottie artboard with its source
aspect ratio and compensates for the source artwork being authored left of the
composition's center. It also crops the animation upward so the globe clears
the separately rendered wordmark. Native uses `lottie-react-native`; web uses
the installed `DotLottieReact` renderer directly so the configured frame segment
autoplays and loops reliably. Both renderers share the same sizing and cropping
layout, keeping the visible globe, rather than only its transparent Lottie
canvas, aligned consistently on iOS, Android, and web.

### Metro asset support

`metro.config.js` adds `glb`, `gltf`, `mtl`, and `obj` to Metro’s asset extensions. It also adds Android platform detection middleware for requests that lack an explicit Expo platform.

It also resolves every bare `three` import to `node_modules/three/build/three.module.js`. three ships separate `import` (`three.module.js`) and `require` (`three.cjs`) builds, and Metro was bundling both, which printed "Multiple instances of Three.js being imported" and added about 2.2 MB to the Android bundle (17.5 MB to 15.2 MB unminified, measured with `expo export`). `@react-navigation/stack` is kept at 7.12+ because earlier versions called the deprecated React Native `InteractionManager` on React Native 0.82+.

### Oversized and duplicate assets

The unused raster map exports were removed from the repository (they remain in
git history). `map.svg` is the editable source and `world-map-vector.glb` is the
runtime board asset.

`assets/model.gltf` is approximately 153 MB, is not referenced by application code, is ignored by Git because it exceeds GitHub’s 100 MB file limit, and remains available only in local working copies that already have it.

### Mobile map budget

The current board loads the approximately 1.9 MB quantized vector-derived GLB rather than a
large raster map texture. The asset includes indexed extruded coastline geometry
and deduplicated Europe shared-border lines. The renderer frames the
Europe viewport at runtime, so zoomed views remain crisp without
loading the `7016 × 4961` source export or duplicating route coordinates for a
cropped asset. Antialiasing and a device-pixel ratio up to 1.5 are also enabled
in Expo Go development sessions.

The device-pixel-ratio cap limits GPU load while preserving smoother vector
edges on physical devices.

---

## 15. Native projects and platform configuration

### Expo configuration

`app.json` defines:

- Default orientation at the app level; `GameScreen` locks landscape at runtime.
- Light UI style.
- Tablet support on iOS.
- Edge-to-edge layout on Android, as required by the current React Native/Expo Android runtime.
- Expo Font, Screen Orientation, Asset, Splash Screen, and Status Bar plugins.
- Expo SDK 58 uses React Native's New Architecture; the checked-in native projects keep their corresponding native flags enabled.
- App icons, splash image, bundle identifiers, and EAS project ID.

### iOS

The iOS project uses:

- CocoaPods.
- Hermes.
- New Architecture.
- Deployment target 16.4.
- Expo dev-client local-network access.
- Expo SDK 58's precompiled core modules and prebuilt React Native artifacts when available.

The `Podfile` forces every pod target and resource bundle to deployment target 16.4, the minimum supported by Expo SDK 58.

`AppDelegate.swift` configures Expo’s React Native factory. Expo SDK 58's `ExpoAppSceneDelegate` creates the window and starts React Native through the scene lifecycle required when building against the iOS 27 SDK.

`Info.plist` registers the SceneDelegate and the app URL schemes.

### Android

The Android project uses:

- Kotlin application/activity entry points.
- Hermes.
- New Architecture/Fabric.
- AndroidX.
- Edge-to-edge rendering.
- Expo splash-screen registration.
- R8 shrinking and optimization for release builds.
- Gradle 9.4.1 through the checked-in wrapper.
- Debug signing for both debug and current release configuration.

The current release build uses the debug keystore. A real production release must use a private production signing key.

### EAS profiles

- `development`: development client; iOS targets the simulator; Android uses internal distribution.
- `preview`: internal distribution.
- `production`: automatically increments the version.

---

## 16. Running and building the project

### Prerequisites

- Node.js 22.13 or newer on the 22 line, 24.3 or newer on the 24 line, or Node.js 26 and npm.
- Xcode with an iOS runtime for iOS development.
- CocoaPods dependencies installed through the project workflow.
- Android Studio/SDK for Android development.
- Network access for Firebase and first-time package/tool downloads.

### Install JavaScript dependencies

```bash
npm install
```

### Run on a physical phone with Expo Go

```bash
npm start
```

This is the primary demo workflow. It starts Expo SDK 58 Metro explicitly in
Expo Go mode, advertises it over the local network, and prints a QR code. Keep
the terminal open, put the Mac and phone on the same Wi-Fi network, and scan the
QR code with the iPhone camera or from Expo Go on Android.

On a physical iPhone, Expo CLI and Expo Go must be signed in to the same Expo
account. If the local network prevents the phone from reaching the Mac, use the
slower tunnel fallback:

```bash
npm run start:tunnel
```

### Run the native iOS development client

```bash
npm run ios:native
```

The custom `scripts/run-ios.sh` does the following:

1. Checks whether Metro is already healthy on port 8081.
2. Starts the project’s Expo SDK 58 Metro server when needed.
3. Waits up to 60 seconds for Metro.
4. Runs the native build using the project-local Expo SDK 58 CLI.
5. Uses a booted simulator or lets Expo choose an available default.
6. Passes `--no-bundler` so the build uses the already-running SDK 58 Metro server.
7. Forces the simulator development client and Metro to use the same localhost address.
8. Keeps Metro alive when the script started it.

This installs and launches the project’s native Expo development client; it
does not use Expo Go. To target a particular simulator, pass its name after
`--` or set `IOS_SIMULATOR_DEVICE`:

```bash
npm run ios:native -- "iPhone 18 Pro Max"
IOS_SIMULATOR_DEVICE="iPhone 18 Pro Max" npm run ios:native
```

### Run Android

```bash
npm run android
```

### Run web

```bash
npm run web
```

The game depends on native Expo GL behavior and is primarily designed for iOS/Android. Web should be treated as an additional compatibility target, not the reference platform.

### Normal Expo Go development loop

1. Install Expo Go on the phone.
2. Put the phone and Mac on the same Wi-Fi network.
3. Run `npm start`.
4. Scan the QR code and leave the terminal open.
5. Save JavaScript changes for Fast Refresh.
6. Use `npm run start:tunnel` when LAN discovery or routing is blocked.

---

## 17. Testing guide

There is currently no automated test runner, lint script, or checked-in Jest configuration. Testing is manual.

### Smoke test: Expo Go on a physical phone

1. Temporarily change `START_ON_DEV_GAME_SCREEN` to `__DEV__ && true`.
2. Run `npm start`, scan the QR code, and open the project in Expo Go.
3. Confirm the map, pins, GLTF vehicles, and 3D die render cleanly with a thin light-blue line connecting every route stop.
4. Drag and throw the die.
5. Confirm the landed die flies toward the screen, presents the rolled face toward the camera, fades out cleanly before the vehicle starts driving, and the animated route path lays out from the active vehicle to the destination stop.
6. Confirm the active vehicle smoothly accelerates, follows the animated route path, and brakes into the destination stop while consuming the path.
7. Confirm the camera stays in overview during the path reveal, follows during vehicle movement, and returns to overview afterward.
8. Confirm the appropriate challenge appears.
9. Press `DONE / NEXT TURN` and confirm Team 2 becomes active.
10. Use the tracker roll button and confirm it lays out the animated route path and moves without a 3D die throw animation.
11. Confirm the narrow right-side race tracker sits fully inside the device safe area while waiting, shows every team's vehicle and the compact roll action, fades out during rolling, movement, and the challenge card, then fades back in for the next turn.
12. Restore `START_ON_DEV_GAME_SCREEN` to `false` after the focused board test.

### Smoke test: full multiplayer flow

Use at least two separate installations or clear/device-specific storage carefully:

1. Create a game on Device A.
2. Verify a four-digit game ID appears.
3. Join from Device B.
4. Confirm Device B is assigned to Team 2 and becomes its leader.
5. Confirm both devices see lobby roster changes in realtime.
6. Try starting with too few players and confirm validation.
7. Start from the host and confirm both clients navigate to character selection.
8. Select a model from each leader device.
9. Inspect Firebase to confirm `teamModels` values.
10. Confirm every client enters `GameScreen` with Team 1 active.
11. Confirm the persistent board route matches the itinerary selected by duration, begins in Belgium, and ends in Greece.
12. Create another room with the same duration and confirm its snapshot can use a different corridor and/or intermediate countries without changing the stop count.
13. Confirm only Team 1's leader can roll, every result is between 1 and 3, and every device shows the same result and vehicle movement.
14. Confirm each reached stop adds 10 route points on every client.
15. With a one-player active team, confirm `Guess the Country Word` is never selected.
16. With at least two players on the active team, reach stops until `Guess the Country Word` is selected. Confirm the active leader's device names an explainer with a START button, other clients never render the secret, pressing START immediately starts the 30s timer and shows an explanation popup overlay for 7 seconds, the secret word is revealed after the explanation finishes with ~23s remaining, and the timer expires at 0 seconds.
17. Press `GUESSED` and confirm exactly 10 challenge points are added on every client. In a separate round, confirm `NOT GUESSED` and timeout add zero points and Next Turn stays disabled until a result exists.
18. Confirm every device opens the same ordinary challenge and only the active team's leader can press `DONE / NEXT TURN`.
19. Repeat for the other teams and confirm turns, route positions, finished-team skipping, and tour completion remain identical.
20. Close one non-active client, complete another turn, rejoin through the room PIN, and confirm it opens the active game at the canonical Firebase state.
21. Finish the tour and confirm all clients show the same finish order, podium bonuses, challenge points, total scores, and winner.
22. Restart from the host and confirm every device resets to Team 1 at Belgium with zero points without changing that room's snapshotted route.
23. Put Team 1 at least two stops ahead, roll repeatedly until a roadblock appears, and confirm every client shows the same obstacle, challenge, hidden-country detour preview, and leader-only controls.
24. Complete the hard challenge and confirm the obstacle disappears before the car follows the original route. In a separate event, take the detour and confirm the overview frames the full route and labels both hidden-country pins before selection; then confirm the car stops at each hidden country, opens that country's challenge, remains there until completion, and only receives normal route progress after reaching the original rolled stop.

### Reconnection test

1. Create a room as host.
2. Disconnect or close the host app long enough for Firebase to write `disconnectedAt`.
3. Rejoin on the same installation and confirm host recognition.
4. Confirm the disconnect marker is cleared.
5. To test expiry, use a timestamp older than ten minutes and confirm join is rejected.

### 3D performance checks

Test on physical hardware:

- First scene load time.
- Blank-scene frequency after reload.
- Die pointer responsiveness.
- Frame rate during marker pulses and vehicle motion.
- Memory use while all vehicle GLBs are preloaded.
- Visual correctness of preserved model textures.
- Landscape layout on small and large screens.

Physical devices are the reference for Expo GL, GPU behavior, die physics,
camera motion, GLTF appearance, and final 3D performance.

---

## 18. Known limitations and technical debt

### Platform pitfalls

- **Do not spread `StyleSheet.absoluteFillObject` or `StyleSheet.absoluteFill`.** Current React Native no longer exports `absoluteFillObject`, so spreading it gives an empty style on iOS and Android while still working on web. On web, `absoluteFill` is a registered style ID that cannot be spread. Either way an overlay silently stops being absolutely positioned and pushes the board canvas aside instead of covering it. Write `position: 'absolute', top: 0, right: 0, bottom: 0, left: 0` explicitly, or pass `style={StyleSheet.absoluteFill}` without spreading.

### Gameplay and synchronization

1. **Peer-authoritative rolls.** Transactions prevent duplicate turns, but the active leader's client still generates the random value; trusted anti-cheat rolls require backend logic.
2. **Animation clocks are approximate.** Clients use the Firebase server-time offset and shared movement deadlines, but rendering remains local and slow/backgrounded devices may catch up by snapping to canonical state.
3. **Difficulty is unused.** Easy/medium/hard do not alter challenges or penalties.
4. **Duration controls the itinerary only.** Short/medium/long choose different routes and stop counts but do not change challenge difficulty or a timer.
5. **Challenges are honor-based.** Pass/fail and penalties are not recorded, so challenge outcomes do not add or remove points.

### Firebase and identity

1. The client has no Firebase Authentication integration.
2. Device IDs are locally generated and can be reset or imitated.
3. Join-code reservation is not atomic.
4. Host permissions are enforced mainly in UI logic.
5. Cloud Firestore rules are versioned in this repository, but Realtime Database rules are not. Firestore authoring for `countries` and `challenges` also remains unauthenticated for compatibility with the development portal.
6. `playerCounter` is not consistently updated for host creation and network joins; most balancing logic correctly counts team objects directly instead.
7. Empty teams begin as empty strings, so the Firebase value type changes when players are added.
8. The web-only content editor writes the shared `gameContent/countryStops` catalogue without an authenticated content-admin role; deployed database rules must restrict this path before the portal is used outside trusted development.

### UI and code quality

1. The direct-to-game development shortcut is manual and requires editing `START_ON_DEV_GAME_SCREEN`; there is no in-app or environment-based toggle.
2. Lobby rules remain a concise modal summary; full interactive guides and preference management are available in `SettingsScreen`.
3. Several imports, state values, and components are unused.
4. `LoadingComponent` references an undefined `animation` ref and uses a non-relative asset path; it is currently unused.
5. `ModelTestPanel` exists but is not mounted.
6. `PlayerBox` and `TeamContainer` wrap the removal callback in a confusing way; it works through the wrapper but the prop signature is inconsistent.
7. No TypeScript, schema validation, error boundary, test suite, or lint command is configured.
8. Firebase failures are mostly logged rather than surfaced with consistent recovery UI.

### 3D and assets

1. Three.js logs a multiple-instance warning because a transitive `stats-gl` dependency contains Three.js 0.170 while the app uses 0.184.
2. Expo GL does not reliably render on the iOS Simulator; use Expo Go on a physical phone for the real 3D scene.
3. Vehicle previews are loaded on demand, but cycling through many textured vehicles in one session can still increase the loader cache and memory pressure.
4. Replacing materials may discard advanced GLTF material properties.
5. The challenge animation, marker animation, dice animation, camera movement, and cars all run concurrently.
6. `world-map-vector.glb` is generated from `map.svg`; run `npm run build:map` after changing the SVG or the generator settings, then quantize it (see the header of `scripts/build-vector-map.mjs`).
7. The master catalogue contains 51 stops, but an active route renders at most 12 marker instances. Physical-device performance still requires profiling on representative iOS and Android hardware.

### Native/release readiness

1. Android release currently uses debug signing.
2. No CI workflow is included.
3. There is no environment-based Firebase project selection.
4. The iOS launcher uses the project-local Expo CLI, so it does not download a second CLI version.
5. Native directories are checked in, so Expo config changes must be kept consistent with native project files.
6. `expo-doctor` reports its non-CNG sync warning because the native directories are intentionally checked in; 19 of its 20 checks otherwise pass after the SDK 58 upgrade.

---

## 19. Safe extension points

### Harden synchronized gameplay

The gameplay subtree and transaction-backed client state machine are implemented.
The next hardening step is to generate dice results in trusted backend logic and
validate actions with Firebase Authentication plus versioned Realtime Database
rules. Preserve the existing gameplay schema and action revisions so clients can
continue to animate toward one canonical state.

### Activate difficulty

Possible mapping:

- Easy: social prompts, no timer, light penalties.
- Medium: timed prompts, standard penalties.
- Hard/Lethal: harder prompts, shorter timers, stronger optional penalties.

Keep challenge content separate from rendering and select a challenge from a country/difficulty pool.

### Extend duration modes

Duration currently snapshots randomly sampled 6, 9, and 12-stop Belgium-to-Greece itineraries from data-driven corridor definitions. Future modes can make corridor definitions remotely configurable or add more route families, laps, and target scores. Preserve the room-level route snapshot so content edits and later random calls never mutate an active game.

### Improve rendering performance

Prioritized order:

1. Remove unused map exports from the application bundle.
2. Add a native loading overlay around the physical-device canvas.
3. Convert repeated marker rings to instanced meshes.
4. Add explicit preview-cache eviction after measuring model-switch memory on physical devices.
5. Align Three.js dependency versions.
6. Profile on representative physical iOS and Android devices.

### Add automated tests

High-value pure-function tests:

- Team count from player range.
- Initial team progress.
- Next unfinished team selection.
- Roll clamping at the finish.
- Join capacity and team balancing.
- Challenge lookup.
- Model fallback.
- Route stop ordering and stop-distance monotonicity.

Then add component/integration tests for navigation and Firebase adapters. Extract Firebase operations from screens into a service layer to make mocking practical.

---

## 20. File and component reference

### Root

| File | Responsibility |
|---|---|
| `index.js` | Imports gesture handler and registers the root Expo component |
| `package.json` | Dependencies and development scripts |
| `app.json` | Expo app metadata and plugins |
| `eas.json` | EAS build/submit profiles |
| `firebaseConfig.js` | Firebase initialization and exports for Realtime Database (`db`) and Cloud Firestore (`firestore`) |
| `metro.config.js` | Metro asset extensions, single-copy `three` resolution, and Android request middleware |
| `scripts/run-ios.sh` | Xcode 27/Device Hub-compatible iOS development launcher |

### Navigation and development

| File | Responsibility |
|---|---|
| `app/app/app.js` | Font loading and stack navigator |
| `app/app/devGameRoute.js` | Direct-to-game development flag and mock route parameters |

### Setup, account, and lobby screens

| File | Responsibility |
|---|---|
| `app/home/home.js` | Home screen |
| `app/CreateGame/CreateGame.js` | Three-stage room settings wizard |
| `app/CreateGame/components/GameSettingButton.js` | Selectable setting card |
| `app/CreateGame/components/GameSettingOptionContainer.js` | Three-option setting layout |
| `app/HostName/HostName.js` | Host identity and room creation |
| `app/JoinGame/JoinGame.js` | Room validation and team assignment |
| `app/Lobby/Lobby.js` | Realtime roster and host start controls |
| `app/Lobby/components/TeamContainer.js` | Team roster panel |
| `app/Lobby/components/PlayerBox.js` | Player chip/removal UI |
| `app/CharacterSelection/CharachterSelection.js` | Leader detection, vehicle preview, and selection |
| `app/Account/Account.js` | Local player profile, badges, stats, and device ID management |
| `app/Settings/Settings.js` | Audio/haptic switches, drinking modes, timer pace, 3D options, and guide |

### Game controller and 3D components

| File | Responsibility |
|---|---|
| `app/GameScreen/GameScreen.js` | Shared/local game controller and scene/overlay orchestration |
| `app/GameScreen/gameplayState.js` | Gameplay schema initialization, team rotation, action IDs, and roll timing |
| `app/GameScreen/hooks/useMultiplayerGame.js` | Firebase gameplay subscription, identity mapping, and transactional actions |
| `components/GameScene.js` | Canvas and 3D scene composition |
| `components/MapPlane.js` | Continuous ocean plane and raised vector-map viewport |
| `components/DottedRouteLine.js` | Animated route path ribbon, flowing chevrons, and waypoint rings |
| `components/CountryMarkers.js` | Destination markers (one scene and material clone per marker), occupancy fades, and active-marker animation |
| `components/GamePieces.js` | Per-team vehicle mapping |
| `components/GamePiece.js` | GLTF preparation and route movement |
| `components/VehicleModel.js` | Shared vehicle cloning, materials, normalization, and preview/board transforms |
| `components/BoardDice.js` | Interactive die plus local or remotely commanded camera-facing result animation, with `visible` prop to hide during authoring/placement |
| `components/CameraController.js` | Overview/follow camera interpolation |
| `components/GameHud.js` | Active-team, route, and phase text |
| `components/RaceProgressTracker.js` | Waiting-phase right-side team route progress, finish-line, and roll overlay |
| `components/RoutePreview.js` | Legacy route-preview card retained for possible reuse; it is not mounted by `GameScreen` |
| `components/ChallengePopup.js` | Country challenge card overlay |
| `components/CountryStopPlacementForm.js` | Web map-placement instructions and new-stop/challenge form |
| `components/CityLandmark.js` | Pixel-style city landmark SVGs for the challenge ticket stub |
| `components/RoadblockFigure.js` | Procedural low-poly sawhorse roadblock barrier with hazard stripes, strobe beacons, detour sign, and traffic cones |
| `components/RoadblockOverlay.js` | Leader-only roadblock choice, timed hard challenge, spectator state, and hidden-country detour summary |
| `components/DetourRouteLine.js` | Gold 3D preview ribbon for temporary roadblock detours; the shared country-marker renderer supplies labeled pins |
| `components/ModelTestPanel.js` | Unused development model switcher |

### Game constants

| File | Responsibility |
|---|---|
| `constants/mapCoordinates.js` | Board dimensions and UV-to-world conversion |
| `constants/roadblocks.js` | Eligibility/cooldown rules, deterministic challenges, hidden-country detour selection, staged movement timing, palette, and 3D placement |
| `constants/route.js` | Builds runtime curves, lengths, tangent helpers, and stop distances from ordered stop data |
| `constants/countryStops.js` | Default catalogue, normalization, duration counts, and old-room fallback |
| `constants/movement.js` | Shared vehicle speed used by rendering and synchronized action timing |
| `constants/camera.js` | Overview and follow-camera geometry |
| `constants/diceBounds.js` | Allowed die interaction region |
| `constants/gamePieces.js` | Team IDs, colors, counts, and initial progress |
| `constants/modelOptions.js` | Vehicle registry and transforms |
| `constants/boardAssets.js` | Map and marker GLB sources plus `preloadBoardAssets()` |
| `constants/challenges.js` | Flag presentation, challenge selection, and legacy fallback content |
| `services/countryStopsService.js` | Cloud Firestore (`countries`, `challenges`, and normalized `geoGuessrChallenges` plus its manifest) catalogue reads, single-doc mutations, auto-seeding, local cache, and RTDB fallback |

### Shared UI and local storage

| File/group | Responsibility |
|---|---|
| `shared/components/Header` | Back/profile/settings header with vector icons and tactile press states |
| `shared/components/Header/HeaderIcons` | Vector SVG Account and Settings icon components |
| `shared/components/BackButton` | Navigation back action |
| `shared/components/Button` | Standard pill-shaped action button |
| `shared/components/InputField` | General text input |
| `shared/components/NumberInput` | Four-digit numeric input |
| `shared/components/LowerButtonContainer` | Paired lower navigation buttons |
| `shared/components/MainAnimation` | Globe Lottie and app title |
| `shared/components/LoadingComponent` | Currently unused loading animation |
| `shared/storage/userSettings.js` | AsyncStorage persistence for player profile, badges, stats, and settings |
| `shared/styles/SafeAreaView` | Android safe-area adjustment |

### Developer tools

| File/group | Responsibility |
|---|---|
| `shared/dev/devConfig.js` | Evaluates `EXPO_PUBLIC_ENABLE_DEV_PORTAL` and `__DEV__` to determine portal visibility |
| `shared/dev/DevPortal.js` | Root dev portal container mounting floating button and modal |
| `shared/dev/DevPortalButton.js` | Draggable/dockable on-screen floating trigger button (`⚡ DEV`) |
| `shared/dev/DevPortalModal.js` | Tabbed developer portal overlay, including the web-only Countries entry point |
| `shared/dev/CountryStopsTab.js` | Web-only ordered stop list, challenge management, removal, and map-placement actions |
| `shared/dev/devNavigation.js` | Global navigation ref, instant screen starters (`startInstantGameScreen`, `startInstantCharacterSelection`, `startLiveTestLobby`) |
| `shared/dev/devFirebaseService.js` | Bot player generation, 1-tap lobby auto-fill, team vehicle ready-up, live test room provisioning |
| `shared/dev/devEventBus.js` | Decoupled event bus for in-game dev actions (forceRoll, testChallenge, skipChallenge, roadblocks, restart) and country placement handoff |

### Native code

| Path | Responsibility |
|---|---|
| `ios/Podfile` | Expo/React Native pod integration and deployment target fix |
| `ios/TipsyTraveller/AppDelegate.swift` | Expo bootstrap, links, and iOS 27 scene lifecycle |
| `ios/TipsyTraveller/Info.plist` | iOS capabilities, orientations, fonts, URL schemes, and scene registration |
| `android/app/src/main/.../MainActivity.kt` | Android React activity and splash registration |
| `android/app/src/main/.../MainApplication.kt` | Android React/Expo application bootstrap |
| `android/app/build.gradle` | Android packaging, build types, and engine dependencies |

---

## Closing summary

TipsyTraveller has a playable synchronized board game, a visually distinctive 3D presentation, and a Firebase-backed room, lobby, vehicle-selection, and gameplay flow. Firebase owns the canonical turn-level state while React and Three.js keep per-frame animation local. The next major product milestones are authenticated/rules-enforced gameplay actions, trusted dice generation, and continued profiling of map geometry and draw calls for reliable mobile GPU performance.

Once those items are addressed, the existing separation between screen flow, game controller, static game definitions, 3D scene components, and React Native overlays provides a practical base for additional routes, challenge sets, game modes, and production multiplayer behavior.
