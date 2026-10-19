# TipsyTraveller repository instructions

These instructions apply to the entire repository. Add a nested `AGENTS.md` only
when a subdirectory needs stricter or more specific guidance.

## Required project context

Before planning, reviewing, designing, or changing the application:

1. Read `GAME_ARCHITECTURE.md` completely enough to understand the relevant
   product behavior, architectural boundaries, known limitations, and safe
   extension points.
2. Inspect the relevant live implementation and configuration files before
   drawing conclusions or editing code.
3. Treat the live code and configuration as authoritative when they conflict
   with `GAME_ARCHITECTURE.md`. Report the mismatch and update the document as
   part of the same task when the requested scope permits it.
4. Preserve the established product terminology, game rules, visual identity,
   navigation contracts, and data shapes unless the user explicitly requests a
   change.

Do not assume that earlier chats are available. Durable project knowledge and
decisions belong in repository files.

## Project summary

TipsyTraveller is an Expo/React Native mobile party board game. React Native
owns screens and overlays; React Three Fiber/Three.js/Expo GL own the 3D board;
Firebase Realtime Database owns room, lobby, and vehicle-selection data;
AsyncStorage owns the anonymous local device identity.

The most important current boundary is that the room and lobby are realtime,
but live board gameplay is local React state. Do not describe turns, rolls,
route progress, challenges, or game completion as multiplayer-synchronized
unless the implementation has actually been changed and verified.

Primary reference areas:

- `app/app/`: root navigation and the development game shortcut.
- `app/GameScreen/`: local game controller, 3D scene, overlays, and game data.
- `app/CreateGame/`, `app/HostName/`, `app/JoinGame/`, `app/Lobby/`, and
  `app/CharacterSelection/`: room setup and multiplayer pre-game flow.
- `app/shared/`: reusable UI and styling.
- `firebaseConfig.js`: Firebase initialization.
- `assets/`: maps, models, fonts, images, and animations.
- `ios/` and `android/`: checked-in native projects and compatibility changes.

## Architecture and implementation rules

- Keep game rules and turn transitions in `GameScreen`; keep 3D rendering
  components focused on rendering, animation, and reporting events.
- Keep route definitions, challenge content, camera values, dice bounds, team
  definitions, and vehicle metadata data-driven under
  `app/GameScreen/constants/`.
- Keep text-heavy controls and accessible interaction in React Native overlays;
  use WebGL for spatial board content.
- Reuse existing components, constants, styles, and model metadata before
  introducing parallel abstractions.
- Preserve navigation parameter shapes and Firebase data compatibility, or
  update every producer and consumer together and document the migration.
- Treat iOS and Android as primary targets. Web is a secondary compatibility
  target, and physical devices are the reference for final 3D performance.
- Account for asset size, texture limits, draw calls, model-loading cost, and
  per-frame allocations when changing the 3D scene.
- Keep Expo configuration and checked-in native projects consistent when a
  change affects both.
- Do not add dependencies unless they provide clear value that existing
  dependencies or a small local implementation cannot provide.
- Do not perform unrelated cleanup or broad rewrites as part of a focused task.

## Firebase, identity, and security

- Treat the locally generated device ID as convenience identity, not
  authentication or authorization.
- Do not treat the Firebase web API key as a secret or as an authorization
  boundary. Authorization must come from Firebase Authentication, database
  rules, or trusted backend logic.
- Use transactional or otherwise concurrency-safe writes for authoritative
  multiplayer state transitions.
- Never commit credentials, private signing material, service-account files,
  secrets, or local environment files.
- Do not claim that database rules, remote Firebase state, or production
  behavior have been verified unless they were actually inspected or tested.

## Verification

There is currently no checked-in automated test, lint, or type-check command.
Choose verification proportionate to the change and report exactly what ran.

- For documentation-only changes, run `git diff --check` and review the diff.
- For JavaScript changes, at minimum perform a focused static review and run an
  available relevant application smoke test when practical.
- Use the manual test flows in `GAME_ARCHITECTURE.md` for changes affecting the
  board, navigation, multiplayer setup, reconnection, or 3D performance.
- Test native or GPU-sensitive work on the affected platform; do not infer
  physical-device performance from the simulator.
- testing can be done in web version localhost:8081
- If a check cannot be run, say why. Never present an unrun check as passing.
- Do not quietly introduce a test framework, formatter, linter, or large
  dependency merely to validate one unrelated change.

## Documentation maintenance

Update `GAME_ARCHITECTURE.md` in the same task whenever a change materially
affects any of the following:

- Player-visible rules, flows, or implementation status.
- State ownership, architectural boundaries, or component responsibilities.
- Navigation contracts or Firebase data shape and synchronization.
- Routes, challenges, vehicles, rendering, assets, or native configuration.
- Development/build commands, verification steps, known limitations, or safe
  extension points.

Document only observed behavior. Keep proposed behavior clearly labeled as a
proposal, and update the document's "Last reviewed against the source code"
date only after reconciling the relevant sections with the implementation.

## Working-tree and delivery discipline

- Preserve user changes and unrelated uncommitted work.
- Inspect the working tree before editing and before handing off.
- Do not commit, push, deploy, alter remote services, or change production data
  unless the user explicitly requests that action.
- Keep each task scoped to the requested outcome and summarize changed files,
  behavioral impact, verification evidence, and remaining risks.
- For every feature that you are asked to implement or change make a new working branch.


## COMMITS
commit withouth any co author, use git naming conventions and use a small commit message max 1 scentence that summerizes the feature