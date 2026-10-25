# 3D board

## Rendering boundary and scene

`GameScreen` places a full-screen `GameScene` canvas under React Native `GameHud`,
`RaceProgressTracker`, and challenge/roadblock overlays. Keep text-heavy controls and
accessibility in React Native; use WebGL for spatial content.

`GameScene` contains the map, route lines, optional roadblock/detour, vehicles,
country markers, camera, and die. Map, marker, and vehicle GLBs use separate Suspense
boundaries so one slow asset does not hide the whole scene. Major components are
memoized, handlers use stable latest-callback wrappers, DPR is capped at 1.5, and
antialiasing is enabled. Character selection preloads map and marker assets, but
vehicle models load on demand.

## Board coordinates and map

The board is a 20×15 plane centered vertically at `0.5`, with map depth `-1` and
default content clearance `0.08`. `constants/mapCoordinates.js` converts positions
authored against `assets/map.svg` into the current Europe viewport and Three.js world
coordinates. Bundled stops carry `positionVersion`; known older points are upgraded
in memory while preserving order and content.

`MapPlane` renders:

1. A dark-blue ocean matching the canvas background.
2. Extruded land sides plus an unlit cream top.
3. Deduplicated internal borders and preserved coast/island outlines.

`scripts/build-vector-map.mjs` welds neighboring SVG curves and creates
`assets/models/world-map-vector.glb`. The runtime asset is quantized with
`KHR_mesh_quantization` and is roughly 1.9 MB; it avoids runtime SVG parsing and
external Draco/Meshopt decoders. Follow the command documented in that script after
editing `assets/map.svg`, and verify generated geometry on iOS and Android.

## Runtime route

`createRouteModel(countryStops)` builds a centripetal Catmull-Rom curve with a
1,400-sample arc-length table. It exposes ordered names, marker positions, final stop,
and monotonic stop distances. Use those distances for rendering and synchronized
timing; nearest-point lookup is unsafe when a route crosses itself.

`DottedRouteLine` prebuilds a thin persistent itinerary line and a wider current-move
ribbon. The current ribbon changes `drawRange` rather than reallocating geometry: it
reveals before driving and its tail follows the active vehicle.

Roadblock detours use a separate gold ribbon and temporary normal marker pins. The
preview and travel path must share the same ordered spline so the rendered detour and
movement agree. See [GAMEPLAY.md](GAMEPLAY.md) for roadblock rules.

## Markers and occupancy

Country markers clone `assets/models/location.glb`, replace materials per instance,
and animate the active destination. Markers at occupied stops are hidden. A marker
fades in after the last car leaves and fades out as a car reaches the destination;
it stays hidden when another parked car remains. The actively edited Dev Portal
marker is always visible.

## Camera

- Overview mode frames team vehicles plus the next or rolled destination and adjusts
  for western-Europe ocean space.
- Follow mode tracks the moving vehicle from a fixed wider offset.
- Roadblock preview frames the alternate route around its React Native choice panel.
- Position and look-at interpolate with frame-rate-independent exponential damping.

Keep camera values in `constants/camera.js`. Avoid per-frame allocations and React
state updates inside render loops.

## Performance constraints

- Treat physical iOS/Android devices as authoritative for Expo GL, textures, memory,
  and frame rate; web measurements are only directional.
- Consider texture dimensions, model cache growth, draw calls, triangle count,
  material cloning, and simultaneous animations.
- Challenge overlays pause the canvas (`frameloop="never"`) while the board is
  obscured; resume without resetting camera state.
- Do not spread `StyleSheet.absoluteFillObject`/`absoluteFill`. Pass
  `style={StyleSheet.absoluteFill}` or write the four absolute edges explicitly.
- Metro resolves one primary `three` build, but a transitive `stats-gl` dependency
  still carries a second older Three.js instance and may log a warning.
