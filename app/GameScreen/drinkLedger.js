const toDrinkCount = (value) => Math.max(0, Math.round(Number(value) || 0));

export const getTeamPlayers = (teamMembers, teamId) => {
  const members = teamMembers?.[teamId];
  if (!members || typeof members !== 'object') return [];

  return Object.entries(members)
    .filter(([, member]) => member?.name)
    .map(([playerId, member]) => ({
      ...member,
      playerId,
    }));
};

export const getTeamDrinkTotal = (playerDrinks) => (
  Object.values(playerDrinks || {}).reduce(
    (total, entry) => total + toDrinkCount(
      entry && typeof entry === 'object' ? entry.drinks : entry
    ),
    0
  )
);

export const createPlayerDrinkLedger = (
  teamMembers,
  teamId,
  currentLedger = {},
  legacyTeamDrinks = 0
) => {
  const players = getTeamPlayers(teamMembers, teamId);
  if (!players.length) return currentLedger && typeof currentLedger === 'object' ? currentLedger : {};

  const source = currentLedger && typeof currentLedger === 'object' ? currentLedger : {};
  const consumedLegacyNames = new Set();
  const ledger = players.reduce((next, player) => {
    const stableEntry = source[player.playerId];
    let drinks = stableEntry && typeof stableEntry === 'object'
      ? toDrinkCount(stableEntry.drinks)
      : null;

    if (drinks === null && !consumedLegacyNames.has(player.name)) {
      const legacyEntry = source[player.name];
      if (legacyEntry !== undefined) {
        drinks = toDrinkCount(
          legacyEntry && typeof legacyEntry === 'object' ? legacyEntry.drinks : legacyEntry
        );
        consumedLegacyNames.add(player.name);
      }
    }

    next[player.playerId] = {
      name: player.name,
      drinks: drinks ?? 0,
    };
    return next;
  }, {});

  // Rooms predating personal ledgers only have a team total. Preserve it on
  // migration without inventing duplicate totals for players with the same name.
  if (getTeamDrinkTotal(ledger) === 0 && toDrinkCount(legacyTeamDrinks) > 0) {
    ledger[players[0].playerId].drinks = toDrinkCount(legacyTeamDrinks);
  }

  return ledger;
};

export const normalizeTeamProgressDrinks = (teamProgress, teamMembers) => (
  Object.entries(teamProgress || {}).reduce((next, [teamId, progress]) => {
    if (!teamId.startsWith('team') || !progress || typeof progress !== 'object') {
      next[teamId] = progress;
      return next;
    }

    const { drinks: legacyTeamDrinks, ...progressWithoutLegacyTotal } = progress;
    next[teamId] = {
      ...progressWithoutLegacyTotal,
      playerDrinks: createPlayerDrinkLedger(
        teamMembers,
        teamId,
        progress.playerDrinks,
        legacyTeamDrinks
      ),
    };
    return next;
  }, {})
);

export const addDrinksToPlayer = (ledger, playerId, amount) => {
  const entry = ledger?.[playerId];
  if (!entry) return ledger || {};

  return {
    ...ledger,
    [playerId]: {
      ...entry,
      drinks: Math.max(0, toDrinkCount(entry.drinks) + Math.round(Number(amount) || 0)),
    },
  };
};

export const addDrinksToTeam = (ledger, amount) => (
  Object.entries(ledger || {}).reduce((next, [playerId, entry]) => ({
    ...next,
    [playerId]: {
      ...entry,
      drinks: Math.max(0, toDrinkCount(entry?.drinks) + Math.round(Number(amount) || 0)),
    },
  }), {})
);
