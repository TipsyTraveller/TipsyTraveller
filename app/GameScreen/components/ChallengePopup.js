import { Animated, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PERFORATION_DOTS = Array.from({ length: 12 });
const PIXEL_SPARKS = Array.from({ length: 9 });

const getCountryCode = (country) => country.slice(0, 3).toUpperCase();

const Perforation = ({ accent }) => (
  <View style={styles.perforation} pointerEvents="none">
    {PERFORATION_DOTS.map((_, index) => (
      <View
        key={`dot-${index}`}
        style={[
          styles.perforationDot,
          index % 2 === 0 && { backgroundColor: accent },
        ]}
      />
    ))}
  </View>
);

const PixelSparks = ({ accent }) => (
  <View style={styles.pixelSparks} pointerEvents="none">
    {PIXEL_SPARKS.map((_, index) => (
      <View
        key={`spark-${index}`}
        style={[
          styles.pixelSpark,
          {
            backgroundColor: index % 3 === 0 ? accent : '#FFF1CD',
            left: `${8 + index * 10}%`,
            top: index % 2 === 0 ? 0 : 16,
          },
        ]}
      />
    ))}
  </View>
);

const ChallengePopup = ({ challenge, teamLabel, visible, onComplete }) => {
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

    pulseLoop.start();
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
  const pulseStyle = {
    opacity: pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.55, 1],
    }),
    transform: [
      {
        scale: pulse.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.04],
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
      {
        rotate: '-6deg',
      },
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
          outputRange: [-260, 360],
        }),
      },
      {
        rotate: '-18deg',
      },
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
  const routeDotStyle = {
    transform: [
      {
        scale: pulse.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.34],
        }),
      },
    ],
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
  const countryPanelStyle = {
    transform: [
      {
        rotate: pulse.interpolate({
          inputRange: [0, 1],
          outputRange: ['-1deg', '1deg'],
        }),
      },
    ],
  };
  const countryCode = getCountryCode(challenge.country);

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
      <View style={styles.backdropGrid} pointerEvents="none" />
      <Animated.View style={[styles.accentBeam, accentGlow, { backgroundColor: challenge.accent }]} />

      <Animated.View
        style={[
          styles.cardShadow,
          compact && styles.cardShadowCompact,
          cardTransform,
          { borderColor: challenge.accent },
        ]}
      >
        <Animated.View
          style={[
            styles.ticketLayer,
            styles.ticketLayerLeft,
            floatingLayerStyle,
            { backgroundColor: challenge.accent },
          ]}
        />
        <View style={[styles.ticketLayer, styles.ticketLayerRight]} />
        <Animated.View style={[styles.ticket, floatingTicketStyle]}>
          <Animated.View pointerEvents="none" style={[styles.ticketShimmer, shimmerStyle]} />
          <View style={[styles.topStripe, { backgroundColor: challenge.accent }]}>
            <PixelSparks accent={challenge.accent} />
          </View>

          <ScrollView
            style={[styles.cardScroll, { maxHeight: Math.max(210, height - insets.top - insets.bottom - 78) }]}
            contentContainerStyle={[styles.card, compact && styles.cardCompact]}
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <View style={[styles.stamp, { borderColor: challenge.accent }]}>
                  <Text style={[styles.stampText, { color: challenge.accent }]}>
                    {challenge.country}
                  </Text>
                </View>
                <Text style={styles.ticketCode}>MISSION / {countryCode}-01</Text>
              </View>

              <View style={styles.teamBadge}>
                <Text style={styles.teamBadgeText}>{teamLabel}</Text>
              </View>
            </View>

            <View style={styles.routeRail}>
              <View style={[styles.routeDot, { backgroundColor: challenge.accent }]} />
              <View style={styles.routeDash} />
              <Animated.View style={[styles.routeDot, routeDotStyle, { backgroundColor: challenge.accent }]} />
              <View style={styles.routeDash} />
              <View style={[styles.routeDot, { backgroundColor: challenge.accent }]} />
            </View>

            <View style={[styles.mainContent, compact && styles.mainContentCompact]}>
              <Animated.View style={[styles.countryPanel, compact && styles.countryPanelCompact, countryPanelStyle, { borderColor: challenge.accent }]}>
                <Text style={[styles.countryCode, { color: challenge.accent }]}>
                  {countryCode}
                </Text>
                <Text style={styles.countryPanelText}>LANDED</Text>
              </Animated.View>

              <View style={styles.challengeContent}>
                <Animated.View style={[styles.challengeBadge, pulseStyle, { backgroundColor: challenge.accent }]}>
                  <Text style={styles.challengeBadgeText}>Country Challenge</Text>
                </Animated.View>

                <Text style={[styles.title, compact && styles.titleCompact]}>{challenge.title}</Text>
                <Text style={[styles.prompt, compact && styles.promptCompact]}>{challenge.prompt}</Text>
              </View>
            </View>

            <View style={[styles.footerRow, compact && styles.footerRowCompact]}>
              <View style={styles.penaltyBox}>
                <Text style={styles.penaltyLabel}>If you fail</Text>
                <Text style={styles.penaltyText}>{challenge.penalty}</Text>
              </View>

              <Animated.View style={buttonPulseStyle}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Complete challenge and start next turn"
                  onPress={onComplete}
                  style={({ pressed }) => [
                    styles.completeButton,
                    { shadowColor: challenge.accent },
                    pressed && styles.completeButtonPressed,
                  ]}
                >
                  <Text style={styles.completeButtonText}>Done</Text>
                  <Text style={styles.completeButtonSubText}>Next Turn</Text>
                </Pressable>
              </Animated.View>
            </View>
          </ScrollView>
          <View style={[styles.bottomStripe, { backgroundColor: challenge.accent }]} />
          <Perforation accent={challenge.accent} />
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
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  backdropGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.18,
    backgroundColor: '#223144',
    borderWidth: 12,
    borderColor: 'rgba(255, 241, 205, 0.2)',
  },
  accentBeam: {
    position: 'absolute',
    width: '84%',
    height: 14,
    top: '20%',
    borderRadius: 2,
  },
  cardShadow: {
    width: '90%',
    maxWidth: 680,
    borderRadius: 8,
    borderWidth: 0,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.42,
    shadowRadius: 18,
    elevation: 12,
  },
  cardShadowCompact: {
    width: '96%',
  },
  ticketLayer: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 10,
    bottom: -10,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#111111',
  },
  ticketLayerLeft: {
    transform: [{ rotate: '-2.4deg' }],
  },
  ticketLayerRight: {
    backgroundColor: '#FFF1CD',
    transform: [{ rotate: '1.6deg' }],
  },
  ticket: {
    borderRadius: 8,
    borderWidth: 4,
    borderColor: '#111111',
    backgroundColor: '#2C3E50',
    overflow: 'hidden',
  },
  ticketShimmer: {
    position: 'absolute',
    zIndex: 2,
    top: -90,
    bottom: -90,
    width: 58,
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
  },
  topStripe: {
    height: 20,
    borderBottomWidth: 3,
    borderBottomColor: '#111111',
  },
  bottomStripe: {
    height: 10,
    borderTopWidth: 3,
    borderTopColor: '#111111',
  },
  card: {
    padding: 16,
    backgroundColor: '#FAF3E0',
  },
  cardScroll: {
    backgroundColor: '#FAF3E0',
  },
  cardCompact: {
    padding: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  stamp: {
    minWidth: 128,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderWidth: 3,
    borderRadius: 6,
    backgroundColor: '#FFF1CD',
    transform: [{ rotate: '-2deg' }],
  },
  stampText: {
    fontFamily: 'dogicapixelbold',
    fontSize: 14,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  ticketCode: {
    color: '#2C3E50',
    fontFamily: 'dogicapixelbold',
    fontSize: 9,
    textTransform: 'uppercase',
  },
  teamBadge: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: '#2C3E50',
    borderRadius: 6,
  },
  teamBadgeText: {
    color: '#FFF1CD',
    fontFamily: 'dogicapixel',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  routeRail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 10,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: 2,
    borderColor: '#111111',
  },
  routeDash: {
    flex: 1,
    height: 3,
    marginHorizontal: 5,
    backgroundColor: '#2C3E50',
  },
  mainContent: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'stretch',
  },
  mainContentCompact: {
    gap: 10,
  },
  countryPanel: {
    width: 134,
    minHeight: 122,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1CD',
    borderRadius: 8,
    borderWidth: 4,
  },
  countryPanelCompact: {
    width: 104,
    minHeight: 96,
  },
  countryCode: {
    fontFamily: 'dogicapixelbold',
    fontSize: 28,
    lineHeight: 34,
    textTransform: 'uppercase',
  },
  countryPanelText: {
    marginTop: 8,
    color: '#2C3E50',
    fontFamily: 'dogicapixelbold',
    fontSize: 9,
    letterSpacing: 0,
  },
  challengeContent: {
    flex: 1,
    justifyContent: 'center',
  },
  challengeBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#111111',
  },
  challengeBadgeText: {
    color: '#111111',
    fontFamily: 'dogicapixelbold',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 10,
    color: '#111111',
    fontFamily: 'dogicapixelbold',
    fontSize: 22,
    lineHeight: 29,
    textTransform: 'uppercase',
  },
  titleCompact: {
    marginTop: 7,
    fontSize: 17,
    lineHeight: 22,
  },
  prompt: {
    marginTop: 7,
    color: '#111111',
    fontFamily: 'dogicapixel',
    fontSize: 14,
    lineHeight: 22,
  },
  promptCompact: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    marginTop: 14,
  },
  footerRowCompact: {
    marginTop: 10,
  },
  penaltyBox: {
    flex: 1,
    padding: 12,
    backgroundColor: '#FFF1CD',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#111111',
  },
  penaltyLabel: {
    color: '#2C3E50',
    fontFamily: 'dogicapixelbold',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  penaltyText: {
    marginTop: 6,
    color: '#111111',
    fontFamily: 'dogicapixel',
    fontSize: 12,
    lineHeight: 20,
  },
  completeButton: {
    width: 152,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1BA39C',
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#111111',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 0,
  },
  completeButtonPressed: {
    transform: [{ translateY: 2 }],
    opacity: 0.88,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontFamily: 'dogicapixelbold',
    fontSize: 16,
    textTransform: 'uppercase',
  },
  completeButtonSubText: {
    marginTop: 4,
    color: '#FFF1CD',
    fontFamily: 'dogicapixel',
    fontSize: 9,
    textTransform: 'uppercase',
  },
  perforation: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 12,
    justifyContent: 'space-around',
  },
  perforationDot: {
    width: 7,
    height: 7,
    borderRadius: 2,
    backgroundColor: '#2C3E50',
    borderWidth: 1,
    borderColor: '#111111',
  },
  pixelSparks: {
    ...StyleSheet.absoluteFillObject,
  },
  pixelSpark: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderWidth: 1,
    borderColor: '#111111',
  },
});

export default ChallengePopup;
