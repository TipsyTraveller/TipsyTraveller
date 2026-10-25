import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

const RoadblockOverlay = memo(({
  canChoose,
  event,
  getNow = Date.now,
  onAction,
  teamLabel,
  visible,
}) => {
  const { height, width } = useWindowDimensions();
  const isPhoneLandscape = height < 600 && width > height;
  const [secondsLeft, setSecondsLeft] = useState(null);
  const timeoutSentRef = useRef(false);
  const isChallenge = event?.status === 'challenge';
  const detourNames = useMemo(
    () => (event?.detourStops || []).map((stop) => stop.name).join(' → '),
    [event?.detourStops]
  );

  useEffect(() => {
    if (!visible || !isChallenge || !event?.challengeStartedAt) {
      setSecondsLeft(null);
      timeoutSentRef.current = false;
      return undefined;
    }

    const update = () => {
      const duration = Number(event.challenge?.durationSeconds) || 15;
      const remaining = Math.max(0, Math.ceil(duration - (getNow() - event.challengeStartedAt) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && canChoose && !timeoutSentRef.current) {
        timeoutSentRef.current = true;
        onAction?.('detour');
      }
    };
    update();
    const interval = setInterval(update, 250);
    return () => clearInterval(interval);
  }, [canChoose, event?.challenge?.durationSeconds, event?.challengeStartedAt, getNow, isChallenge, onAction, visible]);

  if (!visible || !event) return null;

  return (
    <View style={[styles.backdrop, isPhoneLandscape && styles.backdropLandscape]} pointerEvents="box-none">
      <View style={[styles.card, isPhoneLandscape && styles.cardLandscape]}>
        <View style={styles.warningStrip} />
        <View style={styles.headerRow}>
          <Text style={styles.icon}>🚧</Text>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>RANDOM EVENT · {teamLabel || 'LEADING TEAM'}</Text>
            <Text style={styles.title}>{isChallenge ? event.challenge?.title : 'ROAD CLOSED!'}</Text>
          </View>
          {isChallenge && <Text style={styles.timer}>{secondsLeft ?? event.challenge?.durationSeconds}s</Text>}
        </View>

        {isChallenge ? (
          <>
            <Text style={styles.body}>{event.challenge?.prompt}</Text>
            <Text style={styles.note}>Complete it before time runs out to break through. A miss sends the team onto the detour.</Text>
            {canChoose ? (
              <View style={[styles.actions, isPhoneLandscape && styles.actionsLandscape]}>
                <Pressable style={({ pressed }) => [styles.button, styles.primary, pressed && styles.pressed]} onPress={() => onAction?.('completed')}>
                  <Text style={styles.primaryText}>WE DID IT · BREAK THROUGH</Text>
                </Pressable>
                <Pressable style={({ pressed }) => [styles.button, styles.secondary, pressed && styles.pressed]} onPress={() => onAction?.('detour')}>
                  <Text style={styles.secondaryText}>TAKE THE DETOUR</Text>
                </Pressable>
              </View>
            ) : <Text style={styles.waiting}>Waiting for the team leader…</Text>}
          </>
        ) : (
          <>
            <Text style={styles.body}>Your lead triggered a roadblock. Beat a difficult challenge to stay on the main road, or take the longer route shown in gold.</Text>
            <View style={styles.detourPanel}>
              <Text style={styles.detourLabel}>DETOUR PREVIEW</Text>
              <Text style={styles.detourRoute}>{detourNames || 'Scenic route'}</Text>
              <Text style={styles.detourHint}>These countries were hidden from the original itinerary.</Text>
            </View>
            {canChoose ? (
              <View style={[styles.actions, isPhoneLandscape && styles.actionsLandscape]}>
                <Pressable style={({ pressed }) => [styles.button, styles.primary, pressed && styles.pressed]} onPress={() => onAction?.('challenge')}>
                  <Text style={styles.primaryText}>BREAK THROUGH · HARD CHALLENGE</Text>
                </Pressable>
                <Pressable style={({ pressed }) => [styles.button, styles.secondary, pressed && styles.pressed]} onPress={() => onAction?.('detour')}>
                  <Text style={styles.secondaryText}>TAKE DETOUR · {detourNames || 'SCENIC ROUTE'}</Text>
                </Pressable>
              </View>
            ) : <Text style={styles.waiting}>Waiting for the team leader to choose…</Text>}
          </>
        )}
      </View>
    </View>
  );
});

RoadblockOverlay.displayName = 'RoadblockOverlay';

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    alignItems: 'center', justifyContent: 'center', padding: 18,
  },
  backdropLandscape: { alignItems: 'flex-start', paddingLeft: 14, paddingRight: 14 },
  card: {
    width: '72%', maxWidth: 720, minWidth: 520,
    backgroundColor: '#FFF1CD', borderColor: '#15222E', borderWidth: 4,
    padding: 18, paddingTop: 22,
    shadowColor: '#15222E', shadowOffset: { width: 8, height: 8 }, shadowOpacity: 0.55, shadowRadius: 0,
    elevation: 12,
  },
  cardLandscape: { width: '47%', minWidth: 0, maxWidth: 430, padding: 13, paddingTop: 18 },
  warningStrip: { position: 'absolute', top: 0, left: 0, right: 0, height: 10, backgroundColor: '#E8412F' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerCopy: { flex: 1 },
  icon: { fontSize: 34 },
  eyebrow: { color: '#E8412F', fontFamily: 'dogicapixelbold', fontSize: 9, marginBottom: 4 },
  title: { color: '#223144', fontFamily: 'dogicapixelbold', fontSize: 22 },
  timer: { color: '#FFF1CD', backgroundColor: '#E8412F', fontFamily: 'dogicapixelbold', fontSize: 18, paddingHorizontal: 12, paddingVertical: 9 },
  body: { color: '#223144', fontFamily: 'dogicapixel', fontSize: 12, lineHeight: 20, marginTop: 14 },
  note: { color: '#5B6570', fontFamily: 'dogicapixel', fontSize: 9, lineHeight: 15, marginTop: 8 },
  detourPanel: { backgroundColor: '#FFD700', borderColor: '#223144', borderWidth: 3, marginTop: 14, padding: 11 },
  detourLabel: { color: '#E8412F', fontFamily: 'dogicapixelbold', fontSize: 8, marginBottom: 5 },
  detourRoute: { color: '#223144', fontFamily: 'dogicapixelbold', fontSize: 12, lineHeight: 18 },
  detourHint: { color: '#4C5661', fontFamily: 'dogicapixel', fontSize: 8, marginTop: 5 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  actionsLandscape: { flexDirection: 'column', gap: 7, marginTop: 10 },
  button: { flex: 1, borderColor: '#15222E', borderWidth: 3, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, borderBottomWidth: 7 },
  primary: { backgroundColor: '#1BA39C' },
  secondary: { backgroundColor: '#FFFFFF' },
  primaryText: { color: '#FFFFFF', fontFamily: 'dogicapixelbold', fontSize: 9, textAlign: 'center', lineHeight: 14 },
  secondaryText: { color: '#223144', fontFamily: 'dogicapixelbold', fontSize: 8, textAlign: 'center', lineHeight: 13 },
  pressed: { transform: [{ translateY: 3 }], borderBottomWidth: 4 },
  waiting: { color: '#223144', fontFamily: 'dogicapixelbold', fontSize: 10, textAlign: 'center', marginTop: 16 },
});

export default RoadblockOverlay;
