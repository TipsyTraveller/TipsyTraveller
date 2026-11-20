export const ALL_TEAM_KEYS = ['team1', 'team2', 'team3'];

export const PLAYER_CAPACITY = {
  '1-4': 4,
  '5-8': 8,
  '9-12': 12,
};

export const getRequiredTeamKeys = (gameData) => (
  gameData?.betaScenario || gameData?.nrOfPlayers === '9-12'
    ? ALL_TEAM_KEYS
    : ALL_TEAM_KEYS.slice(0, 2)
);

export const getTeamEntries = (players, teamKey) => {
  const team = players?.[teamKey];
  return team && typeof team === 'object' ? Object.entries(team) : [];
};

export const countPlayers = (players) => (
  ALL_TEAM_KEYS.reduce((total, teamKey) => total + getTeamEntries(players, teamKey).length, 0)
);

export const withPlayerCounter = (players) => ({
  ...(players || {}),
  playerCounter: countPlayers(players),
});

export const findPlayerByDevice = (players, deviceID) => {
  if (!deviceID) return null;

  for (const teamKey of ALL_TEAM_KEYS) {
    const match = getTeamEntries(players, teamKey)
      .find(([, player]) => player?.deviceID === deviceID);
    if (match) return { teamKey, playerId: match[0], player: match[1] };
  }
  return null;
};

export const chooseTeamForJoin = (gameData, players) => (
  getRequiredTeamKeys(gameData)
    .map((teamKey, index) => ({
      teamKey,
      index,
      count: getTeamEntries(players, teamKey).length,
    }))
    .filter(({ teamKey, count }) => !gameData?.betaScenario || (
      count < 3 && !getTeamEntries(players, teamKey).some(([, player]) => player?.deviceID || player?.isLeader)
    ))
    .sort((left, right) => left.count - right.count || left.index - right.index)[0]?.teamKey
);

export const getPlayerCapacity = (gameData) => gameData?.betaScenario ? 9 : PLAYER_CAPACITY[gameData?.nrOfPlayers];

export const chooseTeamForLocalPlayer = (game, players) => game?.betaScenario
  ? ALL_TEAM_KEYS.find((key) => getTeamEntries(players, key).filter(([, player]) => !player?.deviceID).length < 2
    && getTeamEntries(players, key).length < 3)
  : chooseTeamForJoin(game, players);

// Beta phones are always leaders. The remaining six participants have no device ID.
export const getBetaRosterIssues = (game, players, { requireComplete = false } = {}) => {
  const issues = [];
  if (game?.betaScenario?.schemaVersion !== 1 || game.betaScenario.playerCount !== 9 || game.nrOfPlayers !== '9-12') {
    issues.push('Invalid beta room settings');
  }
  const devices = new Set();
  const playerIds = new Set();
  for (const key of Object.keys(players || {})) {
    if (key !== 'playerCounter' && !ALL_TEAM_KEYS.includes(key)) issues.push('The beta uses exactly three teams');
  }
  ALL_TEAM_KEYS.forEach((teamKey, index) => {
    const entries = getTeamEntries(players, teamKey);
    const label = `Team ${index + 1}`;
    if (entries.length > 3 || (requireComplete && entries.length !== 3)) issues.push(`${label} needs exactly three players`);
    const guests = entries.filter(([, player]) => !player?.deviceID);
    if (guests.length > 2) issues.push(`${label} reserves one place for its leader phone`);
    let leaders = 0;
    entries.forEach(([id, player]) => {
      if (playerIds.has(id)) issues.push('A player cannot belong to two teams');
      playerIds.add(id);
      if (!player || typeof player.name !== 'string' || !player.name.trim()) issues.push(`${label} has an unnamed player`);
      if (player?.isBot || String(player?.deviceID || '').startsWith('dev-bot-')) issues.push('Beta rooms do not accept bots');
      if (player?.isLeader) leaders += 1;
      if (Boolean(player?.deviceID) !== (player?.isLeader === true)) issues.push(`${label} needs a real leader phone and two local players`);
      if (player?.deviceID) {
        if (typeof player.deviceID !== 'string' || !player.deviceID.trim() || devices.has(player.deviceID)) issues.push('Each leader must use a different phone');
        devices.add(player.deviceID);
      }
    });
    if (leaders > 1 || (requireComplete && leaders !== 1)) issues.push(`${label} needs exactly one leader with a phone`);
  });
  if (countPlayers(players) > 9 || (requireComplete && countPlayers(players) !== 9)) issues.push('The beta requires exactly nine players');
  if (!game?.hostDeviceID || !devices.has(game.hostDeviceID)) issues.push('The host must be one of the leader phones');
  return issues;
};

export const getLobbyReadiness = (gameData, players, { requireVehicles = false } = {}) => {
  if (gameData?.betaScenario) {
    const issues = getBetaRosterIssues(gameData, players, { requireComplete: true });
    if (requireVehicles) ALL_TEAM_KEYS.forEach((key, index) => {
      if (!gameData.teamModels?.[key]) issues.push(`Team ${index + 1} needs to select a vehicle`);
    });
    return { isReady: !issues.length, issues, reason: issues[0] || '', requiredTeamKeys: ALL_TEAM_KEYS, playerCount: countPlayers(players), capacity: 9 };
  }
  const issues = [];
  const requiredTeamKeys = getRequiredTeamKeys(gameData);
  const leaderDeviceTeams = new Map();

  requiredTeamKeys.forEach((teamKey, index) => {
    const label = `Team ${index + 1}`;
    const entries = getTeamEntries(players, teamKey);
    if (!entries.length) {
      issues.push(`${label} needs a player`);
      return;
    }

    const leaders = entries.filter(([, player]) => player?.isLeader);
    if (leaders.length === 0 || !leaders[0]?.[1]?.deviceID) {
      issues.push(`${label} needs a leader with a connected phone`);
    } else if (leaders.length > 1) {
      issues.push(`${label} must have exactly one leader`);
    } else {
      const deviceID = leaders[0][1].deviceID;
      const otherTeamLabel = leaderDeviceTeams.get(deviceID);
      if (otherTeamLabel) {
        issues.push(`${label} needs a different leader phone than ${otherTeamLabel}`);
      } else {
        leaderDeviceTeams.set(deviceID, label);
      }
    }

    if (requireVehicles && !gameData?.teamModels?.[teamKey]) {
      issues.push(`${label} needs to select a vehicle`);
    }
  });

  const capacity = PLAYER_CAPACITY[gameData?.nrOfPlayers];
  const playerCount = countPlayers(players);
  if (!capacity) issues.push('Choose a valid player range');
  if (capacity && playerCount > capacity) {
    issues.push(`The room has ${playerCount} players but only allows ${capacity}`);
  }

  return {
    isReady: issues.length === 0,
    issues,
    reason: issues[0] || '',
    requiredTeamKeys,
    playerCount,
    capacity,
  };
};
