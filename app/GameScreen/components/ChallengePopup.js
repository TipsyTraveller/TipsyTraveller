import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as THREE from 'three';
import CityLandmark from './CityLandmark';
import { DONE_LOOK, DONE_POS } from '../constants/camera';
import { getChallengeTimer, getCountryFlag, getPenaltyTag } from '../constants/challenges';
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

const PERFORATION_DASHES = Array.from({ length: 14 });

const Perforation = () => (
  <View style={styles.perforation} pointerEvents="none">
    {PERFORATION_DASHES.map((_, index) => (
      <View key={`dash-${index}`} style={styles.perforationDash} />
    ))}
  </View>
);

const FlagStrip = ({ country }) => {
  const flag = getCountryFlag(country);

  return (
    <View style={styles.flagStrip} pointerEvents="none">
      {flag.stripes.map((color, index) => (
        <View
          key={`flag-${index}`}
          style={{ flex: flag.stripeWeights?.[index] ?? 1, backgroundColor: color }}
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
  const tear = useRef(new Animated.Value(0)).current;
  const [tearing, setTearing] = useState(false);
  // Keyed on content, not object identity, so a parent re-render cannot restart the card animations.
  const challengeKey = challenge ? `${challenge.stop}:${challenge.title}` : '';

  useEffect(() => {
    if (!visible) {
      fly.setValue(0);
      flip.setValue(0);
      tear.setValue(0);
      setTearing(false);
      return;
    }

    fly.setValue(0);
    flip.setValue(0);
    tear.setValue(0);
    setTearing(false);

    const flySequence = Animated.sequence([
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

    flySequence.start();

    return () => {
      flySequence.stop();
    };
  }, [challengeKey, flip, fly, tear, visible]);

  const handleComplete = useCallback(() => {
    if (tearing) return;
    setTearing(true);
    Animated.timing(tear, {
      toValue: 1,
      duration: 720,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onComplete?.();
    });
  }, [onComplete, tear, tearing]);

  if (!visible || !challenge) return null;

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

  const tearOpacity = tear.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] });
  const tearStubStyle = {
    opacity: tearOpacity,
    transform: [
      {
        translateX: tear.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0, -10, -210] }),
      },
      {
        translateY: tear.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0, -8, 320] }),
      },
      {
        rotate: tear.interpolate({ inputRange: [0, 0.18, 1], outputRange: ['0deg', '-5deg', '-34deg'] }),
      },
    ],
  };
  const tearBodyStyle = {
    opacity: tearOpacity,
    transform: [
      {
        translateX: tear.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 6, 150] }),
      },
      {
        translateY: tear.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 4, 380] }),
      },
      {
        rotate: tear.interpolate({ inputRange: [0, 0.3, 1], outputRange: ['0deg', '2deg', '16deg'] }),
      },
    ],
  };
  const timer = getChallengeTimer(challenge);
  const missionCode = challenge.code
    ? `MISSION ${challenge.code}-${String(challenge.stop).padStart(2, '0')}`
    : 'MISSION';
  // Give the ticket a landscape-card ratio instead of a flat strip, but never taller than the screen.
  const availableHeight = Math.max(210, height - insets.top - insets.bottom - 40);
  const cardWidth = Math.min(720, width * (compact ? 0.94 : 0.9));
  const minTicketHeight = Math.min(availableHeight, Math.max(210, cardWidth * 0.56));
  const roomy = minTicketHeight >= 300;
  const landmarkWidth = roomy ? 162 : compact ? 112 : 150;

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
        style={[styles.backdropDim, backdropAnimatedStyle]}
      />
      <Animated.View style={[styles.cardShadow, compact && styles.cardShadowCompact, flyWrapperStyle]}>
        <Animated.View style={[styles.frontFace, frontFaceAnimatedStyle]}>
          <ScrollView
              style={[
                { maxHeight: availableHeight },
                // Let the torn halves leave the scroll bounds without remounting them mid-animation.
                tearing && styles.scrollTearing,
              ]}
              contentContainerStyle={[styles.scrollContent, { minHeight: minTicketHeight }]}
              bounces={false}
              showsVerticalScrollIndicator={false}
            >
<Animated.View style={[styles.stubWrap, compact && styles.stubWrapCompact, tearStubStyle]}>
              <View pointerEvents="none" style={styles.stubShadow} />
              <View style={[styles.stub, compact && styles.stubCompact]}>
              <FlagStrip country={challenge.country} />
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
              {challenge.landmark ? null : <View style={styles.stubSpacer} />}
              <View style={styles.teamBadge}>
                <Text style={styles.teamBadgeText}>{teamLabel}</Text>
              </View>
              <View style={styles.buttonWrap}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={canComplete
                    ? 'Complete challenge and start next turn'
                    : `Waiting for ${teamLabel} to complete the challenge`}
                  disabled={!canComplete || tearing}
                  onPress={handleComplete}
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
              </View>
              </View>
            </Animated.View>

            <Animated.View style={[styles.bodyWrap, tearBodyStyle]}>
              <View pointerEvents="none" style={styles.bodyShadow} />
              <View style={[styles.body, compact && styles.bodyCompact]}>
              <View style={styles.bodyHeader}>
                <Text style={styles.missionCode}>{missionCode}</Text>
                {timer ? (
                  <View style={styles.timerChip}>
                    <Text style={styles.timerChipText}>{timer}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.title, compact && styles.titleCompact, roomy && styles.titleRoomy]}>{challenge.title}</Text>
              <Text style={[styles.prompt, compact && styles.promptCompact, roomy && styles.promptRoomy]}>{challenge.prompt}</Text>
              <View style={styles.bodySpacer} />
              <View style={styles.penaltyBox}>
                <View style={styles.penaltyTag}>
                  <Text style={styles.penaltyTagText}>{getPenaltyTag(challenge)}</Text>
                </View>
                <Text style={styles.penaltyText}>{challenge.penalty}</Text>
              </View>
              </View>
            </Animated.View>
            </ScrollView>
        </Animated.View>
        <CardBack compact={compact} style={backFaceAnimatedStyle} />
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
  cardShadow: {
    width: '90%',
    maxWidth: 720,
  },
  cardShadowCompact: {
    width: '94%',
  },
  backdropDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 12, 18, 0.68)',
  },
  cardContainer: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#FAF3E0',
    borderWidth: 4,
    borderColor: '#111111',
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
    right: 8,
    bottom: 8,
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
  frontFace: {
    backfaceVisibility: 'hidden',
  },
  stubShadow: {
    position: 'absolute',
    left: 8,
    right: -8,
    top: 8,
    bottom: -8,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    backgroundColor: '#111111',
  },
  bodyShadow: {
    position: 'absolute',
    left: 0,
    right: -8,
    top: 8,
    bottom: -8,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: '#111111',
  },
  stubWrap: {
    width: 210,
  },
  stubWrapCompact: {
    width: 168,
  },
  bodyWrap: {
    flex: 1,
  },
  scrollTearing: {
    overflow: 'visible',
    ...(Platform.OS === 'web' ? { overflowX: 'visible', overflowY: 'visible' } : null),
  },
  scrollContent: {
    flexGrow: 1,
    paddingRight: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  stub: {
    flex: 1,
    borderWidth: 4,
    borderRightWidth: 0,
    borderColor: '#111111',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    overflow: 'hidden',
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 26,
    paddingRight: 14,
    alignItems: 'center',
    backgroundColor: '#2C3E50',
  },
  stubCompact: {
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
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 8,
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
    borderWidth: 4,
    borderLeftWidth: 0,
    borderColor: '#111111',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: '#FAF3E0',
    overflow: 'hidden',
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
  titleRoomy: {
    marginTop: 16,
    fontSize: 24,
    lineHeight: 32,
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
  promptRoomy: {
    marginTop: 14,
    fontSize: 15,
    lineHeight: 25,
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
