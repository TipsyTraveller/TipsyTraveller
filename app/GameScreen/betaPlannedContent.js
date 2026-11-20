/**
 * Read-only access to the optional `betaScenario` room snapshot (schemaVersion 1).
 *
 * Gameplay integration (package B) only consumes the snapshot; the preset, validation
 * and snapshot creation live elsewhere. Consumed shape:
 *
 * betaScenario: {
 *   schemaVersion: 1, presetId, playerCount,
 *   stops: [ // array, or an object keyed by stop id / route index
 *     {
 *       stopId, challengeId,
 *       content: {
 *         team1|team2|team3: {
 *           secretWord                           // countryWordGuess
 *           questionId, prompt, options[4]       // personalMatch
 *           monument: { id, name, position, imageUrl, ... }   // geoGuessr
 *           sizeRoundId | sizeRound              // sizeItUp
 *         }
 *       }
 *     }
 *   ]
 * }
 *
 * Rooms without the field, or with an unknown schema version, behave as ordinary rooms.
 */

export const BETA_SCENARIO_SCHEMA_VERSION = 1;

const toList = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    // Realtime Database turns sparse arrays into objects; keep the key as a fallback id.
    return Object.entries(value).map(([key, entry]) => (
      entry && typeof entry === 'object' ? { __key: key, ...entry } : entry
    ));
  }
  return [];
};

export const isBetaScenario = (betaScenario) => (
  Boolean(betaScenario)
  && typeof betaScenario === 'object'
  && Number(betaScenario.schemaVersion) === BETA_SCENARIO_SCHEMA_VERSION
);

/** Planned entry for a route stop, matched by stop id (or route index key). */
export const getBetaStopPlan = (betaScenario, stop, stopIndex = null) => {
  if (!isBetaScenario(betaScenario) || !stop?.id) return null;
  const plans = toList(betaScenario.stops).filter(Boolean);
  return plans.find((plan) => plan.stopId === stop.id)
    || plans.find((plan) => !plan.stopId && stopIndex !== null && String(plan.__key) === String(stopIndex))
    || null;
};

export const getBetaPlannedChallengeId = (betaScenario, stop, stopIndex = null) => (
  getBetaStopPlan(betaScenario, stop, stopIndex)?.challengeId || null
);

/**
 * Fixed content for one team on one stop. Returns null unless the resolved challenge
 * is the planned one, so a special event that replaced the assignment never inherits
 * content that was prepared for a different challenge.
 */
export const getBetaPlannedContent = ({
  betaScenario,
  stop,
  stopIndex = null,
  teamId,
  challengeId,
}) => {
  const plan = getBetaStopPlan(betaScenario, stop, stopIndex);
  if (!plan || !challengeId || plan.challengeId !== challengeId) return null;
  const content = plan.content?.[teamId];
  return content && typeof content === 'object' ? content : null;
};

/** Photo ids planned for any team, so unplanned duels cannot reveal them early. */
export const getBetaReservedMonumentIds = (betaScenario) => {
  if (!isBetaScenario(betaScenario)) return [];
  const ids = new Set();
  toList(betaScenario.stops).filter(Boolean).forEach((plan) => {
    Object.values(plan.content || {}).forEach((content) => {
      const id = content?.monument?.id || content?.monumentId;
      if (id) ids.add(String(id));
    });
  });
  return [...ids];
};

/** One call that bundles everything a round builder needs for a landing. */
export const getBetaLandingPlan = ({ betaScenario, stop, stopIndex = null, teamId }) => {
  const plannedChallengeId = getBetaPlannedChallengeId(betaScenario, stop, stopIndex);
  return {
    plannedChallengeId,
    reservedMonumentIds: getBetaReservedMonumentIds(betaScenario),
    getContent: (challengeId) => getBetaPlannedContent({
      betaScenario,
      stop,
      stopIndex,
      teamId,
      challengeId,
    }),
  };
};
