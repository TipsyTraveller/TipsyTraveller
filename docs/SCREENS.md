# Screens and navigation

The root navigator is defined in `app/app/app.js`. Headers are screen-owned; lobby,
account, and settings disable swipe gestures to protect scroll interaction.

## Flow

```text
Home → CreateGameScreen → HostName → LobbyScreen
Home → JoinGameScreen ───────────────→ LobbyScreen
LobbyScreen → CharacterSelection → GameScreen
Header/Dev Portal → AccountScreen or SettingsScreen
```

Development may start on `GameScreen` when `START_ON_DEV_GAME_SCREEN` in
`app/app/devGameRoute.js` is enabled; it is normally `false`.

## Screen responsibilities

- `Home`: create/join entry plus account/settings access.
- `CreateGameScreen`: three-step difficulty, duration, and player-range selection.
  Edit mode updates the same lobby; reducing capacity is rejected when the roster or
  Team 3 would no longer fit. Changing duration creates a new room route snapshot.
- `HostName`: obtains or creates device identity, reserves a four-digit code, loads
  authored content with bundled fallback, snapshots the route, creates room/player
  records, registers disconnect handling, and resets navigation to Home → Lobby.
- `JoinGameScreen`: validates room/name/expiry, restores same-device host identity,
  avoids duplicate insertion, assigns the least populated valid team, and joins.
- `LobbyScreen`: listens to room and roster, supports host removal and local players,
  starts character selection, and exposes the concise Rules summary.
- `CharacterSelection`: identifies the local team role, preselects the leader's saved
  preferred vehicle, lets leaders choose one vehicle per team, observes readiness,
  and enters the game when host initialization completes. Non-leaders spectate readiness.
- `GameScreen`: locks landscape, restores canonical gameplay, coordinates board and
  overlays, limits actions by role, shows canonical final standings, lets every player
  leave, lets only the host start a rematch, and unlocks orientation on unmount.
- `AccountScreen`: local username, badges, preferred vehicles, and gameplay-driven
  career statistics in AsyncStorage. Device identity regeneration remains in the
  development portal rather than the player account.
- `SettingsScreen`: local audio/haptics and camera preferences, host defaults for
  synchronized challenge timing, dice speed, and auto-advance, plus the guide and
  app information. New rooms snapshot the host defaults; changing another device's
  defaults does not alter an active room.

## Navigation parameter contracts

Create setup → HostName:

```js
{ difficulty, duration, nrOfPlayers, persons: {} }
```

HostName → LobbyScreen:

```js
{ gameID, isHost: true, hostName, ...gameSettings }
```

JoinGameScreen → LobbyScreen:

```js
{ gameID, isHost, gameSettings }
```

LobbyScreen → CharacterSelection:

```js
{ gameID, gameData, teamMembers }
```

LobbyScreen → CreateGameScreen edit mode:

```js
{ editingGameID, gameSettings: { difficulty, duration, nrOfPlayers, persons } }
```

CharacterSelection → GameScreen:

```js
{ gameID, gameData: { ...gameData, teamModels }, teamMembers }
```

`gameID` selects the canonical record, `teamMembers` maps the local device to its
team/leader role, and `gameData` supplies room settings, host identity, route, and
models. Preserve these shapes or update every sender/receiver together.

Account and Settings require no parameters. Their back behavior returns directly to
Home; switching between them uses replacement to avoid nested stacks.
