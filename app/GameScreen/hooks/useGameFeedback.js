import { useCallback, useEffect } from 'react';
import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

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

  const play = useCallback((haptic) => {
    if (settings.ambientMusic) safely(() => ambientPlayer.play());
    if (settings.hapticFeedback && haptic) safely(haptic);
  }, [ambientPlayer, settings.ambientMusic, settings.hapticFeedback]);

  return {
    dice: useCallback(() => play(
      () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    ), [play]),
    challenge: useCallback(() => play(
      () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    ), [play]),
    movement: useCallback(() => play(
      () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    ), [play]),
    roadblock: useCallback(() => play(
      () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    ), [play]),
    result: useCallback(() => {
      if (settings.hapticFeedback) {
        safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
      }
    }, [settings.hapticFeedback]),
    victory: useCallback(() => play(
      () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    ), [play]),
  };
}
