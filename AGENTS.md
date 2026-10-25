# TipsyTraveller repository instructions

These rules apply repository-wide. Add nested `AGENTS.md` files only for genuinely
different subdirectory requirements.

## Efficient default workflow

1. Identify the application area affected by the request.
2. Locate relevant files with filenames or targeted searches.
3. Read only the necessary source files and relevant sections linked from
   `docs/ARCHITECTURE.md`; do not automatically read all documentation.
4. Make the smallest complete change and avoid unrelated refactoring.
5. Run focused verification proportionate to the change.
6. Update only relevant documentation when the policy below requires it.
7. Give a concise final summary: changed files, checks run, and material caveats.

Prefer targeted searches or section reads over reading large files in full. Do not
reread files already available in the current context. Small UI changes normally
require only the affected components and direct dependencies. Consult the relevant
architecture docs for multiplayer state, navigation, game rules, data contracts,
3D rendering, native configuration, or other cross-cutting changes. Investigate
more deeply whenever correctness requires it; token efficiency never justifies
guessing, skipping relevant dependencies or verification, or breaking behavior.
Do not broadly explore the repository or write a lengthy plan for a trivial change.

## Architecture and compatibility

- Source code and configuration are authoritative when documentation is stale.
- Preserve established terminology, game rules, visual identity, navigation, and
  data shapes unless the requested change requires otherwise.
- React Native owns screens, overlays, text-heavy controls, and accessible input;
  React Three Fiber/Three.js/Expo GL own spatial 3D board rendering.
- Keep game rules and turn transitions in `app/GameScreen/`; keep 3D components
  focused on rendering, animation, and reporting events.
- Keep routes, challenges, camera/dice values, teams, and vehicle metadata
  data-driven under `app/GameScreen/constants/` where practical.
- Preserve navigation parameter shapes and Firebase data compatibility, or update
  every producer and consumer together and document the migration.
- Firebase owns canonical multiplayer turn state; per-frame animation stays local.
  Use transactional or otherwise concurrency-safe authoritative transitions.
- Treat the local device ID as convenience identity, not authentication. A Firebase
  web API key is not an authorization boundary. Never commit secrets or signing data.
- Do not claim deployed rules, remote state, or production behavior were verified
  unless they were actually inspected or tested.
- Reuse existing components and dependencies. Add packages only for clear value.
- Prioritize iOS and Android. Web is secondary but useful for testing. Account for
  asset size, texture limits, draw calls, loading cost, and per-frame allocation.
- Keep Expo configuration and checked-in native projects consistent when applicable.

## Documentation policy

- `docs/ARCHITECTURE.md` is the concise index; open only the topic needed.
- Update documentation only when a change materially affects architecture, gameplay
  rules, API/data/navigation contracts, state ownership, or important workflows.
- Do not update docs for minor styling, animation tuning, routine bug fixes, or
  implementation details that do not change documented behavior.
- Modify only the relevant document and section. Never regenerate all docs for a
  small feature or rewrite unrelated documentation.
- Keep docs concise and about the current implementation. Avoid repetitive details,
  visual-change history, and development diaries. Clearly label proposals.
- If docs conflict with observed code, follow the code and update the relevant doc
  when the task scope permits.

## Verification

- Run checks proportionate to risk and report exactly what ran.
- Documentation-only: review the diff, validate changed links, and run
  `git diff --check`.
- JavaScript: perform focused static review and a relevant smoke test when practical.
- Use `docs/TESTING.md` for affected board, navigation, multiplayer, reconnection,
  native, or 3D flows. `localhost:8081` web may be used when appropriate.
- Physical devices are authoritative for native/GPU performance. Never claim an
  unrun check passed or infer device performance from web/simulator testing.
- Do not add a test framework, formatter, linter, or dependency for one focused task.

## Git and delivery

- Inspect and preserve existing changes and unrelated uncommitted work.
- Create a new branch for a genuinely new feature or independent task. Reuse the
  current feature branch for follow-ups, small UI adjustments, bug fixes, and
  refinements; do not create a branch per prompt or switch unnecessarily.
- Use short descriptive branch names without `codex/` or `feature/` prefixes.
- Never commit, push, deploy, alter remote services, or change production data unless
  explicitly requested. Do not automatically commit.
- If asked to commit, use a short conventional commit message of at most one sentence
  and no co-author attribution.
