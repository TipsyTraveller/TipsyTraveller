# TipsyTraveller Step-by-Step Implementation Roadmap

## Locked Product Decisions

- Primary setup: one connected phone per team.
- Target: closed beta before public release.
- Drinking mode: classic only.
- Difficulty controls drinking quantity:
  - Easy: authored penalty ×1
  - Medium: authored penalty ×2
  - Lethal: authored penalty ×3
  - Maximum: 9 sips per player per event
- Named challenge targets use automatic rotation through eligible teammates.
- For Guess the Country Word:
  - Failure or timeout: only the selected describer drinks.
  - Success: the team earns points and every teammate except the describer drinks.
- Complete and verify each step before starting the next.

## Step 1 — Implement Difficulty-Based Drinking

- Add an authoritative numeric `penaltySips` base value to every penalty-bearing challenge.
- Add one shared resolver: `min(basePenalty × difficultyMultiplier, 9)`.
- Stop parsing phrases such as “down it” as numeric penalties.
- Show the resolved amount on every device and challenge card.
- Use the resolver for ordinary challenges, word challenges, GeoGuessr, and future targeted challenges.
- Keep roadblock route consequences unchanged unless the challenge explicitly defines a drinking penalty.

Completion gate:

- Easy, Medium, and Lethal produce synchronized ×1, ×2, and ×3 penalties.
- No player receives more than nine sips from one event.
- Replayed transactions cannot award penalties twice.

## Step 2 — Add Stable Player Drink Tracking

- Use the Firebase roster push key as the stable `playerId`; never use a player’s name as a database key.
- Initialize a drink ledger for every player when gameplay begins.
- Store canonical totals under each team:

```text
teamProgress/{teamId}/playerDrinks/{playerId}
  name
  drinks
```

- Derive each team’s total drinks from its player totals so team and player numbers cannot drift apart.
- Show every player and their personal drink count in the in-game scoreboard.
- Replace ambiguous team `+1` controls with:
  - individual `+1` and `−1`;
  - explicit team `+1 each` and `−1 each`.
- Migrate legacy name-keyed drink data when an older room is loaded.

Completion gate:

- Players with identical names still have separate totals.
- Renaming a player does not reset or duplicate their drinks.
- Team totals always equal the sum of individual totals.
- All devices display identical player drink ledgers.

## Step 3 — Generalize Named Challenge Targets and Outcomes

Add reusable challenge targeting metadata:

```text
targeting
  role: describer | performer | judge | captain
  selection: rotate

drinkRules
  success: target | teamExceptTarget | wholeTeam | opponents | none
  failure: target | teamExceptTarget | wholeTeam | opponents | none
```

- Support `{targetPlayerName}` placeholders in challenge titles, prompts, and instructions.
- Select targets transactionally when the challenge is created.
- Rotate through the team’s stable player order before selecting someone again.
- Store the selected player ID and display name in `challengeRound`.
- Track a per-team target cursor so reconnecting cannot change the selected person.
- Add explicit `COMPLETED` and `FAILED` actions to ordinary challenges.
- Resolve drink recipients and amounts from the synchronized result.
- Record awarded drink events by action ID so they remain idempotent.

Guess the Country Word rules:

- Select the describer through automatic rotation.
- On failure or timeout, apply the scaled penalty only to the describer.
- On success, award the existing team points and apply the scaled penalty separately to every other teammate.
- Keep the challenge unavailable to teams with fewer than two players.

Completion gate:

- Every client displays the same selected player.
- Automatic rotation targets every eligible teammate before repeating.
- Success and failure assign drinks to the correct players.
- Reconnects cannot change targets or duplicate drink awards.
- The same system works for new performer-, judge-, or captain-focused challenges.

## Step 4 — Make Lobby and Team Readiness Reliable

- Reserve room codes transactionally.
- Make duplicate prevention, capacity checks, player insertion, and team assignment atomic.
- Require one connected leader and one selected vehicle for every required team.
- Explain exactly why Start is disabled.
- Allow the host to move players, remove non-leaders, and assign a new leader.
- Prevent settings edits that would invalidate the roster.
- Preserve player IDs when moving someone between teams.

Completion gate:

- Simultaneous joins cannot overfill rooms or create duplicates.
- Every startable team has a controlling device.
- Two-team and three-team lobbies reach GameScreen without developer tools.

## Step 5 — Add Connection, Leave, and Recovery Flows

- Add Firebase presence for each connected team device.
- Show reconnecting, offline, leader-disconnected, host-disconnected, and expired-room states.
- Add Leave Game and Return Home actions.
- Allow host transfer to another connected team leader.
- Pause only actions requiring a missing active leader.
- Preserve automatic movement and timeout finalization.
- Restore the exact phase, target player, results, and drink ledger after reopening.

Completion gate:

- Reconnection works during every gameplay phase.
- A disconnected leader can be replaced.
- Targeted challenges resume with the same selected player and timer state.
- No tested disconnect permanently stalls the room.

## Step 6 — Make Existing Settings Functional

Local presentation settings:

- Sound effects
- Ambient music
- Haptic feedback
- Camera follow

Host-controlled synchronized room rules:

- Difficulty
- Challenge timer pace
- Fast dice animations
- Auto-advance

Implementation behavior:

- Persist local presentation settings in AsyncStorage.
- Snapshot room rules into Firebase.
- Speed mode shortens timers consistently without changing scoring.
- Auto-advance begins only after a challenge result and drink distribution are recorded.
- Show a short cancellable countdown before auto-advance.
- Make fast-dice timing authoritative for all clients.
- Remove the unused `drinkMode` setting.

Completion gate:

- Every visible setting has a real effect.
- Timing-related settings remain synchronized.
- Auto-advance cannot skip a result or drink assignment.

## Step 7 — Complete Profiles and Career Statistics

- Use saved usernames to prefill create and join screens.
- Use the preferred vehicle to preselect vehicle choice.
- Display badges in the lobby and final standings.
- Automatically update dice rolls, challenges, tours, and sips from gameplay events.
- Remove manual statistic increment buttons.
- Keep device-ID regeneration in development tools only.
- Keep session drink totals for every roster player.
- Keep lifetime statistics only for players tied to a persistent local profile; do not merge people solely because their names match.

Completion gate:

- Profile choices appear in gameplay.
- Every player’s session drink count is visible.
- Career statistics change only from completed gameplay events.
- Reconnects and rematches cannot double-count statistics.

## Step 8 — Improve Finish, Rematch, and Exit

- Show winner, team standings, score, finish position, and individual player drink totals.
- Add Rematch and Leave Game.
- Keep players, teams, vehicles, difficulty, and room rules for rematches.
- Generate a fresh route for each rematch.
- Let only the host start the rematch.
- Reset session scores, drinks, target rotation, challenges, roadblocks, and used-content fields.

Completion gate:

- Every device shows identical final results.
- Every player’s drinks appear under the correct team.
- Rematches start cleanly without recreating the room.

## Step 9 — Expand Challenge Variety and Pacing

- Create at least four ordinary challenges for every country used by curated routes.
- Include performance, coordination, trivia, storytelling, and physical activities.
- Add named-player challenges using describer, performer, judge, and captain roles.
- Give every challenge stable IDs, base sip penalties, minimum player counts, expected duration, targeting rules, and result drink rules.
- Prevent repetition within a session.
- Avoid challenges incompatible with the current team size.
- Tune Short, Medium, and Long toward approximately 20, 30, and 40 minutes.

Completion gate:

- No challenge repeats during a game.
- Every challenge works with the available players.
- Named-player challenges rotate fairly.
- Session durations broadly match the selected length.

## Step 10 — Add Onboarding and Game Feel

- Explain team leaders, phone ownership, named-player targeting, rolling, challenges, roadblocks, scoring, and reconnecting.
- Add a clear “Team X, you’re up” handoff.
- Show “Pass the phone to Player Name” when a targeted player must act.
- Implement dice, movement, challenge, roadblock, and victory sounds.
- Add matching haptics.
- Improve non-active-team waiting states.
- Add a short, skippable winner celebration.

Completion gate:

- New groups can finish without developer guidance.
- The required team and player are always obvious.
- Audio and haptics respect their settings.

## Step 11 — Secure Firebase Before External Testing

- Add anonymous Firebase Authentication while retaining device IDs temporarily for migration.
- Protect room reads, roster changes, leader actions, challenge results, drink assignments, rolls, scoring, and restarts.
- Prevent players from altering another team’s drink ledger except through authorized challenge resolution.
- Lock Firestore writes behind authenticated admin access.
- Restrict Dev Portal controls to development builds.
- Add emulator-backed permission tests.

Completion gate:

- Users can perform only actions allowed by their room role.
- Drink totals cannot be arbitrarily overwritten by another team.
- Unauthenticated clients cannot alter content or rooms.
- Development tools are absent from beta builds.

## Step 12 — Native, Performance, and CI Hardening

- Add CI for gameplay tests and Expo export.
- Fix application asset and configuration warnings.
- Remove unused large assets.
- Test memory, loading, textures, animations, and input on physical iOS and Android devices.
- Verify icons, privacy metadata, signing, and environment separation.
- Add crash reporting for beta builds.

Completion gate:

- CI passes from a clean checkout.
- Long games complete on representative devices without crashes or unacceptable slowdown.
- Development and beta environments cannot be confused.

## Step 13 — Closed-Beta Validation

Run at least ten external sessions across 2-team and 3-team groups.

Beta acceptance criteria:

- Zero unrecoverable stalled games.
- No duplicate scores or drink awards.
- All clients converge on the same phase, target player, result, and drink ledger.
- Every player’s total is correct at game completion.
- No repeated challenge within a session.
- No developer intervention is required.
- Session lengths match the selected duration reasonably well.
- Players understand difficulty, named targeting, roadblocks, and turn ownership.
