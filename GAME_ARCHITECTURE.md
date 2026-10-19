# TipsyTraveller: Game and Architecture Documentation

> Detailed reference for the current implementation of TipsyTraveller.
>
> Last reviewed against the source code: 19 October 2026.

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

Firebase Realtime Database provides room creation, joining, team rosters, lobby updates, host reconnection metadata, and selected team models. AsyncStorage gives each installation a persistent anonymous device identifier.

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
| Application framework | Expo SDK 57 |
| UI framework | React Native 0.86 / React 19.2 |
| JavaScript engine | Hermes |
| Native architecture | React Native New Architecture enabled |
| Navigation | React Navigation stack |
| 3D rendering | Three.js, React Three Fiber, Drei, Expo GL |
| Realtime backend | Firebase Realtime Database |
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
- Alternative HUD button for immediately generating a roll.
- Animated vehicle movement along a curved route.
- Animated country markers and camera following.
- Configurable location challenge cards.
- Turn switching, route completion, and local restart.
- iOS 27/Xcode 27 development support through Device Hub.

### Partially implemented

- Multiplayer synchronization stops after lobby/model selection. Live turns and board progress are local React state.
- Reconnection recognizes the original host device, but no full game-state restoration exists.
- Difficulty and duration are stored in Firebase but do not modify gameplay.
- Profile and settings icons are visible but have no actions.
- The lobby `RULES` button opens a concise rules summary. Profile and settings icons remain decorative.
- The game shows “Tour complete” when all teams finish, but it does not rank teams or announce a winner.

### Development-mode behavior

`app/app/devGameRoute.js` contains `START_ON_DEV_GAME_SCREEN = false`, so development and production builds start by default on `Home`.

In development mode, a floating on-screen **Dev Portal** button (`⚡ DEV`) is rendered across all screens (managed by `app/shared/dev/DevPortal.js`). Its presence is controlled by:

1. `EXPO_PUBLIC_ENABLE_DEV_PORTAL` in `.env` or `.env.local` (set to `true` or `false`).
2. `__DEV__` React Native global flag (fallback when the env variable is omitted).

The Dev Portal provides four tabbed capability suites:

- **Screens / Quick Start**: Instant 1-tap navigation to `GameScreen` with mock 2-team or 3-team configurations (zero Firebase/lobby setup required), mock `CharacterSelection`, live Firebase test room creation directly to `LobbyScreen`, or arbitrary app screens (`Home`, `CreateGameScreen`, `HostName`, `JoinGameScreen`).
- **Multiplayer & Bots**: Detects or accepts any 4-digit game PIN and provides 1-tap lobby filling (`autoFillLobby`), adding bot players to specific teams (`+ Bot Team 1/2/3`), auto-assigning default vehicles to unready teams in Firebase (`readyUpTeams`), and clearing added test bots without needing multiple physical devices or manual database edits.
- **Board & Game Tools**: Allows forcing exact dice roll values (1 to 6) to test specific travel legs and stop arrival animations, triggering country challenge cards (stops 1 through 7) directly, and resetting board state.
- **Identity & Tools**: Displays the persistent anonymous `deviceID` from AsyncStorage, supports 1-tap device ID regeneration to simulate fresh installations, and displays runtime environment flags.

The development mock game assigns room ID `DEV-INSTANT` or `DEV-MOCK` and operates completely offline unless live Firebase room creation is explicitly requested.

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
8. Teams take turns rolling a die.
9. A team advances by the rolled number of route stops, capped at the final stop.
10. On a non-final landing, the active team performs the displayed country challenge.
11. Pressing `DONE / NEXT TURN` passes play to the next unfinished team.
12. Finished teams are skipped in later turn rotation.
13. The game ends after every team reaches the configured final stop.

### Team count rules

| Player setting | Teams | Room capacity | Minimum to start |
|---|---:|---:|---:|
| `1-4` | 2 | 4 | 2 |
| `5-8` | 2 | 8 | 2 |
| `9-12` | 3 | 12 | 3 |

The host is inserted into Team 1 as its leader. In a two-team room, the first joining player assigned to Team 2 becomes Team 2’s leader. In a three-team room, the first member of any empty team becomes that team’s leader.

### Route and stop numbering

The board route is an ordered collection of destination coordinates joined by travel legs. A typical route contains:

- A starting stop.
- One or more intermediate destinations.
- A final stop, which may return to the starting location or end elsewhere.

Stop index `0` is the initial position. Every following index represents another destination along the route. Intermediate stops may resolve to a challenge, while the final stop completes that team’s journey. The exact number of stops and their names are content choices and can change without altering the basic turn state machine.

The current implementation stores route geometry and display names in `constants/route.js` and challenge content in `constants/challenges.js`. Those files contain the active content set, but this architecture document intentionally does not duplicate that list because routes and challenges are expected to expand over time.

### Roll behavior

- Rolls are integers from 1 through 6.
- Movement cannot overshoot the finish.
- Landing at the finish immediately marks that team done.
- Landing before the finish opens a challenge.
- There is no collision rule; multiple teams may occupy the same stop.
- There are no shortcuts, reverse movement, bonus rolls, or stored penalties in the current code.
- Drinking penalties are instructions only; the app does not record whether a challenge was passed or failed.

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
    Next -->|All teams finished| Complete[Tour complete]
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

Every stack header is hidden; each screen supplies its own header or controls.

---

## 5. Gameplay state machine

`GameScreen` is the authoritative controller for a local board session. It owns the state machine and passes data and callbacks into the renderer and overlays.

```mermaid
stateDiagram-v2
    [*] --> waiting
    waiting --> rolling: 3D die picked up/thrown
    waiting --> moving: HUD Roll Dice button
    rolling --> moving: die animation reports result
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
| `waiting` | Active team may roll | 3D die and HUD roll button enabled |
| `rolling` | 3D die is animating | Additional rolls blocked |
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
| `teamProgress` | Per-team `{ currentLeg, isDone }` data |
| `pieceRefs` | React refs for each Three.js vehicle group, used by the camera |
| `activeCarProgressRef` | React ref tracking the active vehicle's normalized curve progress so the route ribbon trims behind the car |

### Turn rotation

`getNextActiveTeamIndex` scans forward, wraps around, and returns the next team whose `isDone` flag is false. If no unfinished team exists, it returns `null` and the game enters `done`.

### Reset behavior

Restart clears rolls, targets, active movement, challenges, and team progress. It does not modify Firebase and does not ask other devices to restart.

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
- `GameScreen.js` owns the local game rules and turn state.
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
├── TourControl (React Native absolute overlay)
└── ChallengePopup (React Native modal-style absolute overlay)
```

This keeps long text, buttons, and accessibility semantics out of WebGL while reserving WebGL for spatial content.

### Data ownership

| Data | Owner | Persistent? | Shared? |
|---|---|---:|---:|
| Device ID | AsyncStorage | Yes | No |
| Room settings | Firebase `games/{gameID}` | Yes | Yes |
| Team roster | Firebase `players/{gameID}` | Yes | Yes |
| Team model choice | Firebase `games/{gameID}/teamModels` | Yes | Yes |
| Current turn | `GameScreen` React state | No | No |
| Die result | `GameScreen` React state | No | No |
| Team route progress | `GameScreen` React state | No | No |
| Current challenge | Derived/local React state | No | No |

---

## 7. Screen-by-screen reference

### `Home`

Purpose: entry point for normal sessions.

- Shows the looping globe Lottie animation and TipsyTraveller wordmark.
- Shows the tagline “Take a roadtrip and drink your way to victory!”
- `CREATE GAME` navigates to `CreateGameScreen`.
- `JOIN GAME` navigates to `JoinGameScreen`.
- The content scrolls when necessary and the globe/wordmark scales to the available phone height instead of relying on a fixed-size layout.
- Profile and settings icons are decorative at present.

### `CreateGameScreen`

Purpose: collect the room configuration in three sequential steps.

1. Difficulty: `easy`, `medium`, or `hard` (displayed as Easy, Medium, Lethal).
2. Duration: `short`, `medium`, or `long`.
3. Player range: `1-4`, `5-8`, or `9-12`.

The next button only advances after the current option is selected. The final step navigates to `HostName` with the settings as route parameters.
The back control returns to the previous setup step before leaving the setup flow, and the next control is visibly disabled until the current choice is made.
The setup globe and wordmark use a larger compact presentation, while each option group is anchored near the bottom controls so the choices remain visually connected to the navigation arrows.

When the host returns from an existing lobby, the same setup screen is opened in edit mode with the current choices preselected. Completing the steps transactionally updates the existing `games/{gameID}` record while preserving its ID, host metadata, and `players/{gameID}` roster. A player-range reduction is rejected if the current roster would not fit or Team 3 still has members.

Current caveat: difficulty and duration are persisted but are not consumed by the game rules. All three duration choices also reuse the beer-bottle images originally used for difficulty.

### `HostName`

Purpose: establish host identity and create the Firebase room.

Creation sequence:

1. Reject an empty username.
2. Read `deviceID` from AsyncStorage or generate one from random base-36 text plus the current timestamp.
3. Generate a random four-digit string.
4. Query `games/{code}` and retry until the code is unused.
5. Write settings, host name, creation timestamp, device ID, and `status: "lobby"`.
6. Initialize `players/{code}` with a counter and three empty team placeholders.
7. Push the host into Team 1 as `isLeader: true`.
8. Register an `onDisconnect` update that writes `disconnectedAt` on the game.
9. Reset navigation to `Home → LobbyScreen`, removing the completed setup and username screens so native back navigation cannot accidentally repeat room creation.

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

Current caveat: vehicle readiness is synchronized, but the live board state after this transition remains local to each device.

### `GameScreen`

Purpose: run the board state machine, assemble team pieces, and connect 3D events to native overlays.

- Locks the device to landscape while mounted.
- Creates two or three game pieces based on `nrOfPlayers`.
- Resolves model choices from `gameData.teamModels`, falling back to the Rally Truck.
- Creates a ref and progress record for each team.
- Handles rolling, movement targets, landings, challenges, turn switching, finish state, and restart.
- Unlocks orientation on unmount.
- The native HUD and turn control respect landscape safe-area insets, while long challenge tickets become scrollable and use a compact layout on short landscape viewports.

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

### Scene graph

```text
Canvas
├── Lights
├── Suspense(MapFallback)
│   └── MapPlane
├── DottedRouteLine (animated route ribbon, caps, chevrons, and waypoint rings)
├── Suspense(GamePiecesFallback)
│   └── GamePieces
│       └── GamePiece × 2 or 3
├── Suspense(CountryMarkersFallback)
│   └── CountryMarkers
│       └── CountryMarker × 7
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
selects the Western Europe area used by the current route, and `uv(u, v)`
converts normalized coordinates into board coordinates:

```text
x = ((u - viewport center U) ÷ viewport width) × map width
y = ((viewport center V - v) ÷ viewport height) × map height + map center Y
z = map Z + clearance
```

This enlarges the active Belgium–Portugal–Italy region without rewriting route
data. A future wider route can change the viewport or restore the full-world
framing while keeping the same source coordinates.

### Map plane

`MapPlane` builds the map in 3D space from three visual layers:

1. A large dark-blue ocean plane that matches the Canvas background, so no board boundary or horizon edge is visible.
2. A shallow extruded land relief generated from the welded `st2..st9` country paths in `assets/map.svg`, plus an unlit cream cap over its top surface.
3. A dark border mesh (`CountryBorders`) derived from the same welded country outlines — covering both deduplicated internal borders and outer coastal/island edges — raised slightly above the land surface.

The board no longer renders a raster map underneath the vector geometry. The
GLB is scaled to the current `MAP_VIEWPORT` without rectangular clipping,
keeping the active Western Europe route large while allowing the surrounding
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
the `st2..st9` country paths in Western Europe), `scripts/build-vector-map.mjs`
welds reversed twin curves between adjacent countries back to canonical shared
knot positions before building all three meshes (`RaisedLand`, `LandTop`, and
`CountryBorders`) from the exact same country shapes. Shared internal border
segments are deduplicated while coastal and island outlines are preserved, so
every country border and coastline edge has a clean line that aligns with the
3D land surface. Border geometry is limited to the active Western Europe
viewport to keep the mobile asset smaller. The GLB is prebuilt so Expo Go does
not need to parse, triangulate, extrude, or weld the large SVG at runtime.
The animated route path renders above the raised land and border geometry.

### Route curve

Each travel leg is an array of country endpoints plus intermediate control points. Each leg becomes a centripetal Catmull-Rom curve. The legs are also flattened into a single `DRIVE_CURVE` with `1,400` arc-length divisions.

The global curve is used for:

- Animated route-ribbon geometry.
- Vehicle positions.
- Smooth look-ahead vehicle tangent/heading.
- Mapping country stops to travel distances.

For every intermediate country stop, the code samples up to 1,400 points on the remaining curve to find the closest point. That produces `STOP_PROGRESS`, which is multiplied by the curve length to create `STOP_DISTANCES`.

### Animated route line

Instead of static dots across the entire map, `DottedRouteLine` precomputes a single sleek semi-transparent ribbon geometry (`#2C3E50`, `opacity: 0.6`) along `DRIVE_CURVE` and uses `BufferGeometry.setDrawRange` so no geometry buffers are reallocated per frame:

- When a dice roll determines the move target, the ribbon smoothly draws out (`easeInOutCubic`) from the active vehicle’s current stop to the target stop before the vehicle begins driving.
- As the vehicle drives along the path, `activeCarProgressRef` advances the tail of the ribbon with the vehicle so the path is consumed cleanly into the destination stop.

### Country markers

- The marker model is `assets/models/location.glb`.
- Every marker clones the shared GLTF scene.
- Mesh materials are replaced with red or gold `MeshStandardMaterial` instances.
- While waiting to roll, the next stop is active; during a move, the destination stop for that roll is highlighted as active.
- Active markers rotate and display a pulsing outer ring.
- Marker geometry is centered horizontally and aligned at its bottom tip (`box.min.y`) with a Three.js bounding box so the pin stands above the map surface.

### Camera

The camera has two modes:

- `done`: smoothly returns to a fixed board overview (and stays in overview during the initial route-path reveal after a roll).
- `follow`: follows the active vehicle using a fixed offset once the vehicle begins driving along the revealed path.

Position and look-at target are interpolated every frame using exponential damping (`1 - Math.exp(-damping * delta)`), preventing frame-rate-dependent jumps.

---

## 9. Dice implementation

`BoardDice` is a custom 3D interaction and animation system; it does not use a physics engine.

### Geometry

- The die body is a Drei `RoundedBox` measuring `0.48` units per side.
- Each of six faces has a manually defined transform.
- Pips are small circle meshes placed from lookup tables.
- Opposite faces use the standard 1/6, 2/5, and 3/4 pairing.
- A pixel-art “THROW ME” label is built once as a single merged geometry (one draw call plus a background plane); dice pips share one geometry and material.

### Internal modes

The die keeps its high-frequency animation state in refs rather than React state:

| Mode | Behavior |
|---|---|
| `idle` | Floats, spins, and displays “THROW ME” |
| `held` | Follows the pointer above the board |
| `throwing` | Performs airborne and rolling animation |
| `result` | Flies the die toward the camera with the rolled face forward, then returns it to idle |

### Interaction sequence

1. Pointer down on the die calls `beginPickup`.
2. Pointer movement is projected onto a foreground hold plane at `HOLD_Z` so the held die stays directly under the pointer.
3. The held point is clamped to `HOLD_BOUNDS` in the foreground, while landing and roll targets are clamped to `DICE_BOUNDS` on the board.
4. Recent drag displacement is smoothed into a throw direction.
5. Pointer up generates a random result from 1 through 6.
6. Throw strength slightly modifies rolling distance.
7. The die animates through a parabolic airborne stage.
8. It rolls and bounces toward the final position.
9. Rotation is interpolated to an orientation that shows the result face.
10. `onRollComplete(result)` tells `GameScreen` to lay out the animated path and move the vehicle.
11. The physical die flies toward the screen at a restrained scale, rotates the rolled face toward the camera, holds briefly, and returns to its idle position over 1.2 seconds.

The throw lasts 1.75 seconds; the first 42% is airborne. Physical-die rolls delay vehicle motion until the 1.2-second result animation has exited. The HUD roll shortcut has no result animation and keeps the normal route-reveal timing.

### HUD roll shortcut

The `Roll Dice` button in `TourControl` calls `GameScreen.handleRoll()` directly. It generates the same random range and triggers the animated route path and vehicle movement without animating the 3D die. This is useful as a fallback when pointer interaction is inconvenient.

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

Unknown IDs fall back to the Rally Truck. Every team also defaults to the Rally Truck when no model selection is present.

### Model preparation

`VehicleModel` clones the loaded GLTF scene so previews and teams do not mutate one shared scene instance. It then:

- Disables frustum culling on child meshes.
- Replaces materials with team-colored paint, dark parts, glass, or lights for the classic-style model.
- For `preserveMaterials` models, web keeps a cloned PBR material while native Expo GL uses a lightweight unlit material backed by the already-loaded shared texture. Both paths set sRGB color space and disable `flipY`.
- Computes a bounding box to center the model, align its lowest point to the ground, and normalize its footprint before applying a common preview or board scale.

### Motion

- After a roll, the vehicle waits for the animated route path to lay out (`getPathRevealDuration`) before driving.
- Progress is stored as distance along the global route curve, advancing by `delta × 0.88` world units per frame while driving.
- Position comes directly from `DRIVE_CURVE.getPointAt(normalizedDistance)`.
- Heading comes from a tight look-ahead chord tangent (`getSmoothRouteTangentAngle`) plus a 90-degree model correction, interpolated with shortest-angle exponential damping.
- An inner body group applies the driving sine bounce so the root group tracked by the camera remains free of vertical bounce jitter.
- Crossed intermediate stops decrement `remainingMoves` in `GameScreen`, and when the target stop is reached, `onMoveComplete(teamId, targetLeg)` fires exactly once.

---

## 11. Challenges

Challenges are static records in `constants/challenges.js`. Each has:

- Country
- Title
- Prompt
- Failure penalty
- Accent color

The popup is a React Native overlay styled as a travel ticket. It contains a country stamp, mission code, team badge, route rail, three-letter country code, challenge text, penalty, and completion button.

### Animation system

Four `Animated.Value` objects drive:

- Spring entrance with translation, scaling, and rotation.
- Continuous pulse on badges, route dots, and button.
- Horizontal shimmer across the ticket.
- Slow floating of layered ticket cards.

All animations use the native driver. Loops are stopped during cleanup.

### Completion semantics

The button does not record success or failure. It simply closes the challenge, identifies the next unfinished team, clears the latest roll, and returns the game to `waiting`. Penalties are social instructions for the players to apply themselves.

---

## 12. Firebase and multiplayer data

### Database structure

The current code expects this conceptual Realtime Database shape:

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

The timestamp above is illustrative. Firebase may omit keys whose values are set to `null`, and empty-string team placeholders become objects once players are pushed.

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

### Security considerations

The repository does not include Firebase Realtime Database security rules. Before public deployment, verify that the deployed rules prevent arbitrary users from:

- Editing unrelated rooms.
- Claiming host privileges.
- Removing leaders or other players.
- Modifying another team’s selected model.
- Reading rooms without an appropriate join mechanism.

The Firebase web API key in `firebaseConfig.js` identifies the project but is not, by itself, an authorization boundary. Security must be enforced through Authentication and database rules.

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

`GameScreen` currently consumes `gameData` only. `gameID` and `teamMembers` are passed but are not used for live gameplay.

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
| `assets/models/world-map-vector.glb` | Prebuilt extruded world silhouette and Western Europe country borders |
| `scripts/build-vector-map.mjs` | Regenerates the runtime GLB from `assets/map.svg` |
| `assets/models/location.glb` | Country pin geometry |
| `assets/models/*.glb` | Selectable team vehicles |

The shared home/setup globe renderer sizes the Lottie artboard with its source
aspect ratio and compensates for the source artwork being authored left of the
composition's center. It also crops the animation upward so the globe clears
the separately rendered wordmark. This keeps the visible globe, rather than
only its transparent Lottie canvas, aligned consistently on iOS, Android, and
web.

### Metro asset support

`metro.config.js` adds `glb`, `gltf`, `mtl`, and `obj` to Metro’s asset extensions. It also adds Android platform detection middleware for requests that lack an explicit Expo platform.

### Oversized and duplicate assets

Several alternate map exports remain in the repository. None of the raster map
exports are loaded by the current board; `map.svg` is the editable source and
`world-map-vector.glb` is the runtime board asset.

`assets/model.gltf` is approximately 153 MB, is not referenced by application code, is ignored by Git because it exceeds GitHub’s 100 MB file limit, and remains available only in local working copies that already have it.

### Mobile map budget

The current board loads the approximately 4.5 MB vector-derived GLB rather than a
large raster map texture. The asset includes indexed extruded coastline geometry
and deduplicated Western Europe shared-border lines. The renderer frames the
Western Europe viewport at runtime, so zoomed views remain crisp without
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
- Expo SDK 57 uses React Native's New Architecture; the checked-in native projects keep their corresponding native flags enabled.
- App icons, splash image, bundle identifiers, and EAS project ID.

### iOS

The iOS project uses:

- CocoaPods.
- Hermes.
- New Architecture.
- Deployment target 16.4.
- Expo dev-client local-network access.

The `Podfile` forces every pod target and resource bundle to deployment target 16.4, the minimum supported by Expo SDK 57.

`AppDelegate.swift` starts React Native through Expo’s factory. A custom `SceneDelegate` adopts that existing window and forwards URLs and universal links. This preserves Expo’s AppDelegate startup model while supporting the scene lifecycle required when building against the iOS 27 SDK.

`Info.plist` registers the SceneDelegate and the app URL schemes.

### Android

The Android project uses:

- Kotlin application/activity entry points.
- Hermes.
- New Architecture/Fabric.
- AndroidX.
- Edge-to-edge rendering.
- Expo splash-screen registration.
- Debug signing for both debug and current release configuration.

The current release build uses the debug keystore. A real production release must use a private production signing key.

### EAS profiles

- `development`: development client; iOS targets the simulator; Android uses internal distribution.
- `preview`: internal distribution.
- `production`: automatically increments the version.

---

## 16. Running and building the project

### Prerequisites

- Node.js and npm.
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

This is the primary demo workflow. It starts Expo SDK 57 Metro explicitly in
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
2. Starts the project’s Expo SDK 57 Metro server when needed.
3. Waits up to 60 seconds for Metro.
4. Runs the native build using the project-local Expo SDK 57 CLI.
5. Uses a booted simulator or lets Expo choose an available default.
6. Passes `--no-bundler` so the build uses the already-running SDK 57 Metro server.
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
3. Confirm the map, pins, GLTF vehicles, and 3D die render cleanly without static route dots.
4. Drag and throw the die.
5. Confirm the landed die flies toward the screen, presents the rolled face toward the camera, returns to its idle position before the vehicle starts driving, and the animated route path lays out from the active vehicle to the destination stop.
6. Confirm the active vehicle smoothly accelerates, follows the animated route path, and brakes into the destination stop while consuming the path.
7. Confirm the camera stays in overview during the path reveal, follows during vehicle movement, and returns to overview afterward.
8. Confirm the appropriate challenge appears.
9. Press `DONE / NEXT TURN` and confirm Team 2 becomes active.
10. Use the HUD roll button and confirm it lays out the animated route path and moves without a 3D die throw animation.
11. Restore `START_ON_DEV_GAME_SCREEN` to `false` after the focused board test.

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
10. Note the current limitation: clients do not coordinate entry into or state within `GameScreen`.

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

### Gameplay and synchronization

1. **Board state is local.** Turns, rolls, progress, challenges, and completion are not written to Firebase.
2. **Difficulty is unused.** Easy/medium/hard do not alter challenges or penalties.
3. **Duration is unused.** Short/medium/long do not alter route length, target score, or timer.
4. **No winner model.** The game waits for all teams instead of ranking the first finisher.
5. **Challenges are honor-based.** Pass/fail and penalties are not recorded.

### Firebase and identity

1. The client has no Firebase Authentication integration.
2. Device IDs are locally generated and can be reset or imitated.
3. Join-code reservation is not atomic.
4. Host permissions are enforced mainly in UI logic.
5. Database security rules are not versioned in this repository.
6. `playerCounter` is not consistently updated for host creation and network joins; most balancing logic correctly counts team objects directly instead.
7. Empty teams begin as empty strings, so the Firebase value type changes when players are added.

### UI and code quality

1. The direct-to-game development shortcut is manual and requires editing `START_ON_DEV_GAME_SCREEN`; there is no in-app or environment-based toggle.
2. Profile/settings buttons and lobby rules are placeholders.
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
6. Several unused alternate map images increase repository and potentially bundle size.
7. `world-map-vector.glb` is generated from `map.svg`; run `npm run build:map` after changing the SVG or the generator settings.

### Native/release readiness

1. Android release currently uses debug signing.
2. No CI workflow is included.
3. There is no environment-based Firebase project selection.
4. The iOS launcher uses the project-local Expo CLI, so it does not download a second CLI version.
5. Native directories are checked in, so Expo config changes must be kept consistent with native project files.
6. `expo-doctor` reports its non-CNG sync warning because the native directories are intentionally checked in; 20 of its 21 checks otherwise pass after the SDK 57 upgrade.

---

## 19. Safe extension points

### Make gameplay truly multiplayer

Add a `gameplay` subtree under each room:

```json
{
  "activeTeam": "team1",
  "phase": "waiting",
  "lastRoll": null,
  "currentChallengeStop": null,
  "revision": 12,
  "teams": {
    "team1": { "currentLeg": 2, "isDone": false },
    "team2": { "currentLeg": 1, "isDone": false }
  }
}
```

Use Firebase transactions or a trusted backend for roll/turn transitions so two clients cannot submit a turn simultaneously. Treat the database record as authoritative and animate clients toward it.

### Activate difficulty

Possible mapping:

- Easy: social prompts, no timer, light penalties.
- Medium: timed prompts, standard penalties.
- Hard/Lethal: harder prompts, shorter timers, stronger optional penalties.

Keep challenge content separate from rendering and select a challenge from a country/difficulty pool.

### Activate duration

Possible mapping:

- Short: one route lap or fewer stops.
- Medium: current route.
- Long: expanded route, multiple challenge rounds, or a target score.

The route constants should become a route definition selected from game settings rather than module-level globals.

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
| `firebaseConfig.js` | Firebase initialization and database export |
| `metro.config.js` | Metro asset extensions and Android request middleware |
| `scripts/run-ios.sh` | Xcode 27/Device Hub-compatible iOS development launcher |

### Navigation and development

| File | Responsibility |
|---|---|
| `app/app/app.js` | Font loading and stack navigator |
| `app/app/devGameRoute.js` | Direct-to-game development flag and mock route parameters |

### Setup and lobby screens

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

### Game controller and 3D components

| File | Responsibility |
|---|---|
| `app/GameScreen/GameScreen.js` | Local game state machine and scene/overlay orchestration |
| `components/GameScene.js` | Canvas and 3D scene composition |
| `components/MapPlane.js` | Continuous ocean plane and raised vector-map viewport |
| `components/DottedRouteLine.js` | Animated route path ribbon, flowing chevrons, and waypoint rings |
| `components/CountryMarkers.js` | Destination markers and active-marker animation |
| `components/GamePieces.js` | Per-team vehicle mapping |
| `components/GamePiece.js` | GLTF preparation and route movement |
| `components/VehicleModel.js` | Shared vehicle cloning, materials, normalization, and preview/board transforms |
| `components/BoardDice.js` | Interactive die, throw animation, and camera-facing die result animation |
| `components/CameraController.js` | Overview/follow camera interpolation |
| `components/GameHud.js` | Active-team, route, and phase text |
| `components/TourControl.js` | Roll/restart control panel |
| `components/ChallengePopup.js` | Animated ticket-style challenge overlay |
| `components/ModelTestPanel.js` | Unused development model switcher |

### Game constants

| File | Responsibility |
|---|---|
| `constants/mapCoordinates.js` | Board dimensions and UV-to-world conversion |
| `constants/route.js` | Stops, curves, lengths, and names |
| `constants/camera.js` | Overview and follow-camera geometry |
| `constants/diceBounds.js` | Allowed die interaction region |
| `constants/gamePieces.js` | Team IDs, colors, counts, and initial progress |
| `constants/modelOptions.js` | Vehicle registry and transforms |
| `constants/challenges.js` | Country challenge content |

### Shared UI

| File/group | Responsibility |
|---|---|
| `shared/components/Header` | Back/profile/settings header |
| `shared/components/BackButton` | Navigation back action |
| `shared/components/Button` | Standard pill-shaped action button |
| `shared/components/InputField` | General text input |
| `shared/components/NumberInput` | Four-digit numeric input |
| `shared/components/LowerButtonContainer` | Paired lower navigation buttons |
| `shared/components/MainAnimation` | Globe Lottie and app title |
| `shared/components/LoadingComponent` | Currently unused loading animation |
| `shared/styles/SafeAreaView` | Android safe-area adjustment |

### Developer tools

| File/group | Responsibility |
|---|---|
| `shared/dev/devConfig.js` | Evaluates `EXPO_PUBLIC_ENABLE_DEV_PORTAL` and `__DEV__` to determine portal visibility |
| `shared/dev/DevPortal.js` | Root dev portal container mounting floating button and modal |
| `shared/dev/DevPortalButton.js` | Draggable/dockable on-screen floating trigger button (`⚡ DEV`) |
| `shared/dev/DevPortalModal.js` | Tabbed developer portal overlay (Screens, Multiplayer/Bots, Board Tools, Identity) |
| `shared/dev/devNavigation.js` | Global navigation ref, instant screen starters (`startInstantGameScreen`, `startInstantCharacterSelection`, `startLiveTestLobby`) |
| `shared/dev/devFirebaseService.js` | Bot player generation, 1-tap lobby auto-fill, team vehicle ready-up, live test room provisioning |
| `shared/dev/devEventBus.js` | Decoupled event bus for in-game dev actions (`forceRoll`, `testChallenge`, `restart`) |

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

TipsyTraveller currently has a strong playable local board-game prototype, a visually distinctive 3D presentation, and a functional Firebase-backed room/lobby foundation. The most important architectural boundary is that the lobby is realtime multiplayer while the board is still local. The next major product milestone should be to make Firebase gameplay state authoritative, coordinate vehicle selection, and continue profiling map geometry and draw calls for reliable mobile GPU performance.

Once those items are addressed, the existing separation between screen flow, game controller, static game definitions, 3D scene components, and React Native overlays provides a practical base for additional routes, challenge sets, game modes, and production multiplayer behavior.
