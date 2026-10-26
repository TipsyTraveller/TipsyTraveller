export const ALL_TEAM_KEYS = ['team1', 'team2', 'team3'];

export const PLAYER_CAPACITY = {
  '1-4': 4,
  '5-8': 8,
  '9-12': 12,
};

export const getRequiredTeamKeys = (gameData) => (
  gameData?.nrOfPlayers === '9-12'
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
    .sort((left, right) => left.count - right.count || left.index - right.index)[0]?.teamKey
);

export const getLobbyReadiness = (gameData, players, { requireVehicles = false } = {}) => {
  const issues = [];
  const requiredTeamKeys = getRequiredTeamKeys(gameData);

  requiredTeamKeys.forEach((teamKey, index) => {
    const label = `Team ${index + 1}`;
    const entries = getTeamEntries(players, teamKey);
    if (!entries.length) {
      issues.push(`${label} needs a player`);
      return;
    }

    const deviceLeaders = entries.filter(([, player]) => (
      player?.isLeader && Boolean(player?.deviceID)
    ));
    if (deviceLeaders.length === 0) {
      issues.push(`${label} needs a leader with a connected phone`);
    } else if (deviceLeaders.length > 1) {
      issues.push(`${label} must have exactly one leader`);
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
