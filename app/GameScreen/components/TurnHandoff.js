import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TurnHandoff({ activeTeamColor, activeTeamId, activeTeamLabel, isConnected, localTeamId, multiplayerEnabled, visible }) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  const isLocalTurn = !multiplayerEnabled || localTeamId === activeTeamId;
  const title = !isConnected
    ? 'RECONNECTING…'
    : isLocalTurn
      ? 'YOUR TURN'
      : `${activeTeamLabel}’S TURN`;
  const detail = !isConnected
    ? 'Your game is safe. Actions resume when the connection returns.'
    : isLocalTurn
      ? `Roll the die for ${activeTeamLabel}.`
      : 'Waiting for the team leader to roll.';

  return (
    <View pointerEvents="none" style={[styles.positioner, { bottom: Math.max(12, insets.bottom + 8) }]}>
      <View style={[styles.card, isLocalTurn && isConnected && styles.localCard, !isConnected && styles.offlineCard]}>
        <View style={[styles.teamDot, { backgroundColor: activeTeamColor || '#1BA39C' }]} />
        <View style={styles.copy}>
          <Text style={styles.title}>{title.toUpperCase()}</Text>
          <Text style={styles.detail}>{detail}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  positioner: { position: 'absolute', left: 72, right: 72, zIndex: 7, alignItems: 'center' },
  card: { maxWidth: 420, backgroundColor: 'rgba(255, 255, 255, 0.96)', borderColor: '#15222E', borderWidth: 2, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9, flexDirection: 'row', alignItems: 'center' },
  localCard: { borderColor: '#FFD700' },
  offlineCard: { backgroundColor: 'rgba(232, 65, 47, 0.96)' },
  teamDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  copy: { flexShrink: 1 },
  title: { fontFamily: 'dogicapixelbold', fontSize: 10, color: '#111111' },
  detail: { marginTop: 2, fontSize: 10, color: '#2C3E50' },
});
