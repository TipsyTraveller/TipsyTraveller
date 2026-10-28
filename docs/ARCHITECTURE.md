# TipsyTraveller architecture

Last reviewed against source: 27 October 2026.

TipsyTraveller is an Expo/React Native mobile party board game. React Native owns
screens and overlays; React Three Fiber, Three.js, and Expo GL own the 3D board.
Firebase Realtime Database owns rooms and canonical live gameplay, Cloud Firestore
owns authored content, and AsyncStorage owns anonymous local identity and settings.

This page is an index, not a prerequisite to read every linked document. Start with
the relevant source files, then open only the topic required by the task.

## Topic index

| Topic | Read when changing |
|---|---|
| [Gameplay](GAMEPLAY.md) | Rules, scoring, turns, phases, roadblocks, completion |
| [Multiplayer](MULTIPLAYER.md) | Firebase schemas, synchronization, identity, rooms, security |
| [3D board](3D_BOARD.md) | Scene, map, route, markers, camera, rendering performance |
| [Challenges](CHALLENGES.md) | Challenge selection, word game, GeoGuessr, challenge lifecycle |
| [Vehicles and dice](VEHICLES_AND_DICE.md) | Vehicle models, movement, parking, dice interaction |
| [Screens](SCREENS.md) | Screen behavior, navigation flow, route parameters |
| [Dev Portal](DEV_PORTAL.md) | Development shortcuts, bots, board tools, content authoring |
| [Testing](TESTING.md) | Commands, manual flows, platform checks, known limitations |
| [File reference](FILE_REFERENCE.md) | Where components, constants, services, and config live |

## Core boundaries

- `app/GameScreen/GameScreen.js` and `hooks/useMultiplayerGame.js` coordinate game
  rules and authoritative turn transitions.
- `app/GameScreen/components/` renders the scene and React Native overlays. 3D
  components animate shared state but do not define game rules.
- `app/GameScreen/constants/` holds data-driven routes, challenges, teams, camera,
  dice, roadblock, vehicle, and board definitions.
- Firebase turn-level state is canonical in multiplayer. Animation frames, camera
  interpolation, and model transforms remain local.
- Navigation parameters and Firebase shapes are compatibility contracts. Change all
  producers and consumers together.
- iOS and Android are primary. Web is a useful compatibility and development target;
  physical devices remain authoritative for Expo GL and performance.

## Technology and configuration

- Expo SDK 58, React Native 0.88, React 19.3, Hermes, New Architecture.
- React Navigation stack; Three.js 0.184 with React Three Fiber and Drei.
- Firebase Realtime Database and Cloud Firestore; AsyncStorage for local state.
- Checked-in `ios/` and `android/` projects must stay consistent with `app.json`.
- Product identifiers and build profiles live in `app.json` and `eas.json`; consult
  those files directly rather than duplicating mutable values here.

Source code and configuration are authoritative if this documentation drifts.
