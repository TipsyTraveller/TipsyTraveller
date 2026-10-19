import {
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as THREE from 'three';
import { DONE_LOOK, DONE_POS } from '../constants/camera';
import { getCountryFlag } from '../constants/challenges';
import { ROUTE } from '../constants/route';

const CARD_BACK_LOGO = require('../../../assets/icons/splash-icon-light.png');
const EASY_EASE = Easing.bezier(0.42, 0, 0.58, 1);

const projectionCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
const projectedPoint = new THREE.Vector3();

const getMarkerScreenOffset = (stopIndex, width, height) => {
  const stopPosition = ROUTE[stopIndex] || ROUTE[1] || ROUTE[0];
  if (!stopPosition || !width || !height) {
    return { x: 0, y: 0 };
  }

  projectionCamera.aspect = width / height;
  projectionCamera.position.copy(DONE_POS);
  projectionCamera.lookAt(DONE_LOOK);
  projectionCamera.updateProjectionMatrix();
  projectionCamera.updateMatrixWorld(true);

  projectedPoint.copy(stopPosition).project(projectionCamera);

  return {
    x: projectedPoint.x * (width * 0.5),
    y: -projectedPoint.y * (height * 0.5),
  };
};

const FlagSurface = ({ country, emblemSize = 10, style }) => {
  const flag = getCountryFlag(country);
  const isHorizontal = flag.layout === 'horizontal';
  const halfEmblem = emblemSize / 2;

  return (
    <View
      style={[
        style,
        isHorizontal ? styles.flagHorizontal : styles.flagVertical,
      ]}
    >
      {flag.stripes.map((color, index) => (
        <View
          key={`${country}-stripe-${index}`}
          style={{
            flex: flag.stripeWeights?.[index] ?? 1,
            backgroundColor: color,
          }}
        />
      ))}
      {flag.layout === 'portugal' && (
        <View
          style={[
            styles.portugalEmblem,
            {
              width: emblemSize,
              height: emblemSize,
              borderRadius: halfEmblem,
              backgroundColor: flag.emblemColor,
              transform: [
                { translateX: -halfEmblem },
                { translateY: -halfEmblem },
              ],
            },
          ]}
        />
      )}
    </View>
  );
};

const CountryFlag = ({ country, compact }) => (
  <FlagSurface
    country={country}
    emblemSize={compact ? 9 : 11}
    style={[styles.flagBadge, compact && styles.flagBadgeCompact]}
  />
);

const FlagBanner = ({ country }) => {
  const flag = getCountryFlag(country);

  return (
    <View style={styles.flagBanner} pointerEvents="none">
      {flag.banner.map((color, index) => (
        <View
          key={`${country}-banner-${index}`}
          style={[styles.flagBannerSegment, { backgroundColor: color }]}
        />
      ))}
    </View>
  );
};

const CardBack = ({ compact, style }) => (
  <Animated.View
    pointerEvents="none"
    style={[
      styles.cardContainer,
      styles.cardBackOverlay,
      compact && styles.cardContainerCompact,
      style,
    ]}
  >
    <View style={[styles.cardBackFrame, compact && styles.cardBackFrameCompact]}>
      <View style={styles.cardBackInner}>
        <View style={[styles.cornerDot, styles.cornerTopLeft]} />
        <View style={[styles.cornerDot, styles.cornerTopRight]} />
        <View style={[styles.cornerDot, styles.cornerBottomLeft]} />
        <View style={[styles.cornerDot, styles.cornerBottomRight]} />

        <View style={[styles.logoHalo, compact && styles.logoHaloCompact]}>
          <Image
            source={CARD_BACK_LOGO}
            style={[styles.cardBackLogo, compact && styles.cardBackLogoCompact]}
            resizeMode="contain"
          />
        </View>

        <Text style={[styles.cardBackBrand, compact && styles.cardBackBrandCompact]}>
          TIPSY TRAVELLER
        </Text>
        <View style={styles.cardBackTag}>
          <Text style={styles.cardBackTagText}>COUNTRY CHALLENGE</Text>
        </View>
      </View>
    </View>
  </Animated.View>
);

const ChallengePopup = ({ canComplete = true, challenge, teamLabel, visible, onComplete }) => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const compact = height < 430;
  const fly = useRef(new Animated.Value(0)).current;
  const flip = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible || !challenge) {
      fly.setValue(0);
      flip.setValue(0);
      return;
    }

    fly.setValue(0);
    flip.setValue(0);

    const sequence = Animated.sequence([
      Animated.timing(fly, {
        toValue: 1,
        duration: 860,
        easing: EASY_EASE,
        useNativeDriver: true,
      }),
      Animated.delay(120),
      Animated.timing(flip, {
        toValue: 1,
        duration: 780,
        easing: EASY_EASE,
        useNativeDriver: true,
      }),
    ]);

    sequence.start();

    return () => {
      sequence.stop();
    };
  }, [challenge, flip, fly, visible]);

  if (!visible || !challenge) return null;

  const accentColor = challenge.accent || '#1BA39C';
  const markerOffset = getMarkerScreenOffset(challenge.stopIndex, width, height);
  const launchTiltDeg = markerOffset.x >= 0 ? '16deg' : '-16deg';
  const midArcY = markerOffset.y * 0.35 - 48;

  const backdropAnimatedStyle = {
    opacity: fly.interpolate({
      inputRange: [0, 0.7, 1],
      outputRange: [0, 0.85, 1],
    }),
  };

  const flyWrapperStyle = {
    opacity: fly.interpolate({
      inputRange: [0, 0.15, 1],
      outputRange: [0, 1, 1],
    }),
    transform: [
      { perspective: 1200 },
      {
        translateX: fly.interpolate({
          inputRange: [0, 0.75, 1],
          outputRange: [markerOffset.x, markerOffset.x * 0.06, 0],
        }),
      },
      {
        translateY: fly.interpolate({
          inputRange: [0, 0.55, 1],
          outputRange: [markerOffset.y, midArcY, 0],
        }),
      },
      {
        scale: fly.interpolate({
          inputRange: [0, 0.65, 1],
          outputRange: [0.06, 0.82, 1],
        }),
      },
      {
        rotateX: fly.interpolate({
          inputRange: [0, 0.6, 1],
          outputRange: ['26deg', '-4deg', '0deg'],
        }),
      },
      {
        rotateZ: fly.interpolate({
          inputRange: [0, 0.65, 1],
          outputRange: [launchTiltDeg, '0deg', '0deg'],
        }),
      },
    ],
  };

  const backFaceAnimatedStyle = {
    opacity: flip.interpolate({
      inputRange: [0, 0.499, 0.5, 1],
      outputRange: [1, 1, 0, 0],
    }),
    transform: [
      { perspective: 1300 },
      {
        scale: flip.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [1, 1.07, 1],
        }),
      },
      {
        rotateY: flip.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '180deg'],
        }),
      },
    ],
  };

  const frontFaceAnimatedStyle = {
    opacity: flip.interpolate({
      inputRange: [0, 0.499, 0.5, 1],
      outputRange: [0, 0, 1, 1],
    }),
    transform: [
      { perspective: 1300 },
      {
        scale: flip.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [1, 1.07, 1],
        }),
      },
      {
        rotateY: flip.interpolate({
          inputRange: [0, 1],
          outputRange: ['-180deg', '0deg'],
        }),
      },
    ],
  };

  return (
    <View
      style={[
        styles.overlay,
        {
          paddingTop: Math.max(12, insets.top + 8),
          paddingBottom: Math.max(12, insets.bottom + 8),
          paddingLeft: Math.max(16, insets.left + 12),
          paddingRight: Math.max(16, insets.right + 12),
        },
      ]}
      pointerEvents="auto"
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.backdropDim, backdropAnimatedStyle]}
      />

      <Animated.View
        style={[
          styles.flipStage,
          compact && styles.flipStageCompact,
          flyWrapperStyle,
        ]}
      >
        <Animated.View
          style={[
            styles.cardContainer,
            compact && styles.cardContainerCompact,
            frontFaceAnimatedStyle,
          ]}
        >
          <FlagBanner country={challenge.country} />

          <ScrollView
            style={{ maxHeight: Math.max(220, height - insets.top - insets.bottom - 44) }}
            contentContainerStyle={[styles.cardContent, compact && styles.cardContentCompact]}
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <CountryFlag country={challenge.country} compact={compact} />
                <View style={styles.countryTextGroup}>
                  <Text style={styles.subtitle}>COUNTRY CHALLENGE</Text>
                  <Text style={[styles.countryTitle, compact && styles.countryTitleCompact]}>
                    {challenge.country}
                  </Text>
                </View>
              </View>

              {Boolean(teamLabel) && (
                <View style={styles.teamPill}>
                  <Text style={styles.teamPillText}>{teamLabel}</Text>
                </View>
              )}
            </View>

            <View
              style={[
                styles.challengeBox,
                compact && styles.challengeBoxCompact,
                { borderLeftColor: accentColor },
              ]}
            >
              <Text style={[styles.challengeTitle, compact && styles.challengeTitleCompact]}>
                {challenge.title}
              </Text>
              <Text style={[styles.prompt, compact && styles.promptCompact]}>
                {challenge.prompt}
              </Text>
            </View>

            <View style={[styles.footerRow, compact && styles.footerRowCompact]}>
              <View style={styles.penaltyBox}>
                <View style={styles.penaltyHeader}>
                  <View style={styles.penaltyBadge}>
                    <Text style={styles.penaltyBadgeText}>IF YOU FAIL</Text>
                  </View>
                </View>
                <Text style={styles.penaltyText}>{challenge.penalty}</Text>
              </View>

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
                  pressed && canComplete && styles.completeButtonPressed,
                ]}
              >
                <Text style={styles.completeButtonText}>
                  {canComplete ? 'NEXT TURN' : 'WATCHING'}
                </Text>
                {!canComplete && Boolean(teamLabel) && (
                  <Text style={styles.completeButtonSubText}>
                    {`Waiting for ${teamLabel}`}
                  </Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </Animated.View>

        <CardBack
          compact={compact}
          style={backFaceAnimatedStyle}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdropDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(34, 49, 68, 0.52)',
  },
  flipStage: {
    width: '86%',
    maxWidth: 560,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipStageCompact: {
    width: '92%',
  },
  cardContainer: {
    width: '100%',
    borderRadius: 18,
    backgroundColor: '#FAF3E0',
    borderWidth: 3,
    borderColor: '#2C3E50',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
  },
  cardContainerCompact: {
    borderRadius: 16,
  },
  cardBackOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  cardBackFrame: {
    flex: 1,
    padding: 12,
    backgroundColor: '#FAF3E0',
  },
  cardBackFrameCompact: {
    padding: 9,
  },
  cardBackInner: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2C3E50',
    backgroundColor: '#FFF1CD',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  cornerDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1BA39C',
    borderWidth: 1.5,
    borderColor: '#2C3E50',
  },
  cornerTopLeft: {
    top: 10,
    left: 10,
  },
  cornerTopRight: {
    top: 10,
    right: 10,
  },
  cornerBottomLeft: {
    bottom: 10,
    left: 10,
  },
  cornerBottomRight: {
    bottom: 10,
    right: 10,
  },
  logoHalo: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#FAF3E0',
    borderWidth: 2,
    borderColor: '#2C3E50',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 4,
  },
  logoHaloCompact: {
    width: 98,
    height: 98,
    borderRadius: 49,
  },
  cardBackLogo: {
    width: 112,
    height: 112,
  },
  cardBackLogoCompact: {
    width: 86,
    height: 86,
  },
  cardBackBrand: {
    marginTop: 10,
    color: '#2C3E50',
    fontFamily: 'dogicapixelbold',
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
  },
  cardBackBrandCompact: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 17,
  },
  cardBackTag: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#1BA39C',
    borderWidth: 1.5,
    borderColor: '#2C3E50',
  },
  cardBackTagText: {
    color: '#FFFFFF',
    fontFamily: 'dogicapixelbold',
    fontSize: 8,
    textTransform: 'uppercase',
  },
  flagBanner: {
    height: 8,
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#2C3E50',
  },
  flagBannerSegment: {
    flex: 1,
  },
  cardContent: {
    padding: 20,
  },
  cardContentCompact: {
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C3E50',
    gap: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  flagBadge: {
    width: 44,
    height: 30,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#2C3E50',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  flagBadgeCompact: {
    width: 38,
    height: 26,
  },
  flagVertical: {
    flexDirection: 'row',
  },
  flagHorizontal: {
    flexDirection: 'column',
  },
  portugalEmblem: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#2C3E50',
    left: '39.3%',
    top: '50%',
  },
  countryTextGroup: {
    flexShrink: 1,
  },
  subtitle: {
    color: '#7A7468',
    fontFamily: 'dogicapixel',
    fontSize: 9,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  countryTitle: {
    color: '#2C3E50',
    fontFamily: 'dogicapixelbold',
    fontSize: 20,
    lineHeight: 26,
    textTransform: 'uppercase',
  },
  countryTitleCompact: {
    fontSize: 16,
    lineHeight: 22,
  },
  teamPill: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#FFF1CD',
    borderWidth: 2,
    borderColor: '#2C3E50',
  },
  teamPillText: {
    color: '#2C3E50',
    fontFamily: 'dogicapixelbold',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  challengeBox: {
    marginTop: 14,
    padding: 16,
    borderRadius: 14,
    borderLeftWidth: 6,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  challengeBoxCompact: {
    marginTop: 10,
    padding: 12,
  },
  challengeTitle: {
    color: '#1BA39C',
    fontFamily: 'dogicapixelbold',
    fontSize: 16,
    lineHeight: 22,
    textTransform: 'uppercase',
  },
  challengeTitleCompact: {
    fontSize: 14,
    lineHeight: 19,
  },
  prompt: {
    marginTop: 8,
    color: '#393939',
    fontFamily: 'dogicapixel',
    fontSize: 13,
    lineHeight: 21,
  },
  promptCompact: {
    marginTop: 6,
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
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#FFF1CD',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E6DDC8',
    justifyContent: 'center',
  },
  penaltyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  penaltyBadge: {
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 6,
    backgroundColor: '#D71920',
  },
  penaltyBadgeText: {
    color: '#FFF1CD',
    fontFamily: 'dogicapixelbold',
    fontSize: 8,
    textTransform: 'uppercase',
  },
  penaltyText: {
    marginTop: 6,
    color: '#393939',
    fontFamily: 'dogicapixel',
    fontSize: 11,
    lineHeight: 18,
  },
  completeButton: {
    minWidth: 148,
    minHeight: 54,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1BA39C',
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  completeButtonPressed: {
    transform: [{ scale: 0.96 }],
  },
  completeButtonDisabled: {
    opacity: 0.55,
  },
  completeButtonText: {
    color: '#2C3E50',
    fontFamily: 'dogicapixelbold',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  completeButtonSubText: {
    marginTop: 4,
    color: '#2C3E50',
    fontFamily: 'dogicapixel',
    fontSize: 8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});

export default ChallengePopup;
