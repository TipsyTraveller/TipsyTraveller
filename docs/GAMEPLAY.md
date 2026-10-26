# Gameplay rules and state machine

## Session and teams

1. A host chooses difficulty, duration, and player range, creates a four-digit room,
   and joins Team 1 as leader.
2. Joining devices are assigned to the least populated valid team. The first member
   of an empty team becomes its leader.
3. Leaders select vehicles. Once all required teams are ready, the host creates the
   gameplay record and starts the game.
4. Teams roll 1–3, move that many route legs (capped at Greece), and perform a
   challenge after a non-final landing.
5. Finished teams are skipped. The game ends after every team finishes.

| Player setting | Teams | Capacity | Minimum to start |
|---|---:|---:|---:|
| `1-4` | 2 | 4 | 2 |
| `5-8` | 2 | 8 | 2 |
| `9-12` | 3 | 12 | 3 |

Difficulty is stored but currently has no gameplay effect. Duration chooses a fresh
6-, 9-, or 12-stop route snapshot from a curated family beginning in Iceland,
Ireland, Portugal, Norway, or Finland and ending in Greece. Selection preserves
geographic order, unique countries, at least 0.75 board units between stops, turns
no sharper than 110 degrees, and non-crossing legs. The route families and the
51-country fallback catalogue are in `constants/countryStops.js`; a room snapshot
never changes when authored content later changes.

## Scoring and movement

- Each route leg reached is worth 10 points.
- Finishing bonuses are 30, 15, and 5 for first, second, and third.
- Challenge points are added separately; `Guess the Country Word` awards 10 on a
  successful guess. Finish position is the tiebreaker represented by the bonus.
- Rolls never overshoot the finish. Landing at the finish marks the team done without
  opening an ordinary challenge.
- Multiple teams may share a stop. Passing a parked vehicle triggers a visual
  kickflip without changing state; landing on or passing a team guarantees a
  GeoGuessr Roadside Duel.
- There are no reverse moves, bonus rolls, gameplay collisions, or stored ordinary
  challenge penalties.

## Canonical phases

| Phase | Meaning | Allowed player action |
|---|---|---|
| `waiting` | Active team may roll | Active leader rolls |
| `rolling` | Physical die result animation | No additional roll |
| `roadblock` | Leader chooses hard challenge or detour | Active leader chooses |
| `moving` | Vehicle travels to a canonical target | No roll |
| `challenge` | Landing or detour challenge is open | Active leader completes it |
| `done` | All teams finished | Host may restart |

`GameScreen` renders the local state machine. In real rooms, the versioned Firebase
record is authoritative; development mock rooms use the local path. The controller
tracks the phase, active team, latest roll, current challenge, movement target and
progress, team progress, piece refs, and animation timing. `getNextActiveTeamId`
wraps through teams and skips those with `isDone`.

Restart is host-only in multiplayer and transactionally replaces the gameplay record
with a new session ID and initial progress. It does not replace the room route.

## Roadblocks

A roadblock can occur only when the active team is at least two stops ahead of the
closest unfinished opponent, has reached leg 2, and is not moving to the finish.
Eligible rolls use a deterministic 38% check based on the synchronized action ID;
the same team has a three-turn cooldown.

The synchronized `roadblock` event stores one hard challenge and a validated,
two-country detour outside the room itinerary. Ordered candidate pairs must progress
toward the destination, stay on one side of the blocked movement, avoid route
crossings and severe turns, and remain a bounded extension of the direct trip. If no
pair passes validation, the roll proceeds normally without a roadblock. Resolving
the roadblock consumes the triggering turn. Completing the timed hard challenge
removes the barrier, passes play to the next team, and lets the affected team resume
the original route on its next turn. Choosing the detour, or timing out, stores a
per-team detour and immediately passes play to the next team.

On each later turn, a detouring team rolls normally and advances that many of the
three detour legs: the two temporary countries and the rejoin destination. Landing
on a temporary country opens its standard challenge; completing it ends that turn.
A sufficiently high roll may skip a temporary country or complete the entire detour
in one turn. Temporary stops do not change the immutable route or award route
points. Canonical progress is committed only when the team reaches the stop
immediately beyond the barricade, without an additional ordinary landing challenge.
The per-team detour remains canonical while other teams take their turns.

## Ownership rules

- Keep rules, state transitions, score calculation, and turn selection in
  `GameScreen`, `gameplayState.js`, and `useMultiplayerGame.js`.
- Keep movement, camera, and presentation components event-driven and free of
  independent rule decisions.
- Preserve gameplay schema/action revisions and idempotent transactions when adding
  states or transitions. See [MULTIPLAYER.md](MULTIPLAYER.md).
