import { useCallback, useEffect } from 'react';
import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

const DICE_SOUND = require('../../../assets/audio/dice.wav');
const CHALLENGE_SOUND = require('../../../assets/audio/challenge.wav');
const AMBIENT_SOUND = require('../../../assets/audio/ambient.wav');

const safely = (operation) => {
  try {
    const result = operation();
    if (result?.catch) result.catch(() => {});
  } catch (_error) {
    // Presentation feedback must never interrupt gameplay.
  }
};

export default function useGameFeedback(settings) {
  const dicePlayer = useAudioPlayer(DICE_SOUND);
  const challengePlayer = useAudioPlayer(CHALLENGE_SOUND);
  const ambientPlayer = useAudioPlayer(AMBIENT_SOUND);

  useEffect(() => {
    ambientPlayer.loop = true;
    ambientPlayer.volume = 0.16;
    if (settings.ambientMusic) {
      safely(() => ambientPlayer.play());
    } else {
      safely(() => ambientPlayer.pause());
    }
    return () => safely(() => ambientPlayer.pause());
  }, [ambientPlayer, settings.ambientMusic]);

  const play = useCallback((player, haptic) => {
    if (settings.ambientMusic) safely(() => ambientPlayer.play());
    if (settings.soundEffects) {
      safely(async () => {
        await player.seekTo(0);
        player.play();
      });
    }
    if (settings.hapticFeedback && haptic) safely(haptic);
  }, [ambientPlayer, settings.ambientMusic, settings.hapticFeedback, settings.soundEffects]);

  return {
    dice: useCallback(() => play(
      dicePlayer,
      () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    ), [dicePlayer, play]),
    challenge: useCallback(() => play(
      challengePlayer,
      () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    ), [challengePlayer, play]),
    result: useCallback(() => {
      if (settings.hapticFeedback) {
        safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
      }
    }, [settings.hapticFeedback]),
  };
}
