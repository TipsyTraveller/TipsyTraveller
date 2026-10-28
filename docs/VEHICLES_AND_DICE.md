# Vehicles and dice

## Dice contract

`BoardDice` is a custom Three.js interaction/animation system, not a physics engine.
The six rendered faces show 1, 2, and 3 twice each, matching the only valid gameplay
results. `DICE_MAX_RESULT`, result timing, and interaction bounds live under
`constants/` and must agree with synchronized validation and Dev Portal controls.
The host's snapshotted fast-dice room rule scales the result/reveal lead-in in both
the Firebase movement timestamps and each client's dice presentation.

Local animation modes are `idle`, `held`, `throwing`, `result`, and `hidden`.
Pointer movement projects onto a foreground hold plane; release derives a direction,
generates 1–3, animates airborne/roll/bounce stages, reports the result once, then
presents the winning face to the camera and fades out. Physical-die movement waits
for the result exit; the race-tracker Roll shortcut calls the same request path but
skips 3D result animation.

The active leader generates the random value client-side. Firebase transactions
prevent duplicate actions, but this is not trusted anti-cheat randomness. The die is
hidden during movement, challenges, and content placement so it cannot intercept
input.

## Vehicle registry and preparation

`constants/modelOptions.js` is the registry for stable Firebase model IDs, display
labels, bundled GLB sources, material policy, and orientation. Unknown or missing IDs
must use the established fallback model.

`VehicleModel` clones cached GLTF scenes so previews and teams do not mutate shared
objects. It normalizes source bounds, scale, ground position, and facing; prepares
team paint or preserved materials; and disposes only resources it created. Cached
geometry and native textures remain loader-owned. Web may retain PBR materials;
native uses lighter compatible textured materials where configured.

Character selection loads vehicles on demand. Do not preload the complete textured
fleet without physical-device memory evidence.

## Movement and parking

- Timing derives from route arc distance and shared speed so Firebase deadlines and
  local animation agree.
- The path ribbon reveals before driving. Vehicle position comes from the route
  curve; heading uses a short look-ahead tangent and shortest-angle damping.
- The tracked root follows the route; an inner group owns visual bounce/kickflip so
  camera tracking remains stable.
- Passing parked teams can trigger a visual kickflip and Roadside Duel but never
  changes route distance.
- Co-located parked cars keep stable center/left/right slots. Departing and arriving
  vehicles blend between their slot and route center without swapping sides.
- Intermediate crossings update visual remaining moves. Canonical completion fires
  exactly once at the target leg.

Preserve stable model IDs and movement timing fields for existing rooms. Verify model
textures, scale, camera tracking, die input, and memory on physical iOS/Android when
changing GLB handling or frame-loop behavior.
