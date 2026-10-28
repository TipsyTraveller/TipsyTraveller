export const DEFAULT_ROOM_RULES = {
  challengeTimerPace: 'relaxed',
  fastDiceAnimations: false,
  autoAdvance: false,
};

export const AUTO_ADVANCE_COUNTDOWN_SECONDS = 4;
export const SPEED_TIMER_MULTIPLIER = 0.75;
export const FAST_DICE_TIMING_MULTIPLIER = 0.55;

export const normalizeRoomRules = (value = {}) => ({
  challengeTimerPace: value.challengeTimerPace === 'speed' ? 'speed' : 'relaxed',
  fastDiceAnimations: Boolean(value.fastDiceAnimations),
  autoAdvance: Boolean(value.autoAdvance),
});

export const roomRulesFromSettings = (settings = {}) => normalizeRoomRules({
  challengeTimerPace: settings.challengeTimer,
  fastDiceAnimations: settings.fastDice,
  autoAdvance: settings.autoAdvanceTurn,
});

export const getRoomRules = (gameData = {}) => normalizeRoomRules(gameData.roomRules);

export const resolveTimerSeconds = (seconds, timerPace = 'relaxed') => {
  const duration = Math.max(1, Number(seconds) || 1);
  return timerPace === 'speed'
    ? Math.max(1, Math.round(duration * SPEED_TIMER_MULTIPLIER))
    : duration;
};

export const getDiceTimingMultiplier = (roomRules) => (
  normalizeRoomRules(roomRules).fastDiceAnimations ? FAST_DICE_TIMING_MULTIPLIER : 1
);
