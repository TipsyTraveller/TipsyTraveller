import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GameHud = ({
  activeTeamLabel,
  activeTeamScore,
  canRestart,
  fromName,
  gamePieces,
  lastRoll,
  onRestart,
  progress,
  remainingMoves,
  state,
  teamProgress,
  toName,
}) => {
  const insets = useSafeAreaInsets();
  const standings = [...gamePieces].sort((left, right) => {
    const leftProgress = teamProgress[left.id] || {};
    const rightProgress = teamProgress[right.id] || {};
    if (leftProgress.finishPosition && rightProgress.finishPosition) {
      return leftProgress.finishPosition - rightProgress.finishPosition;
    }
    if (leftProgress.finishPosition) return -1;
    if (rightProgress.finishPosition) return 1;
    return (rightProgress.score || 0) - (leftProgress.score || 0);
  });

  return (
  <>
    {state !== 'done' && (
      <View style={[styles.hudOverlay, { left: insets.left + 10, top: insets.top + 8 }]} pointerEvents="none">
        <Text style={styles.hudTeam}>{activeTeamLabel} · {activeTeamScore} PTS</Text>
        <Text style={styles.hudRoute}>{fromName}  -  {toName}</Text>
        <Text style={styles.hudProgress}>
          {state === 'moving' && `Roll ${lastRoll} - ${remainingMoves} stops left`}
          {state === 'challenge' && 'Complete the country challenge'}
          {state === 'roadblock' && 'Roadblock — choose your route'}
          {!['moving', 'challenge', 'roadblock'].includes(state) && `Leg ${progress}`}
        </Text>
      </View>
    )}

    {state === 'done' && (
      <View
        style={[styles.doneOverlay, { top: insets.top + 8 }]}
        pointerEvents={canRestart ? 'auto' : 'none'}
      >
        <Text style={styles.doneText}>{standings[0]?.label} wins!</Text>
        <View style={styles.standings}>
          {standings.map((piece, index) => (
            <View key={piece.id} style={styles.standingRow}>
              <Text style={styles.standingPlace}>#{index + 1}</Text>
              <View style={[styles.teamDot, { backgroundColor: piece.color }]} />
              <Text style={styles.standingTeam}>{piece.label}</Text>
              <Text style={styles.standingScore}>{teamProgress[piece.id]?.score || 0} PTS</Text>
            </View>
          ))}
        </View>
        {canRestart ? (
          <TouchableOpacity
            accessibilityLabel="Restart game"
            accessibilityRole="button"
            onPress={onRestart}
            style={styles.restartButton}
          >
            <Text style={styles.restartText}>Restart</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.hostRestartText}>Host restarts</Text>
        )}
      </View>
    )}
  </>
  );
};

const styles = StyleSheet.create({
  hudOverlay: {
    position: 'absolute',
    maxWidth: '52%',
    backgroundColor: '#FFF1CD',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderWidth: 3,
    borderColor: '#111111',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 0,
  },
  hudTeam: { color: '#1BA39C', fontSize: 12, fontFamily: 'dogicapixelbold', textTransform: 'uppercase' },
  hudRoute: { color: '#111111', fontSize: 12, lineHeight: 17, fontFamily: 'dogicapixelbold', marginTop: 4, textAlign: 'center' },
  hudProgress: { color: '#2C3E50', fontSize: 10, marginTop: 4, fontFamily: 'dogicapixel' },

  doneOverlay: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    backgroundColor: '#FFF1CD',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderWidth: 3,
    borderColor: '#FFD700',
    minWidth: 250,
  },
  doneText: { color: '#111111', fontSize: 14, fontFamily: 'dogicapixelbold', textAlign: 'center' },
  standings: {
    marginTop: 9,
    gap: 5,
  },
  standingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  standingPlace: {
    width: 24,
    color: '#D71920',
    fontFamily: 'dogicapixelbold',
    fontSize: 8,
  },
  teamDot: {
    width: 9,
    height: 9,
    marginRight: 7,
    borderWidth: 1,
    borderColor: '#111111',
    borderRadius: 5,
  },
  standingTeam: {
    flex: 1,
    color: '#2C3E50',
    fontFamily: 'dogicapixelbold',
    fontSize: 8,
  },
  standingScore: {
    color: '#111111',
    fontFamily: 'dogicapixelbold',
    fontSize: 8,
  },
  restartButton: {
    marginTop: 8,
    minHeight: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#111111',
    borderRadius: 7,
    backgroundColor: '#1BA39C',
  },
  restartText: {
    color: '#FFFFFF',
    fontFamily: 'dogicapixelbold',
    fontSize: 9,
    textTransform: 'uppercase',
  },
  hostRestartText: {
    marginTop: 7,
    color: '#2C3E50',
    fontFamily: 'dogicapixel',
    fontSize: 8,
    textTransform: 'uppercase',
  },
});

export default GameHud;
