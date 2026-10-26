# Development, verification, and limitations

There is no checked-in automated test, lint, or type-check command. Choose checks
proportionate to the change and report only what actually ran.

## Commands

```bash
npm install
npm start              # Expo Go over LAN; primary device workflow
npm run start:tunnel   # fallback when LAN access fails
npm run web            # web compatibility testing, normally localhost:8081
npm run ios:native     # checked-in native iOS development client
npm run android
npm run build:map      # regenerate map GLB after SVG/generator changes
```

Node requirements are 22.13+ on Node 22, 24.3+ on Node 24, or Node 26. Native work
also needs the matching Xcode/CocoaPods or Android SDK toolchain.

## Minimum verification by change

- Documentation: validate links, review the diff, run `git diff --check`.
- JavaScript: focused static review plus a relevant smoke flow when practical.
- Navigation/room setup: create, join, edit settings, start, and back-navigation flow.
- Multiplayer/game rules: use at least two independent installations and verify all
  clients converge on the same canonical phase, action, progress, challenge, score,
  finish order, and restart state.
- 3D/native/GPU: test the affected physical iOS/Android platform. Web and simulator
  results do not establish physical-device performance or Expo GL correctness.

## Focused board smoke flow

1. Use the Dev Portal instant game or temporarily enable the dev game shortcut.
2. Confirm map, pins, selected route, vehicles, route line, tracker, and die render.
3. Throw the die and verify a 1–3 result, result exit, path reveal, vehicle movement,
   camera transitions, marker occupancy, and challenge opening.
4. Complete the challenge and verify the next unfinished team becomes active.
5. Use tracker Roll and verify it shares gameplay behavior without 3D die animation.
6. Start several instant games and confirm each 6/9/12-stop route starts in an
   allowed edge country, ends in Greece, has readable spacing, and never crosses.
7. Force roadblocks after rolls of 1–3 on multiple route families. Confirm either
   roadblock resolution ends the triggering turn. For a detour, let the other teams
   act, then roll 1–3 on the affected team's later turns and confirm the roll advances
   that many detour legs. Verify skipped temporary stops do not open challenges,
   landed temporary stops do, and completing one passes play to the next team.
   Confirm the final destination is the next route stop beyond the barricade and
   arrival opens no ordinary landing challenge. Ineligible detours must roll normally.
8. Complete the hard roadblock challenge, confirm play passes to the next team, and
   verify the affected team resumes the original route on its following turn.
9. Restore any temporary development flag.

## Focused multiplayer flow

1. Create on device A, join on B, verify team/leader assignment and realtime roster.
2. Start character selection, choose each required model, and verify synchronized game
   entry with Team 1 active and the immutable edge-country-to-Greece itinerary.
3. Verify only the active leader can roll/complete, results are 1–3, route points and
   challenges match, finished teams are skipped, and re-entry restores current state.
4. Exercise word challenge secrecy/timer/result and GeoGuessr pin/result/score.
5. Exercise both roadblock choices, reconnect during the choice and between detour
   turns, and verify turn ownership, intermediate challenges, per-team detour
   progress, and final canonical progress on both clients.
6. Restart as host and verify initial progress returns without changing the route.

## Reconnection and performance

For reconnection, let Firebase write `disconnectedAt`, rejoin from the same
installation, verify host recovery and marker clearing, then separately verify a
timestamp older than ten minutes is rejected.

On representative devices inspect first load, blank scene frequency, pointer input,
frame rate during simultaneous effects, GLTF textures, cache/memory growth, safe-area
landscape layout, and camera motion.

## Known limitations

- Client-generated rolls are peer-authoritative; trusted rolls require backend logic.
- Animation deadlines use server offset but frames remain local; slow/backgrounded
  clients may snap to canonical state.
- Difficulty is unused; duration changes only route length/snapshot.
- Ordinary penalties are honor-based and not scored.
- There is no Firebase Authentication; device IDs and host UI checks are not security.
- Room code reservation is not atomic; Realtime Database rules are not in the repo;
  Dev Portal country/challenge writes are unauthenticated.
- Expo GL is unreliable in the iOS Simulator. Android release currently uses debug
  signing. There is no CI or environment-based Firebase project selection.
- Native folders are intentionally checked in; Expo config/native changes must agree.
- No TypeScript, schema validation, error boundary, test suite, or lint command exists.
- Several legacy/unused components and imports remain; do not clean them up as part of
  unrelated work.

## High-value future tests

Prioritize pure tests for team count, initial progress, next unfinished team, roll
clamping, capacity/balancing, challenge lookup, model fallback, and route-distance
monotonicity; then cover navigation and Firebase adapters.
