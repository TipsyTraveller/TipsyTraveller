const EMPTY_COUNTERS = {
  diceRolls: 0,
  challengesCompleted: 0,
  toursCompleted: 0,
};

export const createSessionCareerCounters = (teamMembers = {}) => (
  Object.entries(teamMembers).reduce((counters, [teamId, members]) => {
    if (!teamId.startsWith('team') || !members || typeof members !== 'object') return counters;
    Object.keys(members).forEach((playerId) => {
      counters[playerId] = { ...EMPTY_COUNTERS };
    });
    return counters;
  }, {})
);

export const normalizeCareerCounters = (counters, teamMembers) => {
  const initial = createSessionCareerCounters(teamMembers);
  return Object.keys(initial).reduce((next, playerId) => ({
    ...next,
    [playerId]: {
      ...initial[playerId],
      ...(counters?.[playerId] || {}),
    },
  }), {});
};

export const incrementTeamCareerCounter = (
  counters,
  teamMembers,
  teamId,
  key,
  amount = 1
) => {
  const next = { ...(counters || {}) };
  Object.keys(teamMembers?.[teamId] || {}).forEach((playerId) => {
    const previous = next[playerId] || EMPTY_COUNTERS;
    next[playerId] = {
      ...previous,
      [key]: Math.max(0, (Number(previous[key]) || 0) + amount),
    };
  });
  return next;
};
