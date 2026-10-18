import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TourControl = ({ activeTeamLabel, canRoll, lastRoll, onRestart, onRoll, state }) => {
  const insets = useSafeAreaInsets();
  const isDone = state === 'done';
  const buttonDisabled = !canRoll && !isDone;

  return (
    <View style={[styles.tourControl, { right: insets.right + 10, top: insets.top + 8 }]}>
      <Text style={styles.teamText}>{isDone ? 'Game Over' : `${activeTeamLabel}'s Turn`}</Text>
      {lastRoll && !isDone && (
        <Text style={styles.rollText}>Last roll: {lastRoll}</Text>
      )}

      <TouchableOpacity
        accessibilityRole="button"
        onPress={isDone ? onRestart : onRoll}
        style={[styles.moveButton, buttonDisabled && styles.buttonDisabled]}
        disabled={buttonDisabled}
      >
        <Text style={styles.footerText}>
          {state === 'waiting' && 'Roll Dice'}
          {state === 'rolling' && 'Rolling...'}
          {state === 'moving' && 'Moving...'}
          {state === 'challenge' && 'Challenge...'}
          {isDone && 'Restart'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  tourControl: {
    position: 'absolute',
    alignItems: 'stretch',
    gap: 6,
    padding: 8,
    backgroundColor: '#FAF3E0',
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#111111',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.24,
    shadowRadius: 0,
  },
  moveButton: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 116,
    minHeight: 38,
    paddingHorizontal: 10,
    backgroundColor: '#1BA39C',
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#111111',
  },
  buttonDisabled: { opacity: 0.4 },
  teamText: { color: '#2C3E50', fontSize: 9, fontFamily: 'dogicapixelbold', textTransform: 'uppercase' },
  rollText: { color: '#D71920', fontSize: 10, fontFamily: 'dogicapixel' },
  footerText: { fontSize: 12, fontWeight: 'bold', color: '#FFF', fontFamily: 'dogicapixel' },
});

export default TourControl;
