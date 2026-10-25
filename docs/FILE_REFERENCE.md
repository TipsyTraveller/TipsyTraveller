# File and component reference

Use this lookup to start a targeted search. Inspect current source before relying on
the summary.

## Root and platform

| Path | Responsibility |
|---|---|
| `index.js` | Expo registration and gesture-handler import |
| `package.json` | Dependencies and scripts |
| `app.json`, `eas.json` | Expo/native metadata and EAS profiles |
| `firebaseConfig.js` | Realtime Database and Firestore initialization |
| `firebase.json`, `firestore.rules` | Firebase configuration and Firestore rules |
| `metro.config.js` | Asset support, Three.js resolution, Android middleware |
| `scripts/build-vector-map.mjs` | Build quantized vector map GLB from SVG |
| `scripts/run-ios.sh` | Native iOS development launcher |
| `ios/`, `android/` | Checked-in native projects and compatibility changes |

Native baseline: Hermes and New Architecture on both platforms; iOS uses CocoaPods
and deployment target 16.4; Android uses AndroidX, edge-to-edge layout, and R8 for
release. The current Android release uses debug signing and is not production-ready.

## Navigation and screens

| Path | Responsibility |
|---|---|
| `app/app/app.js` | Fonts, stack navigator, Dev Portal mount |
| `app/app/devGameRoute.js` | Development start flag and mock route data |
| `app/home/home.js` | Home |
| `app/CreateGame/CreateGame.js` | Room settings wizard/edit flow |
| `app/HostName/HostName.js` | Host identity and room creation |
| `app/JoinGame/JoinGame.js` | Room validation and team assignment |
| `app/Lobby/Lobby.js` | Realtime roster and start controls |
| `app/CharacterSelection/CharachterSelection.js` | Vehicle selection/readiness |
| `app/Account/Account.js` | Local profile, statistics, identity |
| `app/Settings/Settings.js` | Local preferences and game guide |

## Gameplay controller and services

| Path | Responsibility |
|---|---|
| `app/GameScreen/GameScreen.js` | Board controller and overlay orchestration |
| `app/GameScreen/gameplayState.js` | Schema initialization, scoring, turns, action timing |
| `app/GameScreen/hooks/useMultiplayerGame.js` | Gameplay listeners, roles, transactions |
| `app/GameScreen/services/countryStopsService.js` | Firestore content, cache, RTDB fallback |

## Board and overlay components

All paths below are under `app/GameScreen/components/`.

| File | Responsibility |
|---|---|
| `GameScene.js` | Canvas and scene composition |
| `MapPlane.js` | Ocean and vector-map GLB |
| `DottedRouteLine.js`, `DetourRouteLine.js` | Main and roadblock routes |
| `CountryMarkers.js` | Stop pins, active/occupancy transitions |
| `GamePieces.js`, `GamePiece.js` | Team mapping, movement, parking |
| `VehicleModel.js` | GLTF cloning, materials, normalization |
| `BoardDice.js` | Die input and result animation |
| `CameraController.js` | Overview/follow/roadblock framing |
| `GameHud.js`, `RaceProgressTracker.js` | Native phase, score, progress, roll UI |
| `ChallengePopup.js`, `GeoGuessrDuelView.js` | Challenge card and duel UI |
| `RoadblockFigure.js`, `RoadblockOverlay.js` | 3D obstacle and choice/challenge UI |
| `CountryStopPlacementForm.js` | Web country placement/edit form |
| `CityLandmark.js` | Optional challenge-ticket city silhouettes |
| `RoutePreview.js`, `ModelTestPanel.js` | Retained legacy/unused development components |

## Game constants

All paths below are under `app/GameScreen/constants/`.

| File | Responsibility |
|---|---|
| `countryStops.js` | Fallback catalogue, corridors, normalization, durations |
| `route.js` | Runtime curves, stop distances, reveal timing, tangents |
| `roadblocks.js` | Eligibility, deterministic content, detour paths/timing |
| `challenges.js`, `monumentPool.js` | Challenge/flag logic and GeoGuessr pool |
| `gamePieces.js` | Team IDs, colors, counts, initial progress |
| `modelOptions.js` | Stable vehicle registry and transforms |
| `movement.js`, `camera.js`, `diceBounds.js` | Shared motion/camera/dice values |
| `mapCoordinates.js`, `europeMapPaths.js` | Board coordinates and duel SVG map |
| `boardAssets.js` | Map/marker sources and preload helpers |

## Shared UI, storage, and tools

- `app/shared/components/`: reusable header, buttons, inputs, safe layout, animation.
- `app/shared/storage/userSettings.js`: AsyncStorage profile/settings/statistics.
- `app/shared/dev/`: Dev Portal UI, navigation, event bus, bots, and authoring.
- `assets/map.svg` is the editable map source; `assets/models/world-map-vector.glb`
  is the runtime board. Other `assets/models/*.glb` files are vehicles/markers.
- `assets/model.gltf` is an unused, ignored local-only oversized file when present.

For behavioral context, follow the topic links in [ARCHITECTURE.md](ARCHITECTURE.md)
instead of reading every document.
