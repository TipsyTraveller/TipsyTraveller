import {
  Animated,
  Easing,
  Image,
  Pressable,
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

const CARD_BACK_LOGO = require('../../../assets/icons/splash-icon-light.png');
// Reference phone (landscape 844 x 390): card is 75% wide and 85% tall.
const PHONE_CARD_WIDTH = 0.75;
const PHONE_CARD_HEIGHT = 0.85;
const PHONE_CARD_RATIO = (PHONE_CARD_WIDTH * 844) / (PHONE_CARD_HEIGHT * 390);
const EASY_EASE = Easing.bezier(0.42, 0, 0.58, 1);

const projectionCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
const projectedPoint = new THREE.Vector3();

const getMarkerScreenOffset = (routeModel, stopIndex, width, height) => {
  const stopPosition = routeModel.route[stopIndex] || routeModel.route[1] || routeModel.route[0];
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

const BACK_STRIPES = ['#1BA39C', '#FFF1CD', '#E8412F'];

const CardBack = ({ compact, style }) => (
  <Animated.View pointerEvents="none" style={[styles.cardBackOverlay, style]}>
    <View style={styles.cardBackShadow} />
    <View style={styles.cardBackFace}>
      <View style={[styles.cardBackStrip, styles.cardBackStripLeft]}>
        {BACK_STRIPES.map((color) => (
          <View key={`l-${color}`} style={{ flex: 1, backgroundColor: color }} />
        ))}
      </View>
      <View style={[styles.cardBackStrip, styles.cardBackStripRight]}>
        {BACK_STRIPES.map((color) => (
          <View key={`r-${color}`} style={{ flex: 1, backgroundColor: color }} />
        ))}
      </View>
      <View style={[styles.cardBackStud, styles.studTopLeft]} />
      <View style={[styles.cardBackStud, styles.studTopRight]} />
      <View style={[styles.cardBackStud, styles.studBottomLeft]} />
      <View style={[styles.cardBackStud, styles.studBottomRight]} />

      <View style={[styles.logoHalo, compact && styles.logoHaloCompact]}>
        <Image
          source={CARD_BACK_LOGO}
          style={[styles.cardBackLogo, compact && styles.cardBackLogoCompact]}
          resizeMode="contain"
        />
      </View>
      <Text style={[styles.cardBackBrand, compact && styles.cardBackBrandCompact]}>
        {'TIPSY\nTRAVELLER'}
      </Text>
      <View style={styles.cardBackTag}>
        <Text style={styles.cardBackTagText}>COUNTRY CHALLENGE</Text>
      </View>
    </View>
  </Animated.View>
);

const ChallengePopup = ({ canComplete = true, challenge, teamLabel, visible, onComplete, routeModel }) => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const compact = height < 430;
  const fly = useRef(new Animated.Value(0)).current;
  const flip = useRef(new Animated.Value(0)).current;
  const tear = useRef(new Animated.Value(0)).current;
  const [tearing, setTearing] = useState(false);
  const [ready, setReady] = useState(false);
  // Keyed on content, not object identity, so a parent re-render cannot restart the card animations.
  const challengeKey = challenge ? `${challenge.stopIndex}:${challenge.title}` : '';

  useEffect(() => {
    if (!visible) {
      fly.setValue(0);
      flip.setValue(0);
      tear.setValue(0);
      setTearing(false);
      setReady(false);
      return;
    }

    fly.setValue(0);
    flip.setValue(0);
    tear.setValue(0);
    setTearing(false);
    setReady(false);

    let cancelled = false;
    let flySequence = null;

    // Wait two frames so the card tree is mounted and laid out before the opening
    // animation starts; otherwise its first frames are spent on layout work.
    let secondFrame = null;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        if (cancelled) return;
        flySequence = Animated.sequence([
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

        flySequence.start(({ finished }) => {
          if (finished) setReady(true);
        });
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(firstFrame);
      if (secondFrame !== null) cancelAnimationFrame(secondFrame);
      if (flySequence) flySequence.stop();
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

  const markerOffset = getMarkerScreenOffset(routeModel, challenge.stopIndex, width, height);
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
      inputRange: [0, 0.02, 1],
      outputRange: [0, 1, 1],
    }),
    transform: [
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
        rotateZ: fly.interpolate({
          inputRange: [0, 0.65, 1],
          outputRange: [launchTiltDeg, '0deg', '0deg'],
        }),
      },
    ],
  };

  // A scaleX "card turn" instead of rotateY: it needs no perspective or backface
  // culling, which render unreliably on Android and some iOS GPUs.
  // The hidden face is also moved off-screen, so no hairline of its border is left
  // over the visible face once its scaleX reaches zero.
  const backFaceAnimatedStyle = {
    transform: [
      {
        translateX: flip.interpolate({
          inputRange: [0, 0.5, 0.501, 1],
          outputRange: [0, 0, 4000, 4000],
        }),
      },
      {
        scaleX: flip.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [1, 0.0001, 0.0001],
        }),
      },
    ],
  };

  const frontFaceAnimatedStyle = {
    transform: [
      {
        translateX: flip.interpolate({
          inputRange: [0, 0.499, 0.5, 1],
          outputRange: [4000, 4000, 0, 0],
        }),
      },
      {
        scaleX: flip.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.0001, 0.0001, 1],
        }),
      },
    ],
  };

  const tearStubStyle = {
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
    ? `MISSION ${challenge.code}-${String(challenge.stopIndex).padStart(2, '0')}`
    : 'MISSION';
  // Card size: on a phone it takes 75% of the screen width and 85% of its height.
  // Larger screens keep that same landscape rectangle (the phone's aspect ratio)
  // instead of stretching, scaled to fit inside the same 75% x 90% box.
  const isPhone = Math.min(width, height) < 600;
  let cardWidth;
  let cardHeight;
  if (isPhone) {
    cardWidth = width * PHONE_CARD_WIDTH;
    cardHeight = Math.min(height * PHONE_CARD_HEIGHT, height - insets.top - insets.bottom - 8);
  } else {
    cardHeight = Math.min(height * PHONE_CARD_HEIGHT, (width * PHONE_CARD_WIDTH) / PHONE_CARD_RATIO, 520);
    cardWidth = cardHeight * PHONE_CARD_RATIO;
  }
  const roomy = cardHeight >= 280;
  const landmarkWidth = Math.max(96, Math.min(160, cardHeight * 0.36));

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
      <Animated.View
        renderToHardwareTextureAndroid
        shouldRasterizeIOS
        style={[styles.cardShadow, { width: cardWidth, height: cardHeight }, flyWrapperStyle]}
      >
        <Animated.View
          pointerEvents={ready ? 'auto' : 'none'}
          style={[styles.frontFace, frontFaceAnimatedStyle]}
        >
          <View style={styles.scrollContent}>
            <Animated.View
              renderToHardwareTextureAndroid={tearing}
              style={[styles.stubWrap, compact && styles.stubWrapCompact, tearStubStyle]}
            >
              <View pointerEvents="none" style={styles.stubShadow} />
              <View style={[styles.stub, compact && styles.stubCompact]}>
              <FlagStrip country={challenge.country} />
              <Perforation />
              <Text numberOfLines={1} style={styles.stubLabel}>Country Challenge</Text>
              {challenge.landmark ? (
                <View style={styles.landmark}>
                  <CityLandmark name={challenge.landmark} width={landmarkWidth} />
                </View>
              ) : null}
              <Text
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
                  disabled={!canComplete || tearing || !ready}
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

            <Animated.View
              renderToHardwareTextureAndroid={tearing}
              style={[styles.bodyWrap, tearBodyStyle]}
            >
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
          </View>
        </Animated.View>
        <CardBack compact={compact} style={backFaceAnimatedStyle} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardShadow: {
    alignSelf: 'center',
  },
  frontFace: {
    flex: 1,
  },
  backdropDim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(8, 12, 18, 0.68)',
  },
  cardBackOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  cardBackShadow: {
    position: 'absolute',
    left: 8,
    right: 0,
    top: 8,
    bottom: 0,
    borderRadius: 12,
    backgroundColor: '#111111',
  },
  cardBackFace: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 8,
    bottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 4,
    borderColor: '#111111',
    backgroundColor: '#FFF1CD',
    overflow: 'hidden',
  },
  cardBackStrip: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 9,
  },
  cardBackStripLeft: {
    left: 0,
    borderRightWidth: 3,
    borderRightColor: '#111111',
  },
  cardBackStripRight: {
    right: 0,
    borderLeftWidth: 3,
    borderLeftColor: '#111111',
  },
  cardBackStud: {
    position: 'absolute',
    width: 10,
    height: 10,
    backgroundColor: '#2C3E50',
    borderWidth: 2,
    borderColor: '#111111',
  },
  studTopLeft: { top: 18, left: 28 },
  studTopRight: { top: 18, right: 28 },
  studBottomLeft: { bottom: 18, left: 28 },
  studBottomRight: { bottom: 18, right: 28 },
  logoHalo: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#FAF3E0',
    borderWidth: 4,
    borderColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#111111',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  logoHaloCompact: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  cardBackLogo: {
    width: 100,
    height: 100,
  },
  cardBackLogoCompact: {
    width: 64,
    height: 64,
  },
  cardBackBrand: {
    marginTop: 14,
    color: '#2C3E50',
    fontFamily: 'dogicapixelbold',
    fontSize: 22,
    lineHeight: 30,
    textAlign: 'center',
    textShadowColor: '#1BA39C',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
  },
  cardBackBrandCompact: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 20,
  },
  cardBackTag: {
    marginTop: 10,
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: '#1BA39C',
    borderWidth: 3,
    borderColor: '#111111',
    shadowColor: '#111111',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  cardBackTagText: {
    color: '#111111',
    fontFamily: 'dogicapixelbold',
    fontSize: 9,
    textTransform: 'uppercase',
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
  scrollContent: {
    flex: 1,
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
    lineHeight: 12,
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
    paddingTop: 11,
    paddingBottom: 8,
    backgroundColor: '#1BA39C',
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#111111',
    borderBottomWidth: 7,
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
    backgroundColor: '#FFF1CD',
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
    backgroundColor: '#FAF3E0',
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
    backgroundColor: '#FAF3E0',
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
