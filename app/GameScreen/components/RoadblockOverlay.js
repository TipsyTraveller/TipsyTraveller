import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HAZARD_SEGMENTS = Array.from({ length: 24 });

const HazardStrip = () => (
  <View style={styles.hazardStrip} pointerEvents="none">
    {HAZARD_SEGMENTS.map((_, index) => (
      <View
        key={`h-${index}`}
        style={[
          styles.hazardSegment,
          { backgroundColor: index % 2 === 0 ? '#E8412F' : '#FFD700' },
        ]}
      />
    ))}
  </View>
);

const RoadblockOverlay = memo(({
  canChoose,
  event,
  getNow = Date.now,
  onAction,
  teamLabel,
  visible,
}) => {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const isLandscape = width > height;
  const [secondsLeft, setSecondsLeft] = useState(null);
  const timeoutSentRef = useRef(false);
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;
  const canChooseRef = useRef(canChoose);
  canChooseRef.current = canChoose;

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

    const duration = Number(event.challenge?.durationSeconds) || 15;
    const startedAt = Number(event.challengeStartedAt) || getNow();

    const update = () => {
      const elapsed = Math.max(0, (getNow() - startedAt) / 1000);
      const remaining = Math.max(0, Math.ceil(duration - elapsed));
      setSecondsLeft(remaining);
      if (remaining === 0 && canChooseRef.current && !timeoutSentRef.current) {
        timeoutSentRef.current = true;
        onActionRef.current?.('detour');
      }
    };

    update();
    const interval = setInterval(update, 250);
    return () => clearInterval(interval);
  }, [event?.challenge?.durationSeconds, event?.challengeStartedAt, getNow, isChallenge, visible]);

  if (!visible || !event) return null;

  const leftInset = Math.max(12, (insets?.left || 0) + 8);
  const rightInset = Math.max(12, (insets?.right || 0) + 8);
  const topInset = Math.max(8, (insets?.top || 0) + 6);
  const bottomInset = Math.max(8, (insets?.bottom || 0) + 6);

  const cardLandscapeWidth = Math.min(360, Math.max(300, Math.floor((width - leftInset - rightInset) * 0.44)));
  const cardLandscapeMaxHeight = Math.max(260, height - topInset - bottomInset);

  return (
    <View
      style={[
        styles.backdrop,
        isLandscape
          ? [styles.backdropLandscape, { paddingLeft: leftInset, paddingTop: topInset, paddingBottom: bottomInset, paddingRight: rightInset }]
          : [styles.backdropPortrait, { paddingBottom: bottomInset, paddingLeft: leftInset, paddingRight: rightInset, paddingTop: topInset }],
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.card,
          isLandscape
            ? [styles.cardLandscape, { width: cardLandscapeWidth, maxHeight: cardLandscapeMaxHeight }]
            : styles.cardPortrait,
        ]}
      >
        <HazardStrip />
        <ScrollView
          style={styles.cardScroll}
          contentContainerStyle={styles.cardScrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header */}
          <View style={styles.eyebrowRow}>
            <Text style={styles.eyebrowIcon}>🚧</Text>
            <Text style={styles.eyebrowText}>
              {isChallenge ? 'ROADBLOCK CHALLENGE' : 'ROAD CLOSED'} · {teamLabel || 'LEADING TEAM'}
            </Text>
          </View>

          <View style={styles.titleRow}>
            <Text
              style={[styles.title, isChallenge && styles.challengeTitle]}
              numberOfLines={2}
            >
              {isChallenge ? (event.challenge?.title || 'HARD CHALLENGE') : 'ROAD CLOSED!'}
            </Text>
            {isChallenge && (
              <View
                style={[
                  styles.timerBadge,
                  (secondsLeft !== null && secondsLeft <= 5) && styles.timerBadgeUrgent,
                ]}
              >
                <Text
                  style={[
                    styles.timerText,
                    (secondsLeft !== null && secondsLeft <= 5) && styles.timerTextUrgent,
                  ]}
                >
                  ⏱ {secondsLeft ?? event.challenge?.durationSeconds ?? 15}s
                </Text>
              </View>
            )}
          </View>

          {isChallenge ? (
            /* Challenge Stage */
            <>
              <View style={styles.challengeBox}>
                <View style={styles.challengeBadge}>
                  <Text style={styles.challengeBadgeText}>OBJECTIVE</Text>
                </View>
                <Text style={styles.challengePrompt}>{event.challenge?.prompt}</Text>
              </View>

              <Text style={styles.challengeNote}>
                Complete before time runs out to clear the road. Your turn then ends.
                Timeout forces the detour.
              </Text>

              {canChoose ? (
                <View style={styles.challengeActionsRow}>
                  <Pressable
                    style={({ pressed }) => [styles.btn, styles.rowBtn, styles.btnSuccess, pressed && styles.btnPressed]}
                    onPress={() => onAction?.('completed')}
                    accessibilityRole="button"
                    accessibilityLabel="We did it, break through"
                  >
                    <Text style={styles.btnSuccessText}>WE DID IT!</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.btn, styles.rowBtn, styles.btnSecondary, pressed && styles.btnPressed]}
                    onPress={() => onAction?.('detour')}
                    accessibilityRole="button"
                    accessibilityLabel="Take the detour"
                  >
                    <Text style={styles.btnSecondaryText}>TAKE DETOUR</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.waitingBox}>
                  <Text style={styles.waitingText}>Waiting for team leader…</Text>
                </View>
              )}
            </>
          ) : (
            /* Choice Stage */
            <>
              <Text style={styles.choiceBody}>
                Your lead triggered a roadblock! Beat a difficult challenge to break through, or take the alternate detour route shown in gold.
              </Text>

              <View style={styles.detourBox}>
                <View style={styles.detourHeader}>
                  <Text style={styles.detourTag}>GOLD DETOUR ROUTE</Text>
                </View>
                <Text style={styles.detourRoute} numberOfLines={2}>
                  {detourNames || 'Scenic Detour'}
                </Text>
                <Text style={styles.detourHint}>
                  Your turn ends now. On later turns, each dice roll moves you 1–3
                  legs along this route; challenges open only where you land.
                </Text>
              </View>

              {canChoose ? (
                <View style={styles.choiceActions}>
                  <Pressable
                    style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.btnPressed]}
                    onPress={() => onAction?.('challenge')}
                    accessibilityRole="button"
                    accessibilityLabel="Break through with hard challenge"
                  >
                    <Text style={styles.btnPrimaryText}>BREAK THROUGH · HARD CHALLENGE</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.btn, styles.btnSecondary, pressed && styles.btnPressed]}
                    onPress={() => onAction?.('detour')}
                    accessibilityRole="button"
                    accessibilityLabel="Take the detour"
                  >
                    <Text style={styles.btnSecondaryText}>TAKE THE DETOUR</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.waitingBox}>
                  <Text style={styles.waitingText}>Waiting for team leader to choose…</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
});

RoadblockOverlay.displayName = 'RoadblockOverlay';

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  backdropLandscape: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backdropPortrait: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#FFF1CD',
    borderColor: '#15222E',
    borderWidth: 3,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#15222E',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 0,
    elevation: 10,
  },
  cardLandscape: {
    // Dynamic width and maxHeight set inline based on screen dimensions and insets
  },
  cardPortrait: {
    width: '94%',
    maxWidth: 420,
    maxHeight: '88%',
  },
  cardScroll: {
    width: '100%',
  },
  cardScrollContent: {
    paddingHorizontal: 13,
    paddingTop: 10,
    paddingBottom: 13,
  },
  hazardStrip: {
    height: 8,
    width: '100%',
    flexDirection: 'row',
    overflow: 'hidden',
    borderBottomWidth: 2,
    borderBottomColor: '#15222E',
  },
  hazardSegment: {
    width: 18,
    height: '100%',
    transform: [{ skewX: '-30deg' }],
    marginRight: 2,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  eyebrowIcon: {
    fontSize: 14,
  },
  eyebrowText: {
    flex: 1,
    color: '#E8412F',
    fontFamily: 'dogicapixelbold',
    fontSize: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    flex: 1,
    color: '#223144',
    fontFamily: 'dogicapixelbold',
    fontSize: 16,
    lineHeight: 20,
    textTransform: 'uppercase',
  },
  challengeTitle: {
    fontSize: 13,
    lineHeight: 17,
  },
  timerBadge: {
    backgroundColor: '#FAF3E0',
    borderColor: '#15222E',
    borderWidth: 2,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 7,
  },
  timerBadgeUrgent: {
    backgroundColor: '#E8412F',
    borderColor: '#9B1D1D',
  },
  timerText: {
    color: '#15222E',
    fontFamily: 'dogicapixelbold',
    fontSize: 11,
  },
  timerTextUrgent: {
    color: '#FFFFFF',
  },
  choiceBody: {
    color: '#223144',
    fontFamily: 'dogicapixel',
    fontSize: 9,
    lineHeight: 14,
    marginTop: 4,
  },
  detourBox: {
    backgroundColor: '#FFD700',
    borderColor: '#15222E',
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 9,
    marginTop: 8,
  },
  detourHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  detourTag: {
    color: '#E8412F',
    fontFamily: 'dogicapixelbold',
    fontSize: 7,
    letterSpacing: 0.5,
  },
  detourRoute: {
    color: '#15222E',
    fontFamily: 'dogicapixelbold',
    fontSize: 11,
    lineHeight: 15,
  },
  detourHint: {
    color: '#4C5661',
    fontFamily: 'dogicapixel',
    fontSize: 7,
    lineHeight: 11,
    marginTop: 3,
  },
  choiceActions: {
    flexDirection: 'column',
    gap: 7,
    marginTop: 10,
  },
  challengeBox: {
    backgroundColor: '#FFFFFF',
    borderColor: '#15222E',
    borderWidth: 2,
    borderRadius: 8,
    padding: 9,
    marginTop: 6,
  },
  challengeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1BA39C',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 5,
    marginBottom: 5,
  },
  challengeBadgeText: {
    color: '#FFFFFF',
    fontFamily: 'dogicapixelbold',
    fontSize: 7,
    letterSpacing: 0.4,
  },
  challengePrompt: {
    color: '#223144',
    fontFamily: 'dogicapixel',
    fontSize: 10,
    lineHeight: 15,
  },
  challengeNote: {
    color: '#5B6570',
    fontFamily: 'dogicapixel',
    fontSize: 7,
    lineHeight: 12,
    marginTop: 6,
  },
  challengeActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  btn: {
    borderColor: '#15222E',
    borderWidth: 2,
    borderBottomWidth: 5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    minHeight: 38,
  },
  rowBtn: {
    flex: 1,
  },
  btnPrimary: {
    backgroundColor: '#1BA39C',
    paddingVertical: 8,
  },
  btnSuccess: {
    backgroundColor: '#1BA39C',
    paddingVertical: 8,
  },
  btnSecondary: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontFamily: 'dogicapixelbold',
    fontSize: 8,
    lineHeight: 12,
    textAlign: 'center',
  },
  btnSuccessText: {
    color: '#FFFFFF',
    fontFamily: 'dogicapixelbold',
    fontSize: 9,
    lineHeight: 13,
    textAlign: 'center',
  },
  btnSecondaryText: {
    color: '#223144',
    fontFamily: 'dogicapixelbold',
    fontSize: 8,
    lineHeight: 12,
    textAlign: 'center',
  },
  btnPressed: {
    transform: [{ translateY: 2 }],
    borderBottomWidth: 3,
  },
  waitingBox: {
    backgroundColor: '#FAF3E0',
    borderColor: '#15222E',
    borderWidth: 2,
    borderRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  waitingText: {
    color: '#223144',
    fontFamily: 'dogicapixelbold',
    fontSize: 8,
    textAlign: 'center',
  },
});

export default RoadblockOverlay;
