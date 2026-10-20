import { Animated, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CityLandmark from './CityLandmark';
import { getChallengeTimer, getPenaltyTag } from '../constants/challenges';

const PERFORATION_DASHES = Array.from({ length: 14 });

const Perforation = () => (
  <View style={styles.perforation} pointerEvents="none">
    {PERFORATION_DASHES.map((_, index) => (
      <View key={`dash-${index}`} style={styles.perforationDash} />
    ))}
  </View>
);

const FlagStrip = ({ flag }) => (
  <View style={styles.flagStrip} pointerEvents="none">
    {flag.map((segment, index) => (
      <View key={`flag-${index}`} style={{ flex: segment.weight, backgroundColor: segment.color }} />
    ))}
  </View>
);

const ChallengePopup = ({ canComplete = true, challenge, teamLabel, visible, onComplete }) => {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const compact = height < 430;
  const entrance = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      entrance.setValue(0);
      pulse.setValue(0);
      shimmer.setValue(0);
      float.setValue(0);
      return;
    }

    Animated.spring(entrance, {
      toValue: 1,
      friction: 7,
      tension: 72,
      useNativeDriver: true,
    }).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );

    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1350,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
      ])
    );
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 1450,
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1450,
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();
    shimmerLoop.start();
    floatLoop.start();

    return () => {
      pulseLoop.stop();
      shimmerLoop.stop();
      floatLoop.stop();
    };
  }, [entrance, float, pulse, shimmer, visible]);

  if (!visible || !challenge) return null;

  const cardTransform = {
    opacity: entrance,
    transform: [
      {
        translateY: entrance.interpolate({
          inputRange: [0, 1],
          outputRange: [42, 0],
        }),
      },
      {
        scale: entrance.interpolate({
          inputRange: [0, 0.72, 1],
          outputRange: [0.72, 1.05, 1],
        }),
      },
      {
        rotate: entrance.interpolate({
          inputRange: [0, 1],
          outputRange: ['-4deg', '0deg'],
        }),
      },
    ],
  };
  const accentGlow = {
    opacity: pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.28, 0.72],
    }),
    transform: [
      { rotate: '-6deg' },
      {
        scaleX: pulse.interpolate({
          inputRange: [0, 1],
          outputRange: [0.72, 1],
        }),
      },
    ],
  };
  const shimmerStyle = {
    opacity: shimmer.interpolate({
      inputRange: [0, 0.18, 0.62, 1],
      outputRange: [0, 0.48, 0.48, 0],
    }),
    transform: [
      {
        translateX: shimmer.interpolate({
          inputRange: [0, 1],
          outputRange: [-260, 760],
        }),
      },
      { rotate: '-18deg' },
    ],
  };
  const floatingLayerStyle = {
    transform: [
      {
        translateY: float.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -4],
        }),
      },
      {
        rotate: float.interpolate({
          inputRange: [0, 1],
          outputRange: ['-2.4deg', '-1.2deg'],
        }),
      },
    ],
  };
  const floatingTicketStyle = {
    transform: [
      {
        translateY: float.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -3],
        }),
      },
    ],
  };
  const chipPulseStyle = {
    opacity: pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.7, 1],
    }),
  };
  const buttonPulseStyle = {
    transform: [
      {
        scale: pulse.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.03],
        }),
      },
    ],
  };
  const timer = getChallengeTimer(challenge);
  const missionCode = challenge.code
    ? `MISSION ${challenge.code}-${String(challenge.stop).padStart(2, '0')}`
    : 'MISSION';
  const landmarkWidth = compact ? 112 : 150;

  return (
    <View
      style={[
        styles.overlay,
        {
          paddingTop: Math.max(12, insets.top + 8),
          paddingBottom: Math.max(12, insets.bottom + 8),
          paddingLeft: Math.max(14, insets.left + 8),
          paddingRight: Math.max(14, insets.right + 8),
        },
      ]}
      pointerEvents="auto"
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.accentBeam, accentGlow, { backgroundColor: challenge.accent }]}
      />
      <Animated.View style={[styles.cardShadow, compact && styles.cardShadowCompact, cardTransform]}>
        <Animated.View
          pointerEvents="none"
          style={[styles.ticketLayer, floatingLayerStyle, { backgroundColor: challenge.accent }]}
        />
        <View pointerEvents="none" style={[styles.ticketLayer, styles.ticketLayerRight]} />
        <Animated.View style={[styles.ticket, floatingTicketStyle]}>
          <Animated.View pointerEvents="none" style={[styles.ticketShimmer, shimmerStyle]} />
          <ScrollView
            style={{ maxHeight: Math.max(210, height - insets.top - insets.bottom - 40) }}
            contentContainerStyle={styles.scrollContent}
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.stub, compact && styles.stubCompact]}>
              {challenge.flag ? <FlagStrip flag={challenge.flag} /> : null}
              <Perforation />
              <Text style={styles.stubLabel}>Country Challenge</Text>
              {challenge.landmark ? (
                <View style={styles.landmark}>
                  <CityLandmark name={challenge.landmark} width={landmarkWidth} />
                </View>
              ) : null}
              <Text
                adjustsFontSizeToFit
                numberOfLines={1}
                style={[styles.country, compact && styles.countryCompact]}
              >
                {challenge.country}
              </Text>
              {challenge.city ? <Text style={styles.city}>{challenge.city}</Text> : null}
              <View style={styles.stubSpacer} />
              <View style={styles.teamBadge}>
                <Text style={styles.teamBadgeText}>{teamLabel}</Text>
              </View>
              <Animated.View style={[styles.buttonWrap, buttonPulseStyle]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={canComplete
                    ? 'Complete challenge and start next turn'
                    : `Waiting for ${teamLabel} to complete the challenge`}
                  disabled={!canComplete}
                  onPress={onComplete}
                  style={({ pressed }) => [
                    styles.completeButton,
                    !canComplete && styles.completeButtonDisabled,
                    pressed && styles.completeButtonPressed,
                  ]}
                >
                  <Text style={styles.completeButtonText}>{canComplete ? 'Next Turn' : 'Watching'}</Text>
                  {canComplete ? null : (
                    <Text style={styles.completeButtonSubText}>{`Waiting for ${teamLabel}`}</Text>
                  )}
                </Pressable>
              </Animated.View>
            </View>

            <View style={[styles.body, compact && styles.bodyCompact]}>
              <View style={styles.bodyHeader}>
                <Text style={styles.missionCode}>{missionCode}</Text>
                {timer ? (
                  <Animated.View style={[styles.timerChip, chipPulseStyle]}>
                    <Text style={styles.timerChipText}>{timer}</Text>
                  </Animated.View>
                ) : null}
              </View>
              <Text style={[styles.title, compact && styles.titleCompact]}>{challenge.title}</Text>
              <Text style={[styles.prompt, compact && styles.promptCompact]}>{challenge.prompt}</Text>
              <View style={styles.bodySpacer} />
              <View style={styles.penaltyBox}>
                <View style={styles.penaltyTag}>
                  <Text style={styles.penaltyTagText}>{getPenaltyTag(challenge)}</Text>
                </View>
                <Text style={styles.penaltyText}>{challenge.penalty}</Text>
              </View>
            </View>

          </ScrollView>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 12, 18, 0.68)',
  },
  cardShadow: {
    width: '90%',
    maxWidth: 720,
  },
  cardShadowCompact: {
    width: '94%',
  },
  accentBeam: {
    position: 'absolute',
    width: '84%',
    height: 14,
    top: '20%',
    borderRadius: 2,
  },
  ticketLayer: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 10,
    bottom: -10,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#111111',
  },
  ticketLayerRight: {
    backgroundColor: '#FFF1CD',
    transform: [{ rotate: '1.6deg' }],
  },
  ticketShimmer: {
    position: 'absolute',
    zIndex: 2,
    top: -90,
    bottom: -90,
    width: 58,
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
  },
  ticket: {
    borderRadius: 12,
    borderWidth: 4,
    borderColor: '#111111',
    backgroundColor: '#FAF3E0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.42,
    shadowRadius: 18,
    elevation: 12,
  },
  scrollContent: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  stub: {
    width: 210,
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 26,
    paddingRight: 14,
    alignItems: 'center',
    backgroundColor: '#2C3E50',
  },
  stubCompact: {
    width: 168,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 22,
    paddingRight: 10,
  },
  flagStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 9,
    borderRightWidth: 3,
    borderRightColor: '#111111',
  },
  stubLabel: {
    color: '#FFF1CD',
    fontFamily: 'dogicapixel',
    fontSize: 8,
    textTransform: 'uppercase',
  },
  landmark: {
    marginTop: 8,
  },
  country: {
    marginTop: 6,
    color: '#FFF1CD',
    fontFamily: 'dogicapixelbold',
    fontSize: 20,
    textTransform: 'uppercase',
  },
  countryCompact: {
    fontSize: 16,
  },
  city: {
    marginTop: 4,
    color: '#9FB3C8',
    fontFamily: 'dogicapixel',
    fontSize: 9,
    textTransform: 'uppercase',
  },
  stubSpacer: {
    flex: 1,
    minHeight: 8,
  },
  teamBadge: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    backgroundColor: '#FFF1CD',
    borderRadius: 999,
    borderWidth: 3,
    borderColor: '#111111',
  },
  teamBadgeText: {
    color: '#111111',
    fontFamily: 'dogicapixelbold',
    fontSize: 9,
    textTransform: 'uppercase',
  },
  buttonWrap: {
    alignSelf: 'stretch',
    marginTop: 10,
  },
  completeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    backgroundColor: '#1BA39C',
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#111111',
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  completeButtonPressed: {
    transform: [{ translateY: 2 }],
    opacity: 0.88,
  },
  completeButtonDisabled: {
    opacity: 0.55,
  },
  completeButtonText: {
    color: '#111111',
    fontFamily: 'dogicapixelbold',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  completeButtonSubText: {
    marginTop: 3,
    color: '#111111',
    fontFamily: 'dogicapixel',
    fontSize: 7,
    textTransform: 'uppercase',
  },
  body: {
    flex: 1,
    paddingVertical: 18,
    paddingLeft: 24,
    paddingRight: 20,
  },
  bodyCompact: {
    paddingVertical: 12,
    paddingLeft: 18,
    paddingRight: 14,
  },
  bodyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  missionCode: {
    color: '#4A5A6B',
    fontFamily: 'dogicapixelbold',
    fontSize: 8,
    textTransform: 'uppercase',
  },
  timerChip: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: '#FFF1CD',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#111111',
  },
  timerChipText: {
    color: '#111111',
    fontFamily: 'dogicapixelbold',
    fontSize: 9,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 12,
    color: '#2C3E50',
    fontFamily: 'dogicapixelbold',
    fontSize: 20,
    lineHeight: 27,
    textTransform: 'uppercase',
  },
  titleCompact: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 21,
  },
  prompt: {
    marginTop: 10,
    color: '#111111',
    fontFamily: 'dogicapixel',
    fontSize: 13,
    lineHeight: 21,
  },
  promptCompact: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 17,
  },
  bodySpacer: {
    flex: 1,
    minHeight: 12,
  },
  penaltyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFF1CD',
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#111111',
  },
  penaltyTag: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#B3261E',
    borderRadius: 6,
    borderWidth: 3,
    borderColor: '#111111',
  },
  penaltyTagText: {
    color: '#FFFFFF',
    fontFamily: 'dogicapixelbold',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  penaltyText: {
    flex: 1,
    color: '#111111',
    fontFamily: 'dogicapixel',
    fontSize: 11,
    lineHeight: 18,
  },
  perforation: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 4,
    justifyContent: 'space-around',
  },
  perforationDash: {
    width: 4,
    height: 8,
    backgroundColor: '#111111',
  },
});

export default ChallengePopup;
