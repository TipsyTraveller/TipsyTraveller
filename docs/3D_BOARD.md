# 3D board

## Rendering boundary and scene

`GameScreen` places a full-screen `GameScene` canvas under React Native `GameHud`,
`RaceProgressTracker`, and challenge/roadblock overlays. Keep text-heavy controls and
accessibility in React Native; use WebGL for spatial content.

`GameScene` contains the map, route lines, optional roadblock/detour, vehicles,
country markers, camera, and die. Map and vehicle GLBs use separate Suspense
boundaries so one slow asset does not hide the whole scene. Major components are
memoized, handlers use stable latest-callback wrappers, DPR is capped at 1.5, and
antialiasing is enabled. Character selection preloads the map, and vehicle models load
on demand.

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

`TouringRoad` builds a single colored ribbon mesh per road with navy edges,
a teal roadway, and cream dashes spaced by arc length. `DottedRouteLine` reveals
a gold overlay before driving and clears it behind the active vehicle by adjusting
`drawRange`. The frame loop reuses the geometry.

Detours use a gold roadway and temporary numbered badges. The choice shows all
temporary stop names. After selection, the current detour highlights only its next
waypoint, and inactive detours display the road and badges. A bounded cubic path
rounds the detour through its exact country waypoints. Preview, segmented vehicle
travel, and timing derive from that same geometry. See [GAMEPLAY.md](GAMEPLAY.md)
for roadblock rules.

The React Native route overview samples the board curve, anchors it to the cities
on the Europe overview map, and lists every stop. It opens after onboarding and
pauses the canvas. Dismissal is stored on the device per multiplayer session or
local route session, so a rematch opens a new overview.

The barricade scans the middle 30–70% of its blocked leg for a low-curvature,
clear position. It remains perpendicular to the tangent, derives its arrow from the
first detour branch, and includes a red closure strip below the compact prop.

## Markers and occupancy

Country markers share procedural badge geometry and materials. Web uses Drei
`Text` with the bundled Dogica Pixel Bold font. Native renders geometry from
the same font's outlines. Badge backgrounds render while web text loads. Only the
next destination and Greece get nameplates on the main board. The next stop has a gold pulse and Greece has a checkered finish.

Occupied stops render flat nodes. The badge expands as the last vehicle leaves
and collapses as a vehicle approaches, using the existing distance window. A
second parked vehicle keeps the node collapsed. Dev Portal placement highlights
the edited stop in cyan.

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
