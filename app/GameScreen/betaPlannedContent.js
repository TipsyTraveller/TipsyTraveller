/**
 * Read-only access to the optional `betaScenario` room snapshot (schemaVersion 1).
 *
 * Gameplay integration (package B) only consumes the snapshot; the preset, validation
 * and snapshot creation live elsewhere. The canonical A/C shape is
 * `stops[countryId]: { challenge, contentByTeam }`, with typed full snapshots
 * (`word`, `question`, `monument`, or `round`) per team. normalizePlan adapts it
 * to the round builders. The earlier B shape below remains readable too:
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

// A/C persist full challenge + typed content snapshots keyed by country ID.
// Adapt those records to B's round-builder arguments, retaining support for
// its earlier array fixtures and legacy rooms without rewriting stored data.
const normalizePlan = (plan) => {
  if (!plan || !plan.challenge || !plan.contentByTeam) return plan;
  return {
    ...plan,
    stopId: plan.stopId || plan.__key,
    challengeId: plan.challenge.id,
    content: Object.fromEntries(Object.entries(plan.contentByTeam).map(([teamId, content]) => [
      teamId,
      {
        ...content,
        ...(content.type === 'countryWordGuess' ? { secretWord: content.word } : {}),
        ...(content.type === 'personalMatch' ? {
          questionId: content.question.id,
          prompt: content.question.prompt,
          options: content.question.options,
        } : {}),
        ...(content.type === 'sizeItUp' ? { sizeRoundId: content.round.id, sizeRound: content.round } : {}),
      },
    ])),
  };
};

export const isBetaScenario = (betaScenario) => (
  Boolean(betaScenario)
  && typeof betaScenario === 'object'
  && Number(betaScenario.schemaVersion) === BETA_SCENARIO_SCHEMA_VERSION
);

/** Planned entry for a route stop, matched by stop id (or route index key). */
export const getBetaStopPlan = (betaScenario, stop, stopIndex = null) => {
  if (!isBetaScenario(betaScenario) || !stop?.id) return null;
  const plans = toList(betaScenario.stops).filter(Boolean).map(normalizePlan);
  return plans.find((plan) => plan.stopId === stop.id)
    || plans.find((plan) => !plan.stopId && stopIndex !== null && String(plan.__key) === String(stopIndex))
    || null;
};

export const getBetaPlannedChallengeId = (betaScenario, stop, stopIndex = null) => (
  getBetaStopPlan(betaScenario, stop, stopIndex)?.challengeId || null
);

export const isBetaRequiredStop = (betaScenario, stop) => (
  getBetaStopPlan(betaScenario, stop)?.mustPlay === true
);

// Required cards stay attached to their country until reached, then carry forward
// to the next landing. Per-team history makes reconnects and transaction retries safe.
export const getBetaRequiredLanding = (betaScenario, routeStops, stopIndex, playedStopIds = []) => {
  if (!isBetaScenario(betaScenario)) return null;
  const played = new Set(playedStopIds || []);
  for (let index = 1; index <= stopIndex && index < routeStops.length - 1; index += 1) {
    const stop = routeStops[index];
    if (isBetaRequiredStop(betaScenario, stop) && !played.has(stop.id)) {
      return { stop, plan: getBetaStopPlan(betaScenario, stop) };
    }
  }
  return null;
};

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
  toList(betaScenario.stops).filter(Boolean).map(normalizePlan).forEach((plan) => {
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
