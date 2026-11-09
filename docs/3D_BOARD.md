# 3D board

## Rendering boundary and scene

`GameScreen` places a full-screen `GameScene` canvas under React Native `GameHud`,
`RaceProgressTracker`, and challenge/roadblock overlays. Keep text-heavy controls and
accessibility in React Native; use WebGL for spatial content.

`GameScene` contains the map, route lines, optional roadblock/detour, vehicles,
country markers, camera, and die. Map and vehicle GLBs use separate Suspense
boundaries so one slow asset does not hide the whole scene. Major components are
memoized, handlers use stable latest-callback wrappers, DPR is capped at 1.5, and
antialiasing is enabled on web. Character selection preloads the map on web.
Native starts loading it inside the mounted canvas. Vehicle models
load on demand.

## Board coordinates and map

The board is a 20×15 plane centered vertically at `0.5`, with map depth `-1` and
default content clearance `0.08`. `constants/mapCoordinates.js` converts positions
authored against `assets/map.svg` into the current Europe viewport and Three.js world
coordinates. Bundled stops carry `positionVersion`; known older points are upgraded
in memory while preserving order and content.

`MapPlane` renders:

1. A dark-blue ocean matching the canvas background.
2. An unlit cream land top, with extruded sides on web.
3. Deduplicated internal borders and preserved coast/island outlines.

`scripts/build-vector-map.mjs` welds neighboring SVG curves and creates the web map at
`assets/models/world-map-vector.glb` (2.7 MB) and the lower-detail native map at
`assets/models/world-map-vector-mobile.glb` (851 KB). Both avoid runtime SVG
parsing and external Draco/Meshopt decoders. After editing `assets/map.svg`, follow
the command in the script and verify generated geometry on iOS and Android.

The route overview gives the mounted canvas time to load and draw the board map.
It pauses the frame loop after the first map frame and resumes it on dismissal.

## Runtime route

`createRouteModel(countryStops)` builds a centripetal Catmull-Rom curve with a
1,400-sample arc-length table. It exposes ordered names, marker positions, final stop,
and monotonic stop distances. Use those distances for rendering and synchronized
timing; nearest-point lookup is unsafe when a route crosses itself.

`TouringRoad` builds narrow ribbons with a navy edge and cream dashes. The main
route uses a translucent teal surface, and detours use gold. The light teal
movement highlight changes `drawRange` to reveal ahead of the car and clear
behind it without rebuilding geometry.

Detour preview, segmented vehicle travel, and timing use the same bounded cubic
path through the temporary waypoints. Inactive detours remain visible at reduced
opacity until the team rejoins the main road. See [GAMEPLAY.md](GAMEPLAY.md) for
roadblock rules.

`RoutePreview` samples the route curve for its SVG map and pairs the numbered
stops with the itinerary. It opens after onboarding during a safe waiting phase.
Dismissal is saved on the device for that route session. A rematch opens a new
overview, and a live turn or connection issue takes priority over an undismissed one.

The barricade scans the middle 30–70% of its blocked leg for a low-curvature,
clear position. It remains perpendicular to the tangent, derives its arrow from the
first detour branch, and includes a red closure strip below the compact prop.

## Markers and occupancy

Stops use procedural badges with shared geometry and bundled Dogica number
outlines. An occupied stop collapses beneath the vehicle. It expands after the
last car leaves and collapses as a car arrives. Detour badges mark only temporary
stops, and the edited Dev Portal badge has a cyan outline. The board shows a
single country label at the destination while the car is driving.

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
- Do not spread `StyleSheet.absoluteFillObject`/`absoluteFill`. Pass
  `style={StyleSheet.absoluteFill}` or write the four absolute edges explicitly.
- Metro resolves one primary `three` build, but a transitive `stats-gl` dependency
  still carries a second older Three.js instance and may log a warning.
