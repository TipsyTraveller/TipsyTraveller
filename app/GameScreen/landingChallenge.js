import {
  COUNTRY_WORD_CHALLENGE_TYPE,
  didTriggerRoadsideDuel,
  GEO_GUESSR_CHALLENGE_TYPE,
  getChallengeForStop,
  getChallengeIdForStop,
  getChallengeKey,
  getCountryWordRound,
  getGeoGuessrRound,
  getPersonalMatchRound,
  getSizeItUpRound,
  getTargetCursorKey,
  getTargetedChallengeRound,
  PERSONAL_MATCH_CHALLENGE_TYPE,
  SIZE_IT_UP_CHALLENGE_TYPE,
} from './constants/challenges';
import { getBetaLandingPlan } from './betaPlannedContent';

/**
 * Pure challenge selection for a team that lands on a stop. It is the authoritative
 * multiplayer transition body: it receives the current gameplay record and returns the
 * challenge id, the synchronized round and the updated selection history without side
 * effects, so a re-run of a Firebase transaction yields the same result.
 *
 * With a beta scenario the planned challenge and per-team content win over history
 * filters; a Roadside Duel still replaces the plan and then avoids reserved photos.
 */
export const resolveLandingChallenge = ({
  betaScenario = null,
  actionId,
  current,
  difficulty,
  monumentPool,
  players,
  requiredTeamIds,
  routeStops,
  startedAt,
  stopIndex,
  teamId,
  fromLeg,
  timerPace,
}) => {
  const stop = routeStops[stopIndex];
  const isRoadsideDuel = didTriggerRoadsideDuel({
    fromLeg,
    targetLeg: stopIndex,
    teamId,
    teamProgress: current.teamProgress,
  });
  const landingPlan = getBetaLandingPlan({ betaScenario, stop, stopIndex, teamId });
  const challengeId = getChallengeIdForStop(stop, actionId, {
    teamPlayerCount: players.length,
    forceType: isRoadsideDuel ? GEO_GUESSR_CHALLENGE_TYPE : null,
    usedChallengeKeys: current.usedChallengeKeys,
    plannedChallengeId: landingPlan.plannedChallengeId,
  });
  const challenge = getChallengeForStop(stopIndex, routeStops, challengeId);
  const plannedContent = landingPlan.getContent(challengeId);
  let challengeRound = null;
  let usedMonumentIds = Array.isArray(current.usedMonumentIds) ? current.usedMonumentIds : [];
  let usedSizeRoundIds = Array.isArray(current.usedSizeRoundIds) ? current.usedSizeRoundIds : [];
  let usedPersonalQuestionIds = Array.isArray(current.usedPersonalQuestionIds)
    ? current.usedPersonalQuestionIds
    : [];
  const challengeKey = getChallengeKey(stop, challengeId);
  const usedChallengeKeys = challengeKey
    ? [...new Set([...(current.usedChallengeKeys || []), challengeKey])]
    : (current.usedChallengeKeys || []);
  const targetCursors = { ...(current.targetCursors || {}) };

  if (challenge.type === GEO_GUESSR_CHALLENGE_TYPE) {
    const geoData = getGeoGuessrRound({
      challenge,
      isRoadsideDuel,
      monumentPool,
      requiredTeamIds,
      seed: actionId,
      startedAt,
      stopCountryId: stop?.id || null,
      usedMonumentIds,
      difficulty,
      timerPace,
      plannedContent,
      reservedMonumentIds: landingPlan.reservedMonumentIds,
    });
    if (geoData) {
      challengeRound = geoData.round;
      usedMonumentIds = geoData.nextUsedMonumentIds;
    }
  } else if (challenge.type === SIZE_IT_UP_CHALLENGE_TYPE) {
    const sizeData = getSizeItUpRound({
      challenge,
      difficulty,
      seed: actionId,
      startedAt,
      timerPace,
      usedRoundIds: usedSizeRoundIds,
      plannedContent,
    });
    if (sizeData) {
      challengeRound = sizeData.round;
      usedSizeRoundIds = sizeData.nextUsedRoundIds;
    }
  } else if (challenge.type === PERSONAL_MATCH_CHALLENGE_TYPE) {
    const cursorKey = getTargetCursorKey(teamId, 'respondent');
    const personalData = getPersonalMatchRound({
      challenge,
      difficulty,
      players,
      seed: actionId,
      targetCursor: targetCursors[cursorKey],
      timerPace,
      usedQuestionIds: usedPersonalQuestionIds,
      plannedContent,
    });
    if (personalData) {
      challengeRound = personalData.round;
      usedPersonalQuestionIds = personalData.nextUsedQuestionIds;
      targetCursors[cursorKey] = (Number(targetCursors[cursorKey]) || 0) + 1;
    }
  } else if (challenge.type === COUNTRY_WORD_CHALLENGE_TYPE) {
    const cursorKey = getTargetCursorKey(teamId, 'describer');
    challengeRound = getCountryWordRound(
      challenge,
      players,
      actionId,
      difficulty,
      timerPace,
      targetCursors[cursorKey],
      plannedContent
    );
    if (challengeRound) targetCursors[cursorKey] = (Number(targetCursors[cursorKey]) || 0) + 1;
  } else if (challenge.targeting?.role) {
    const cursorKey = getTargetCursorKey(teamId, challenge.targeting.role);
    challengeRound = getTargetedChallengeRound(
      challenge,
      players,
      targetCursors[cursorKey],
      difficulty
    );
    if (challengeRound) targetCursors[cursorKey] = (Number(targetCursors[cursorKey]) || 0) + 1;
  }

  return {
    challenge,
    challengeId,
    challengeRound,
    isRoadsideDuel,
    history: {
      usedMonumentIds,
      usedSizeRoundIds,
      usedPersonalQuestionIds,
      usedChallengeKeys,
      targetCursors,
    },
  };
};
