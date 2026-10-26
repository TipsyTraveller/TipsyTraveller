# Development portal

`app/shared/dev/DevPortal.js` mounts a floating Dev Lab control across screens. Its
visibility is set by `EXPO_PUBLIC_ENABLE_DEV_PORTAL`; when omitted, `__DEV__` is the
fallback. Position preference persists locally. The portal is development tooling,
not a production authorization boundary.

## Capabilities

- **Screens / Quick Start:** open mock two- or three-team GameScreen, mock character
  selection, create a live test lobby, or navigate to setup screens.
- **Multiplayer & Bots:** target a four-digit PIN, fill a lobby, add team bots,
  assign default vehicles to unready teams, and remove test bots.
- **Board & Game Tools:** force rolls 1–3, move to a route stop and open its challenge,
  skip active challenge/roadblock steps, test or clear roadblocks, and reset board
  state. The roadblock-event shortcut places the barrier on the next leg from the
  active team's current position and may use a relaxed detour only when that leg has
  no production-valid pair. Use several route families and roll lengths to inspect
  production-validated branches, both temporary challenges, and final rejoin.
- **Countries (web only):** list/reorder/remove authored stops, edit challenge pools,
  and place or move stop markers on the 3D map.
- **Identity & Tools:** inspect/regenerate anonymous device identity, view environment
  flags, and explicitly clear local application data.

Mock games use `DEV-INSTANT` or `DEV-MOCK`, load the authored catalogue where
possible, and otherwise fall back to bundled content. Board tools operate on the
active itinerary; country authoring shows the full catalogue. Live rooms retain their
immutable route snapshot.

## Content authoring contract

Country writes use `countryStopsService.js`: Firestore country/challenge documents
are primary, with local cache and Realtime Database fallback. A marker move updates
only the affected stop document. Removing a catalogue stop does not mutate existing
room snapshots. New snapshots rotate among five curated edge-country starts and
retain Greece as the finish; Belgium remains available as an intermediate stop.

The Countries tab and map-placement UI are web-only. Placement hides the die, keeps
the target marker visible, and uses the board-coordinate data shape documented in
[3D_BOARD.md](3D_BOARD.md). Current unauthenticated authoring is a known security gap;
see [MULTIPLAYER.md](MULTIPLAYER.md).

## Main files

- `app/shared/dev/devConfig.js`: visibility.
- `DevPortal.js`, `DevPortalButton.js`, `DevPortalModal.js`: container and UI.
- `CountryStopsTab.js`: web authoring controls.
- `devNavigation.js`: navigation ref and instant starters.
- `devFirebaseService.js`: test rooms, bots, ready-up.
- `devEventBus.js`: decoupled board actions and placement handoff.
