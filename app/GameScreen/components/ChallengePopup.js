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
import GeoGuessrDuelView from './GeoGuessrDuelView';
import { setOverviewCameraPose } from '../constants/camera';
import {
  COUNTRY_WORD_EXPLANATION_SECONDS,
  GEO_GUESSR_CHALLENGE_TYPE,
  GEO_GUESSR_PHOTO_SECONDS,
  GEO_GUESSR_PIN_SECONDS,
  getChallengeTimer,
  getCountryFlag,
  getPenaltyTag,
} from '../constants/challenges';

const CARD_BACK_LOGO = require('../../../assets/icons/splash-icon-light.png');
// Reference phone (landscape 844 x 390): card is 75% wide and 85% tall.
const PHONE_CARD_WIDTH = 0.75;
const PHONE_CARD_HEIGHT = 0.85;
const PHONE_CARD_RATIO = (PHONE_CARD_WIDTH * 844) / (PHONE_CARD_HEIGHT * 390);
const EASY_EASE = Easing.bezier(0.42, 0, 0.58, 1);

const projectionCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
const projectedPoint = new THREE.Vector3();
const projectionLookAt = new THREE.Vector3();

const getMarkerScreenOffset = (routeModel, stopIndex, markerPosition, pieceRefs, width, height) => {
  const stopPosition = markerPosition
    || routeModel.route[stopIndex]
    || routeModel.route[1]
    || routeModel.route[0];
  if (!stopPosition || !width || !height) {
    return { x: 0, y: 0 };
  }

  projectionCamera.aspect = width / height;
  setOverviewCameraPose({
    aspect: width / height,
    cameraPosition: projectionCamera.position,
    lookAt: projectionLookAt,
    pieceRefs,
    targetPosition: stopPosition,
  });
  projectionCamera.lookAt(projectionLookAt);
  projectionCamera.updateProjectionMatrix();
  projectionCamera.updateMatrixWorld(true);

  projectedPoint.copy(stopPosition).project(projectionCamera);

  // Detour stops can sit outside the main-route overview used for this projection.
  // Keep the card's launch point on-screen so an Android tablet never has to
  // animate a large hardware layer in from a very distant projected position.
  const projectedX = Number.isFinite(projectedPoint.x) ? projectedPoint.x : 0;
  const projectedY = Number.isFinite(projectedPoint.y) ? projectedPoint.y : 0;

  return {
    x: THREE.MathUtils.clamp(projectedX, -0.92, 0.92) * (width * 0.5),
    y: -THREE.MathUtils.clamp(projectedY, -0.92, 0.92) * (height * 0.5),
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

const ChallengePopup = ({
  canComplete = true,
  challenge,
  gamePieces = [],
  getNow = Date.now,
  isTeamLeader = true,
  localTeamId = 'team1',
  multiplayerEnabled = false,
  onChallengeAction,
  onComplete,
  pieceRefs,
  routeModel,
  teamLabel,
  visible,
}) => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const compact = height < 430;
  const fly = useRef(new Animated.Value(0)).current;
  const flip = useRef(new Animated.Value(0)).current;
  const tear = useRef(new Animated.Value(0)).current;
  const [tearing, setTearing] = useState(false);
  const [ready, setReady] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(30);
  const [explanationSeconds, setExplanationSeconds] = useState(COUNTRY_WORD_EXPLANATION_SECONDS);
  const timeoutReportedRef = useRef(false);
  const challengeActionRef = useRef(onChallengeAction);
  challengeActionRef.current = onChallengeAction;
  // Keyed on content, not object identity, so a parent re-render cannot restart the card animations.
  const challengeKey = challenge ? `${challenge.stopIndex}:${challenge.title}:${challenge.monumentId || ''}` : '';

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

  const isCountryWordChallenge = challenge?.type === 'countryWordGuess';
  const isGeoGuessrChallenge = challenge?.type === GEO_GUESSR_CHALLENGE_TYPE;
  const challengeStage = challenge?.stage || (isGeoGuessrChallenge ? 'photo' : 'intro');
  const challengeDuration = Number(challenge?.durationSeconds) || 30;
  const photoDuration = Number(challenge?.photoDurationSeconds) || GEO_GUESSR_PHOTO_SECONDS;
  const pinDuration = Number(challenge?.pinDurationSeconds) || GEO_GUESSR_PIN_SECONDS;

  useEffect(() => {
    timeoutReportedRef.current = false;

    if (!visible) {
      return undefined;
    }

    if (isGeoGuessrChallenge && (challengeStage === 'photo' || challengeStage === 'pinning')) {
      const activeDuration = challengeStage === 'photo' ? photoDuration : pinDuration;
      const startedAt = challengeStage === 'photo'
        ? (Number(challenge?.photoStartedAt) || getNow())
        : (Number(challenge?.pinStartedAt) || getNow());

      const updateGeoTimer = () => {
        const elapsedSeconds = Math.max(0, getNow() - startedAt) / 1000;
        const nextRemaining = Math.max(0, Math.ceil(activeDuration - elapsedSeconds));
        setRemainingSeconds(nextRemaining);
        if (nextRemaining === 0 && canComplete && !timeoutReportedRef.current) {
          timeoutReportedRef.current = true;
          challengeActionRef.current?.({
            type: challengeStage === 'photo' ? 'startPinning' : 'timeoutPinning',
          });
        }
      };

      updateGeoTimer();
      const interval = setInterval(updateGeoTimer, 250);
      return () => clearInterval(interval);
    }

    if (!isCountryWordChallenge || challengeStage !== 'playing') {
      setRemainingSeconds(challengeDuration);
      setExplanationSeconds(COUNTRY_WORD_EXPLANATION_SECONDS);
      return undefined;
    }

    const updateTimer = () => {
      const elapsed = Math.max(0, getNow() - (Number(challenge.startedAt) || getNow()));
      const elapsedSeconds = elapsed / 1000;
      const nextRemaining = Math.max(0, Math.ceil(challengeDuration - elapsedSeconds));
      const nextExplanation = Math.max(0, Math.ceil(COUNTRY_WORD_EXPLANATION_SECONDS - elapsedSeconds));
      setRemainingSeconds(nextRemaining);
      setExplanationSeconds(nextExplanation);
      if (nextRemaining === 0 && canComplete && !timeoutReportedRef.current) {
        timeoutReportedRef.current = true;
        challengeActionRef.current?.('timeout');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 250);
    return () => clearInterval(interval);
  }, [
    canComplete,
    challenge?.activePinTeamIndex,
    challenge?.photoStartedAt,
    challenge?.pinStartedAt,
    challenge?.startedAt,
    challengeDuration,
    challengeStage,
    getNow,
    isCountryWordChallenge,
    isGeoGuessrChallenge,
    photoDuration,
    pinDuration,
    visible,
  ]);

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

  const markerOffset = getMarkerScreenOffset(
    routeModel,
    challenge.stopIndex,
    challenge.markerPosition,
    pieceRefs,
    width,
    height
  );
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
  const timer = (isCountryWordChallenge && challengeStage === 'playing')
    || (isGeoGuessrChallenge && (challengeStage === 'photo' || challengeStage === 'pinning'))
    ? `${String(remainingSeconds).padStart(2, '0')} SEC`
    : isGeoGuessrChallenge && challengeStage === 'result'
      ? 'REVEALED'
      : getChallengeTimer(challenge);
  const canFinishChallenge = canComplete
    && ((!isCountryWordChallenge && !isGeoGuessrChallenge) || challengeStage === 'result');
  const missionCode = challenge.code
    ? `MISSION ${challenge.code}-${String(challenge.stopIndex).padStart(2, '0')}`
    : 'MISSION';
  const expandedGeoMap = isGeoGuessrChallenge && challengeStage === 'pinning';
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
  if (expandedGeoMap) {
    cardWidth = Math.max(320, width - insets.left - insets.right - 12);
    cardHeight = Math.max(220, height - insets.top - insets.bottom - 8);
  }
  const roomy = cardHeight >= 280;
  const landmarkWidth = Math.max(96, Math.min(160, cardHeight * 0.36));

  const isExplaining = canComplete
    && isCountryWordChallenge
    && challengeStage === 'playing'
    && explanationSeconds > 0;

  const renderCountryWordContent = () => {
    if (!canComplete && challengeStage !== 'result') {
      return (
        <View style={styles.wordCenteredContent}>
          <Text style={[styles.title, compact && styles.titleCompact, roomy && styles.titleRoomy]}>CHALLENGE IN PROGRESS</Text>
          <Text style={[styles.prompt, compact && styles.promptCompact, roomy && styles.promptRoomy]}>
            The active team is playing on their team leader's device.
          </Text>
        </View>
      );
    }

    if (challengeStage === 'intro' || challengeStage === 'secret') {
      return (
        <View style={styles.wordCenteredContent}>
          <Text style={[styles.title, compact && styles.titleCompact, roomy && styles.titleRoomy]}>PASS THE PHONE</Text>
          <Text style={[styles.prompt, compact && styles.promptCompact, roomy && styles.promptRoomy]}>
            Give the phone to {challenge.selectedPlayerName}. Keep the screen hidden from the rest of the team.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Start the challenge with ${challenge.selectedPlayerName}`}
            style={({ pressed }) => [styles.wordActionButton, pressed && styles.completeButtonPressed]}
            onPress={() => onChallengeAction?.('start')}
          >
            <Text style={styles.wordActionText}>START</Text>
          </Pressable>
        </View>
      );
    }

    if (challengeStage === 'playing') {
      return (
        <View style={styles.wordCenteredContent}>
          <Text style={[styles.title, compact && styles.titleCompact, roomy && styles.titleRoomy]}>
            {isExplaining ? 'GET READY' : 'GUESS THE WORD'}
          </Text>
          <View style={styles.secretWordBox}>
            <Text style={styles.secretWord}>
              {isExplaining ? '••••••••••' : challenge.secretWord}
            </Text>
          </View>
          <Text style={styles.wordRules}>
            {isExplaining
              ? 'Read the instructions! Word reveals shortly.'
              : 'Describe it without saying any part of the word, translating it, or spelling it.'}
          </Text>
          <Text style={styles.countdown}>{`00:${String(remainingSeconds).padStart(2, '0')}`}</Text>
          <View style={styles.wordResultActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mark the word as guessed"
              disabled={isExplaining}
              style={({ pressed }) => [
                styles.wordActionButton,
                styles.guessedButton,
                isExplaining && styles.completeButtonDisabled,
                pressed && !isExplaining && styles.completeButtonPressed,
              ]}
              onPress={() => onChallengeAction?.('guessed')}
            >
              <Text style={styles.wordActionText}>GUESSED</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mark the word as not guessed"
              disabled={isExplaining}
              style={({ pressed }) => [
                styles.wordActionButton,
                styles.failedButton,
                isExplaining && styles.completeButtonDisabled,
                pressed && !isExplaining && styles.completeButtonPressed,
              ]}
              onPress={() => onChallengeAction?.('failed')}
            >
              <Text style={styles.wordActionText}>NOT GUESSED</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    const guessed = challenge.result === 'guessed';
    return (
      <View style={styles.wordCenteredContent}>
        <Text style={[styles.title, compact && styles.titleCompact, roomy && styles.titleRoomy]}>{guessed ? 'GUESSED!' : 'NOT GUESSED'}</Text>
        <Text style={styles.resultPoints}>{guessed ? `+${challenge.pointsAwarded || challenge.successPoints || 10} POINTS` : '0 POINTS'}</Text>
        <Text style={[styles.prompt, compact && styles.promptCompact]}>{guessed ? 'Great teamwork!' : challenge.result === 'timeout' ? 'Time ran out.' : 'Better luck at the next stop.'}</Text>
      </View>
    );
  };

  return (
    <View
      style={[
        styles.overlay,
        {
          paddingTop: expandedGeoMap ? Math.max(4, insets.top + 4) : Math.max(12, insets.top + 8),
          paddingBottom: expandedGeoMap ? Math.max(4, insets.bottom + 4) : Math.max(12, insets.bottom + 8),
          paddingLeft: expandedGeoMap ? Math.max(6, insets.left + 4) : Math.max(14, insets.left + 8),
          paddingRight: expandedGeoMap ? Math.max(6, insets.right + 4) : Math.max(14, insets.right + 8),
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
          <View style={[styles.scrollContent, expandedGeoMap && styles.scrollContentExpanded]}>
            <Animated.View
              renderToHardwareTextureAndroid={tearing}
              style={[
                styles.stubWrap,
                compact && styles.stubWrapCompact,
                expandedGeoMap && styles.stubWrapHidden,
                tearStubStyle,
              ]}
            >
              <View pointerEvents="none" style={styles.stubShadow} />
              <View style={[styles.stub, compact && styles.stubCompact]}>
              <FlagStrip country={challenge.country} />
              <Perforation />
              <Text numberOfLines={1} style={styles.stubLabel}>
                {isGeoGuessrChallenge && challenge.roadsideDuel
                  ? 'Roadside Duel'
                  : isGeoGuessrChallenge
                    ? 'Place Duel'
                    : 'Country Challenge'}
              </Text>
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
                  accessibilityLabel={canFinishChallenge
                    ? (challenge.isDetour
                      ? 'Complete challenge and continue detour'
                      : 'Complete challenge and start next turn')
                    : canComplete
                      ? 'Complete the challenge before starting the next turn'
                      : `Waiting for ${teamLabel} to complete the challenge`}
                  disabled={!canFinishChallenge || tearing || !ready}
                  onPress={handleComplete}
                  style={({ pressed }) => [
                    styles.completeButton,
                    !canFinishChallenge && styles.completeButtonDisabled,
                    pressed && styles.completeButtonPressed,
                  ]}
                >
                  <Text style={styles.completeButtonText}>
                    {canFinishChallenge ? (challenge.isDetour ? 'Continue Detour' : 'Next Turn') : 'Watching'}
                  </Text>
                  {canFinishChallenge ? null : (
                    <Text style={styles.completeButtonSubText}>{canComplete ? 'Finish the challenge' : `Waiting for ${teamLabel}`}</Text>
                  )}
                </Pressable>
              </View>
              </View>
            </Animated.View>

            <Animated.View
              renderToHardwareTextureAndroid={tearing}
              style={[styles.bodyWrap, tearBodyStyle]}
            >
              <View pointerEvents="none" style={[styles.bodyShadow, expandedGeoMap && styles.bodyShadowExpanded]} />
              <View style={[styles.body, compact && styles.bodyCompact, expandedGeoMap && styles.bodyExpanded]}>
              <View style={styles.bodyHeader}>
                <Text style={styles.missionCode}>{missionCode}</Text>
                {timer ? (
                  <View style={styles.timerChip}>
                    <Text style={styles.timerChipText}>{timer}</Text>
                  </View>
                ) : null}
              </View>
              {isGeoGuessrChallenge ? (
                <GeoGuessrDuelView
                  canComplete={canComplete}
                  challenge={challenge}
                  compact={compact}
                  gamePieces={gamePieces}
                  isTeamLeader={isTeamLeader}
                  localTeamId={localTeamId}
                  multiplayerEnabled={multiplayerEnabled}
                  onChallengeAction={onChallengeAction}
                  remainingSeconds={remainingSeconds}
                />
              ) : isCountryWordChallenge ? renderCountryWordContent() : (
                <>
                  <Text style={[styles.title, compact && styles.titleCompact, roomy && styles.titleRoomy]}>{challenge.title}</Text>
                  <Text style={[styles.prompt, compact && styles.promptCompact, roomy && styles.promptRoomy]}>{challenge.prompt}</Text>
                  <View style={styles.bodySpacer} />
                  <View style={styles.penaltyBox}>
                    <View style={styles.penaltyTag}>
                      <Text style={styles.penaltyTagText}>{getPenaltyTag(challenge)}</Text>
                    </View>
                    <Text style={styles.penaltyText}>{challenge.penalty}</Text>
                  </View>
                </>
              )}
              </View>
            </Animated.View>
          </View>
          {isExplaining && (
            <View style={styles.explanationOverlay} pointerEvents="auto">
              <View style={styles.explanationDim} />
              <View style={[styles.explanationModalWrap, compact && styles.explanationModalWrapCompact]}>
                <View style={styles.explanationShadow} />
                <View style={[styles.explanationCard, compact && styles.explanationCardCompact]}>
                  <View style={styles.explanationHeader}>
                    <View style={styles.explanationBadge}>
                      <Text style={styles.explanationBadgeText}>RULES</Text>
                    </View>
                    <Text numberOfLines={1} style={styles.explanationPlayer}>
                      {challenge.selectedPlayerName ? `${challenge.selectedPlayerName.toUpperCase()}'S TURN` : 'YOUR TURN'}
                    </Text>
                  </View>

                  <Text style={[styles.explanationTitle, compact && styles.explanationTitleCompact]}>
                    WHAT YOU HAVE TO DO
                  </Text>

                  <View style={styles.explanationList}>
                    <View style={styles.explanationItem}>
                      <Text style={styles.bulletPoint}>▸</Text>
                      <Text style={[styles.explanationText, compact && styles.explanationTextCompact]}>
                        Describe the secret word to your team.
                      </Text>
                    </View>
                    <View style={styles.explanationItem}>
                      <Text style={styles.bulletPoint}>▸</Text>
                      <Text style={[styles.explanationText, compact && styles.explanationTextCompact]}>
                        Do NOT say any part of the word or translate it.
                      </Text>
                    </View>
                    <View style={styles.explanationItem}>
                      <Text style={styles.bulletPoint}>▸</Text>
                      <Text style={[styles.explanationText, compact && styles.explanationTextCompact]}>
                        No rhyming, gestures, or spelling.
                      </Text>
                    </View>
                    <View style={styles.explanationItem}>
                      <Text style={styles.bulletPoint}>▸</Text>
                      <Text style={[styles.explanationText, compact && styles.explanationTextCompact]}>
                        Get your team to guess before time runs out!
                      </Text>
                    </View>
                  </View>

                  <View style={styles.explanationFooter}>
                    <View style={styles.countdownBadge}>
                      <Text style={styles.countdownBadgeLabel}>WORD REVEALS IN</Text>
                      <Text style={styles.countdownBadgeNumber}>{explanationSeconds}s</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}
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
    zIndex: 30,
    elevation: 30,
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
  bodyShadowExpanded: {
    left: 8,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  stubWrap: {
    width: 210,
  },
  stubWrapCompact: {
    width: 168,
  },
  stubWrapHidden: {
    display: 'none',
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
  scrollContentExpanded: {
    paddingRight: 8,
    paddingBottom: 8,
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
  bodyExpanded: {
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
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
  wordCenteredContent: {
    flex: 1,
    justifyContent: 'center',
  },
  wordActionButton: {
    minHeight: 42,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderBottomWidth: 6,
    borderColor: '#111111',
    borderRadius: 9,
    backgroundColor: '#1BA39C',
  },
  wordActionText: {
    color: '#111111',
    fontFamily: 'dogicapixelbold',
    fontSize: 10,
    textAlign: 'center',
  },
  secretWordBox: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 3,
    borderColor: '#111111',
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
  },
  secretWord: {
    color: '#D71920',
    fontFamily: 'dogicapixelbold',
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  wordRules: {
    marginTop: 8,
    color: '#2C3E50',
    fontFamily: 'dogicapixel',
    fontSize: 8,
    lineHeight: 13,
    textAlign: 'center',
  },
  hiddenWord: {
    marginTop: 10,
    color: '#4A5A6B',
    fontFamily: 'dogicapixelbold',
    fontSize: 8,
    textAlign: 'center',
  },
  countdown: {
    marginTop: 8,
    color: '#D71920',
    fontFamily: 'dogicapixelbold',
    fontSize: 30,
    lineHeight: 36,
    textAlign: 'center',
  },
  wordResultActions: {
    flexDirection: 'row',
    gap: 8,
  },
  guessedButton: {
    flex: 1,
  },
  failedButton: {
    flex: 1,
    backgroundColor: '#E8412F',
  },
  resultPoints: {
    marginTop: 14,
    color: '#1BA39C',
    fontFamily: 'dogicapixelbold',
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
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
  explanationOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  explanationDim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(8, 12, 18, 0.75)',
    borderRadius: 12,
  },
  explanationModalWrap: {
    width: '90%',
    maxWidth: 460,
    maxHeight: '94%',
  },
  explanationModalWrapCompact: {
    width: '92%',
    maxWidth: 440,
    maxHeight: '96%',
  },
  explanationShadow: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: -6,
    bottom: -6,
    backgroundColor: '#111111',
    borderRadius: 12,
  },
  explanationCard: {
    borderRadius: 12,
    borderWidth: 4,
    borderColor: '#111111',
    backgroundColor: '#FFF1CD',
    paddingVertical: 14,
    paddingHorizontal: 18,
    overflow: 'hidden',
  },
  explanationCardCompact: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  explanationBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: '#1BA39C',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#111111',
  },
  explanationBadgeText: {
    color: '#111111',
    fontFamily: 'dogicapixelbold',
    fontSize: 8,
    textTransform: 'uppercase',
  },
  explanationPlayer: {
    color: '#4A5A6B',
    fontFamily: 'dogicapixelbold',
    fontSize: 8,
    textTransform: 'uppercase',
  },
  explanationTitle: {
    marginTop: 8,
    color: '#2C3E50',
    fontFamily: 'dogicapixelbold',
    fontSize: 14,
    lineHeight: 18,
    textTransform: 'uppercase',
  },
  explanationTitleCompact: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 16,
  },
  explanationList: {
    marginTop: 8,
    gap: 4,
  },
  explanationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  bulletPoint: {
    color: '#D71920',
    fontFamily: 'dogicapixelbold',
    fontSize: 9,
    lineHeight: 14,
  },
  explanationText: {
    flex: 1,
    color: '#111111',
    fontFamily: 'dogicapixel',
    fontSize: 9,
    lineHeight: 14,
  },
  explanationTextCompact: {
    fontSize: 8,
    lineHeight: 12,
  },
  explanationFooter: {
    marginTop: 10,
    alignItems: 'center',
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FAF3E0',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#111111',
  },
  countdownBadgeLabel: {
    color: '#2C3E50',
    fontFamily: 'dogicapixelbold',
    fontSize: 8,
    textTransform: 'uppercase',
  },
  countdownBadgeNumber: {
    color: '#D71920',
    fontFamily: 'dogicapixelbold',
    fontSize: 14,
    lineHeight: 18,
  },
});

export default ChallengePopup;
