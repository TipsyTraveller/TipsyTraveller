import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TurnHandoff({ activeTeamId, activeTeamLabel, isConnected, localTeamId, multiplayerEnabled, visible }) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  const isLocalTurn = !multiplayerEnabled || localTeamId === activeTeamId;
  const title = !isConnected
    ? 'RECONNECTING…'
    : isLocalTurn
      ? `${activeTeamLabel}, YOU’RE UP!`
      : `${activeTeamLabel} IS UP`;
  const detail = !isConnected
    ? 'Your game is safe. Actions resume when the connection returns.'
    : isLocalTurn
      ? 'Team leader: roll the die to start your turn.'
      : `Waiting for ${activeTeamLabel}’s leader to roll.`;

  return (
    <View pointerEvents="none" style={[styles.positioner, { bottom: Math.max(12, insets.bottom + 8) }]}>
      <View style={[styles.card, isLocalTurn && isConnected && styles.localCard, !isConnected && styles.offlineCard]}>
        <Text style={styles.title}>{title.toUpperCase()}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  positioner: { position: 'absolute', left: 72, right: 72, zIndex: 7, alignItems: 'center' },
  card: { maxWidth: 520, backgroundColor: 'rgba(255, 241, 205, 0.96)', borderColor: '#15222E', borderWidth: 2, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, alignItems: 'center' },
  localCard: { backgroundColor: 'rgba(255, 215, 0, 0.96)', borderWidth: 3 },
  offlineCard: { backgroundColor: 'rgba(232, 65, 47, 0.96)' },
  title: { fontFamily: 'dogicapixelbold', fontSize: 12, color: '#111111', textAlign: 'center' },
  detail: { marginTop: 4, fontSize: 11, color: '#2C3E50', textAlign: 'center' },
});
