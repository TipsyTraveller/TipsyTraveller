import { createInitialTeamProgress, getGamePiecesForGame } from './constants/gamePieces';
import {
  DICE_MAX_RESULT,
  DICE_RESULT_DURATION,
  DICE_RESULT_EXIT_BUFFER,
} from './constants/diceBounds';
import { DRIVE_SPEED_UNITS_PER_SECOND } from './constants/movement';
import { getPathRevealDuration } from './constants/route';

export const GAMEPLAY_SCHEMA_VERSION = 3;
export const POINTS_PER_STOP = 10;
export const FINISH_BONUSES = [30, 15, 5];

export const getFinishPosition = (teamProgress) => (
  Object.values(teamProgress || {}).filter((progress) => progress?.isDone).length + 1
);

export const getTeamScore = ({ finishPosition = null, currentLeg = 0 }) => (
  currentLeg * POINTS_PER_STOP
  + (finishPosition ? (FINISH_BONUSES[finishPosition - 1] || 0) : 0)
);

export const createSessionId = () => (
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
);

export const createActionId = (deviceID = 'device') => (
  `${deviceID}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
);

export const createInitialGameplay = (gameData, now = Date.now()) => {
  const gamePieces = getGamePiecesForGame(gameData);

  return {
    schemaVersion: GAMEPLAY_SCHEMA_VERSION,
    sessionId: createSessionId(),
    revision: 0,
    phase: 'waiting',
    activeTeamId: gamePieces[0]?.id || 'team1',
    turnNumber: 1,
    teamProgress: createInitialTeamProgress(gamePieces),
    currentAction: null,
    challengeStop: null,
    challengeId: null,
    updatedAt: now,
  };
};

export const getRequiredTeamIds = (gameData) => (
  getGamePiecesForGame(gameData).map((piece) => piece.id)
);

export const getNextActiveTeamId = (teamIds, teamProgress, currentTeamId) => {
  if (!teamIds.length) return null;

  const currentIndex = Math.max(teamIds.indexOf(currentTeamId), 0);
  for (let offset = 1; offset <= teamIds.length; offset += 1) {
    const teamId = teamIds[(currentIndex + offset) % teamIds.length];
    if (!teamProgress?.[teamId]?.isDone) return teamId;
  }

  return null;
};

export const getRollTiming = ({ fromLeg, routeModel, targetLeg, now }) => {
  const moveCount = Math.max(targetLeg - fromLeg, 0);
  const resultDuration = (DICE_RESULT_DURATION + DICE_RESULT_EXIT_BUFFER) * 1000;
  const revealDuration = getPathRevealDuration(moveCount) * 1000 + 80;
  const movementDuration = Math.max(
    0,
    ((routeModel.stopDistances[targetLeg] - routeModel.stopDistances[fromLeg]) / DRIVE_SPEED_UNITS_PER_SECOND) * 1000
  );
  const movementStartsAt = now + Math.max(resultDuration, revealDuration);

  return {
    startedAt: now,
    movementStartsAt,
    movementEndsAt: movementStartsAt + movementDuration,
  };
};

export const buildRollAction = ({ deviceID, gameplay, inputMethod, now, routeModel, value }) => {
  const activeProgress = gameplay?.teamProgress?.[gameplay.activeTeamId];
  const fromLeg = activeProgress?.currentLeg ?? 0;
  const safeValue = Math.max(1, Math.min(Math.round(Number(value) || 1), DICE_MAX_RESULT));
  const targetLeg = Math.min(fromLeg + safeValue, routeModel.finalStopIndex);

  return {
    id: createActionId(deviceID),
    type: 'roll',
    teamId: gameplay.activeTeamId,
    value: safeValue,
    fromLeg,
    targetLeg,
    inputMethod,
    ...getRollTiming({ fromLeg, routeModel, targetLeg, now }),
  };
};
