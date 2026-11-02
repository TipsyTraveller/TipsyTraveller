import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import {
  clampSizeEstimate,
  formatSizeMeasurement,
  getDimensionMeta,
  SIZE_IT_UP_MAX_RATIO,
  SIZE_IT_UP_MIN_RATIO,
} from '../constants/sizeItUp';
import SizeItUpSilhouette, {
  getSilhouetteAspectRatio,
  getSilhouetteDimensions,
} from './SizeItUpSilhouette';

const MIN_LOG_RATIO = Math.log10(SIZE_IT_UP_MIN_RATIO);
const MAX_LOG_RATIO = Math.log10(SIZE_IT_UP_MAX_RATIO);
const RATIO_STEP = 1.05;

const toSliderValue = (ratio) => Math.log10(clampSizeEstimate(ratio));
const fromSliderValue = (value) => clampSizeEstimate(10 ** Number(value));
const formatRatioMultiplier = (ratio) => `${clampSizeEstimate(ratio).toFixed(2).replace(/\.?0+$/, '')}×`;

function MeasuredSilhouette({
  axis = 'height',
  bracketColor = '#111111',
  color,
  label,
  silhouette,
  size,
}) {
  const { height, width } = getSilhouetteDimensions({ axis, silhouette, size });
  const dim = getDimensionMeta(axis);
  const isLength = axis === 'length';

  if (isLength) {
    return (
      <View style={styles.measuredLengthWrap}>
        <View style={[styles.horizontalBracket, { width }]}>
          <View style={[styles.bracketEndVertical, { backgroundColor: bracketColor }]} />
          <View style={[styles.bracketLineHorizontal, { backgroundColor: bracketColor }]} />
          {width >= 26 ? (
            <View style={[styles.bracketSymbolPill, { borderColor: bracketColor }]}>
              <Text style={[styles.bracketSymbolText, { color: bracketColor }]}>{dim.symbol}</Text>
            </View>
          ) : null}
          <View style={[styles.bracketLineHorizontal, { backgroundColor: bracketColor }]} />
          <View style={[styles.bracketEndVertical, { backgroundColor: bracketColor }]} />
        </View>
        <SizeItUpSilhouette
          axis={axis}
          color={color}
          label={label}
          silhouette={silhouette}
          size={size}
        />
      </View>
    );
  }

  return (
    <View style={styles.measuredHeightWrap}>
      <SizeItUpSilhouette
        axis={axis}
        color={color}
        label={label}
        silhouette={silhouette}
        size={size}
      />
      <View style={[styles.verticalBracket, { height }]}>
        <View style={[styles.bracketEndHorizontal, { backgroundColor: bracketColor }]} />
        <View style={[styles.bracketLineVertical, { backgroundColor: bracketColor }]} />
        {height >= 26 ? (
          <View style={[styles.bracketSymbolPill, { borderColor: bracketColor }]}>
            <Text style={[styles.bracketSymbolText, { color: bracketColor }]}>{dim.symbol}</Text>
          </View>
        ) : null}
        <View style={[styles.bracketLineVertical, { backgroundColor: bracketColor }]} />
        <View style={[styles.bracketEndHorizontal, { backgroundColor: bracketColor }]} />
      </View>
    </View>
  );
}

export default function SizeItUpView({
  canComplete,
  canFinalizeTimeout,
  challenge,
  compact,
  getNow = Date.now,
  onChallengeAction,
  remainingSeconds,
}) {
  const initialRatio = clampSizeEstimate(challenge.estimatedRatio);
  const [draftRatio, setDraftRatio] = useState(initialRatio);
  const [sliderSeed, setSliderSeed] = useState(() => toSliderValue(initialRatio));
  const [stageLayout, setStageLayout] = useState({ width: 0, height: 0 });
  const slidingRef = useRef(false);
  const timeoutSentRef = useRef(false);
  const hasSeenPositiveTimeRef = useRef(remainingSeconds > 0);
  const stage = challenge.stage || 'playing';
  const result = stage === 'result';

  if (remainingSeconds > 0) {
    hasSeenPositiveTimeRef.current = true;
  }

  useEffect(() => {
    timeoutSentRef.current = false;
    hasSeenPositiveTimeRef.current = remainingSeconds > 0;
    const nextRatio = clampSizeEstimate(challenge.estimatedRatio);
    setDraftRatio(nextRatio);
    setSliderSeed(toSliderValue(nextRatio));
  }, [challenge.sizeRoundId]);

  useEffect(() => {
    if (
      !canComplete
      && !slidingRef.current
      && Number.isFinite(Number(challenge.estimatedRatio))
    ) {
      const nextRatio = clampSizeEstimate(challenge.estimatedRatio);
      setDraftRatio(nextRatio);
      setSliderSeed(toSliderValue(nextRatio));
    }
  }, [canComplete, challenge.estimatedRatio]);

  useEffect(() => {
    const durationMs = (Number(challenge.durationSeconds) || 30) * 1000;
    const startedAt = Number(challenge.startedAt) || 0;
    const deadlinePassed = startedAt > 0 && getNow() >= startedAt + durationMs - 250;
    if (
      stage !== 'playing'
      || remainingSeconds > 0
      || (!hasSeenPositiveTimeRef.current && !deadlinePassed)
      || timeoutSentRef.current
    ) {
      return undefined;
    }

    timeoutSentRef.current = true;
    if (canComplete) {
      onChallengeAction?.({ type: 'timeoutSizeEstimate', estimatedRatio: draftRatio });
      return undefined;
    }
    if (!canFinalizeTimeout) return undefined;

    const recoveryTimeout = setTimeout(() => {
      onChallengeAction?.({ type: 'timeoutSizeEstimate' });
    }, 1200);
    return () => clearTimeout(recoveryTimeout);
  }, [
    canComplete,
    canFinalizeTimeout,
    challenge.durationSeconds,
    challenge.startedAt,
    draftRatio,
    getNow,
    onChallengeAction,
    remainingSeconds,
    stage,
  ]);

  if (!canComplete && !result) {
    return (
      <View style={styles.watchingContent}>
        <Text style={[styles.title, compact && styles.titleCompact]}>SIZE IT UP IN PROGRESS</Text>
        <Text style={styles.watchingCopy}>
          The active team is matching two real-world sizes on its leader&apos;s device.
        </Text>
        <Text style={styles.watchingTimer}>{`${String(remainingSeconds).padStart(2, '0')} SEC`}</Text>
      </View>
    );
  }

  const reference = challenge.referenceItem || {};
  const target = challenge.targetItem || {};
  const refDim = getDimensionMeta(reference.axis);
  const targetDim = getDimensionMeta(target.axis);
  const sameAxis = refDim.axis === targetDim.axis;
  const trueRatio = clampSizeEstimate(challenge.trueRatio);
  const finalRatio = clampSizeEstimate(challenge.estimatedRatio);
  const activeRatio = result ? finalRatio : draftRatio;

  const refAspect = getSilhouetteAspectRatio(reference.silhouette);
  const targetAspect = getSilhouetteAspectRatio(target.silhouette);
  const unitRefHeight = reference.axis === 'height' ? 1 : (1 / refAspect);
  const unitRefWidth = reference.axis === 'length' ? 1 : refAspect;
  const getUnitTargetHeight = (ratio) => (target.axis === 'height' ? ratio : (ratio / targetAspect));
  const getUnitTargetWidth = (ratio) => (target.axis === 'length' ? ratio : (ratio * targetAspect));

  const fallbackStageHeight = result ? (compact ? 72 : 92) : (compact ? 88 : 118);
  const fallbackStageWidth = result ? (compact ? 115 : 155) : (compact ? 150 : 210);
  const availHeight = Math.max(44, (stageLayout.height || fallbackStageHeight) - 14);
  const availRefWidth = Math.max(52, (stageLayout.width || fallbackStageWidth) - 22);
  const availTargetSingleWidth = result
    ? Math.max(40, ((stageLayout.width || fallbackStageWidth) * 1.45 - 46) / 2)
    : availRefWidth;

  const maxTargetHeightUnits = Math.max(
    getUnitTargetHeight(activeRatio),
    result ? getUnitTargetHeight(trueRatio) : 0,
    0.05
  );
  const maxTargetWidthUnits = Math.max(
    getUnitTargetWidth(activeRatio),
    result ? getUnitTargetWidth(trueRatio) : 0,
    0.05
  );
  const baseComfortUnits = Math.max(unitRefHeight, getUnitTargetHeight(1), 0.5);

  const referencePixels = Math.max(
    8,
    Math.min(
      availHeight / unitRefHeight,
      availRefWidth / unitRefWidth,
      availHeight / maxTargetHeightUnits,
      availTargetSingleWidth / maxTargetWidthUnits,
      (availHeight * 0.72) / baseComfortUnits
    )
  );
  const guessedPixels = referencePixels * activeRatio;
  const truePixels = referencePixels * trueRatio;
  const liveGuessedMetres = Number(reference.metres || 0) * activeRatio;
  const finalGuessedMetres = Number(reference.metres || 0) * finalRatio;
  const passed = challenge.result === 'passed';
  const errorPercent = Number(challenge.errorPercent) || 0;

  const persistEstimate = (nextRatio, syncSlider = false) => {
    const safeRatio = clampSizeEstimate(nextRatio);
    setDraftRatio(safeRatio);
    if (syncSlider) {
      setSliderSeed(toSliderValue(safeRatio));
    }
    onChallengeAction?.({ type: 'updateSizeEstimate', estimatedRatio: safeRatio });
  };

  const openSource = (url) => {
    if (url) Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={[styles.title, compact && styles.titleCompact]}>
            {result ? (passed ? 'SIZED UP!' : 'OUT OF SCALE') : 'HOW BIG IS IT?'}
          </Text>
          <Text numberOfLines={1} style={styles.instructions}>
            {result
              ? `${errorPercent.toFixed(1)}% off · Guessed ${formatSizeMeasurement(finalGuessedMetres)} vs real ${formatSizeMeasurement(target.metres)}`
              : sameAxis
                ? `Measuring ${targetDim.label} (${targetDim.symbol}) — scale ${target.label || 'target'} relative to ${reference.label || 'reference'}.`
                : `Compare ${reference.label || 'reference'} ${refDim.label} (${refDim.symbol}) vs ${target.label || 'target'} ${targetDim.label} (${targetDim.symbol}).`}
          </Text>
        </View>
        {!result ? (
          <View style={styles.headerRight}>
            <View style={styles.liveGuessHeaderBadge}>
              <Text style={styles.liveGuessHeaderLabel}>{`GUESS ${targetDim.symbol}`}</Text>
              <Text style={styles.liveGuessHeaderValue}>
                {`${formatSizeMeasurement(liveGuessedMetres)} (${formatRatioMultiplier(activeRatio)})`}
              </Text>
            </View>
            <Text style={styles.timer}>{`${String(remainingSeconds).padStart(2, '0')}s`}</Text>
          </View>
        ) : null}
      </View>

      <View style={[
        styles.scaleBoard,
        compact && styles.scaleBoardCompact,
        result && styles.scaleBoardResult,
      ]}>
        <View style={styles.objectColumn}>
          <View
            onLayout={(event) => {
              const { width: nextWidth, height: nextHeight } = event.nativeEvent.layout;
              if (
                Math.abs(nextWidth - stageLayout.width) > 2
                || Math.abs(nextHeight - stageLayout.height) > 2
              ) {
                setStageLayout({ width: nextWidth, height: nextHeight });
              }
            }}
            style={styles.silhouetteStage}
          >
            <MeasuredSilhouette
              axis={reference.axis}
              bracketColor="#0E5C78"
              color="#1BA39C"
              label={reference.label}
              silhouette={reference.silhouette}
              size={referencePixels}
            />
          </View>
          <View style={styles.baseline} />
          <View style={styles.itemMetaRow}>
            <Text numberOfLines={1} style={styles.objectLabel}>{reference.label}</Text>
            <View style={styles.dimensionBadge}>
              <Text style={styles.dimensionBadgeText}>{refDim.badge}</Text>
            </View>
          </View>
          <Text style={styles.measurement}>
            {`KNOWN ${refDim.label}: ${formatSizeMeasurement(reference.metres)}`}
          </Text>
        </View>

        <View style={styles.versusBadge}><Text style={styles.versusText}>VS</Text></View>

        <View style={[styles.objectColumn, result && styles.objectColumnResultTarget]}>
          <View style={styles.silhouetteStage}>
            {result ? (
              <View style={styles.resultCompareRow}>
                <View style={styles.resultSubColumn}>
                  <Text style={styles.resultSubTag}>YOUR GUESS</Text>
                  <View style={styles.resultSubStage}>
                    <MeasuredSilhouette
                      axis={target.axis}
                      bracketColor={passed ? '#0E5C78' : '#8F2419'}
                      color={passed ? '#1BA39C' : '#E8412F'}
                      label={`Guessed ${target.label}`}
                      silhouette={target.silhouette}
                      size={guessedPixels}
                    />
                  </View>
                </View>
                <View style={styles.resultSubColumn}>
                  <Text style={styles.resultSubTag}>REAL SIZE</Text>
                  <View style={styles.resultSubStage}>
                    <MeasuredSilhouette
                      axis={target.axis}
                      bracketColor="#1F3A52"
                      color="#283747"
                      label={`True ${target.label}`}
                      silhouette={target.silhouette}
                      size={truePixels}
                    />
                  </View>
                </View>
              </View>
            ) : (
              <MeasuredSilhouette
                axis={target.axis}
                bracketColor="#8A5A00"
                color="#E09F1F"
                label={target.label}
                silhouette={target.silhouette}
                size={guessedPixels}
              />
            )}
          </View>
          <View style={styles.baseline} />
          <View style={styles.itemMetaRow}>
            <Text numberOfLines={1} style={styles.objectLabel}>{target.label}</Text>
            <View style={[styles.dimensionBadge, styles.targetDimensionBadge]}>
              <Text style={styles.dimensionBadgeText}>{targetDim.badge}</Text>
            </View>
          </View>
          <Text numberOfLines={1} style={[styles.measurement, !result && styles.liveGuessMeasurement]}>
            {result
              ? `GUESS ${formatSizeMeasurement(finalGuessedMetres)} (${formatRatioMultiplier(finalRatio)}) · REAL ${formatSizeMeasurement(target.metres)} (${formatRatioMultiplier(trueRatio)})`
              : `GUESSING ${targetDim.label}: ${formatSizeMeasurement(liveGuessedMetres)} (${formatRatioMultiplier(activeRatio)})`}
          </Text>
        </View>
      </View>

      {result ? (
        <View style={[styles.resultPanel, passed ? styles.passPanel : styles.failPanel]}>
          <Text style={styles.resultTitle}>{passed ? 'WITHIN 15% — PASS' : 'MORE THAN 15% — FAIL'}</Text>
          <Text style={styles.resultCopy}>
            {passed
              ? 'Great eye. No drinks are assigned.'
              : `The active team takes ${challenge.resolvedPenaltySips || 1} ${Number(challenge.resolvedPenaltySips) === 1 ? 'sip' : 'sips'} each.`}
          </Text>
          <View style={styles.sourcesRow}>
            <Pressable onPress={() => openSource(reference.sourceUrl)} accessibilityRole="link">
              <Text style={styles.sourceLink}>{reference.sourceLabel || 'Reference source'}</Text>
            </Pressable>
            <Text style={styles.sourceDivider}>·</Text>
            <Pressable onPress={() => openSource(target.sourceUrl)} accessibilityRole="link">
              <Text style={styles.sourceLink}>{target.sourceLabel || 'Target source'}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.controls}>
          <Pressable
            accessibilityLabel="Make target smaller"
            accessibilityRole="button"
            onPress={() => persistEstimate(draftRatio / RATIO_STEP, true)}
            style={({ pressed }) => [styles.adjustButton, pressed && styles.pressed]}
          >
            <Text style={styles.adjustButtonText}>−</Text>
          </Pressable>
          <Slider
            accessibilityLabel={`Scale ${target.label} ${targetDim.label}`}
            accessibilityRole="adjustable"
            accessibilityValue={{
              text: `${formatSizeMeasurement(liveGuessedMetres)}, ${Math.round(draftRatio * 100)} percent of the reference size`,
            }}
            maximumTrackTintColor="#31485A"
            maximumValue={MAX_LOG_RATIO}
            minimumTrackTintColor="#F4B942"
            minimumValue={MIN_LOG_RATIO}
            onSlidingComplete={(value) => {
              slidingRef.current = false;
              persistEstimate(fromSliderValue(value), true);
            }}
            onSlidingStart={() => { slidingRef.current = true; }}
            onValueChange={(value) => setDraftRatio(fromSliderValue(value))}
            step={0.005}
            style={styles.slider}
            thumbTintColor="#E8412F"
            value={sliderSeed}
          />
          <Pressable
            accessibilityLabel="Make target bigger"
            accessibilityRole="button"
            onPress={() => persistEstimate(draftRatio * RATIO_STEP, true)}
            style={({ pressed }) => [styles.adjustButton, pressed && styles.pressed]}
          >
            <Text style={styles.adjustButtonText}>＋</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Lock in size estimate"
            accessibilityRole="button"
            onPress={() => onChallengeAction?.({ type: 'submitSizeEstimate', estimatedRatio: draftRatio })}
            style={({ pressed }) => [styles.lockButton, pressed && styles.pressed]}
          >
            <Text style={styles.lockButtonText}>LOCK IN</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 6 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  headingCopy: { flex: 1, minWidth: 0 },
  title: { color: '#111111', fontFamily: 'dogicapixelbold', fontSize: 16, lineHeight: 20 },
  titleCompact: { fontSize: 13, lineHeight: 16 },
  instructions: { color: '#405064', fontFamily: 'dogicapixel', fontSize: 7.5, lineHeight: 11, marginTop: 3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveGuessHeaderBadge: {
    borderWidth: 2,
    borderColor: '#111111',
    borderRadius: 6,
    backgroundColor: '#FFF1CD',
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignItems: 'flex-end',
  },
  liveGuessHeaderLabel: { color: '#7A5200', fontFamily: 'dogicapixelbold', fontSize: 6 },
  liveGuessHeaderValue: { color: '#111111', fontFamily: 'dogicapixelbold', fontSize: 8.5, marginTop: 2 },
  timer: { color: '#E8412F', fontFamily: 'dogicapixelbold', fontSize: 17 },
  scaleBoard: {
    flex: 1,
    minHeight: 140,
    borderWidth: 3,
    borderColor: '#111111',
    borderRadius: 10,
    backgroundColor: '#F7E5BA',
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  scaleBoardCompact: { minHeight: 114, paddingVertical: 4 },
  scaleBoardResult: { minHeight: 102, paddingVertical: 4 },
  objectColumn: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'flex-end' },
  objectColumnResultTarget: { flex: 1.45 },
  silhouetteStage: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'flex-end', minHeight: 64 },
  measuredHeightWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  measuredLengthWrap: { alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  verticalBracket: { width: 12, alignItems: 'center', justifyContent: 'space-between' },
  horizontalBracket: { height: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bracketEndHorizontal: { width: 8, height: 2 },
  bracketEndVertical: { width: 2, height: 8 },
  bracketLineVertical: { width: 2, flex: 1 },
  bracketLineHorizontal: { height: 2, flex: 1 },
  bracketSymbolPill: {
    borderWidth: 1.5,
    borderRadius: 4,
    backgroundColor: '#FFF1CD',
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  bracketSymbolText: { fontFamily: 'dogicapixelbold', fontSize: 6.5, lineHeight: 8 },
  resultCompareRow: {
    flex: 1,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    gap: 6,
  },
  resultSubColumn: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'space-between' },
  resultSubStage: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'flex-end' },
  resultSubTag: {
    color: '#405064',
    fontFamily: 'dogicapixelbold',
    fontSize: 6,
    backgroundColor: '#FFF1CD',
    borderWidth: 1.5,
    borderColor: '#111111',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  baseline: { alignSelf: 'stretch', height: 3, backgroundColor: '#111111', marginTop: 2 },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 4,
    maxWidth: '100%',
  },
  objectLabel: {
    color: '#111111',
    fontFamily: 'dogicapixelbold',
    fontSize: 7.5,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  dimensionBadge: {
    backgroundColor: '#1BA39C',
    borderWidth: 1.5,
    borderColor: '#111111',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1.5,
  },
  targetDimensionBadge: {
    backgroundColor: '#F4B942',
  },
  dimensionBadgeText: {
    color: '#111111',
    fontFamily: 'dogicapixelbold',
    fontSize: 6,
  },
  measurement: {
    color: '#283747',
    fontFamily: 'dogicapixelbold',
    fontSize: 7,
    marginTop: 3,
    textAlign: 'center',
  },
  liveGuessMeasurement: {
    color: '#111111',
    backgroundColor: '#FFF1CD',
    borderWidth: 1.5,
    borderColor: '#111111',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  versusBadge: {
    alignSelf: 'center',
    backgroundColor: '#111111',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 6,
    marginHorizontal: 5,
  },
  versusText: { color: '#FFF1CD', fontFamily: 'dogicapixelbold', fontSize: 8 },
  controls: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7 },
  slider: { flex: 1, height: 36 },
  adjustButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#111111',
    backgroundColor: '#FFF1CD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustButtonText: { color: '#111111', fontFamily: 'dogicapixelbold', fontSize: 18 },
  lockButton: {
    minHeight: 40,
    minWidth: 100,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 3,
    borderBottomWidth: 6,
    borderColor: '#111111',
    backgroundColor: '#1BA39C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockButtonText: { color: '#111111', fontFamily: 'dogicapixelbold', fontSize: 9 },
  pressed: { opacity: 0.84, transform: [{ translateY: 1 }] },
  resultPanel: { borderWidth: 3, borderColor: '#111111', borderRadius: 8, padding: 7 },
  passPanel: { backgroundColor: '#BDE5D5' },
  failPanel: { backgroundColor: '#F4B6A8' },
  resultTitle: { color: '#111111', fontFamily: 'dogicapixelbold', fontSize: 8.5, textAlign: 'center' },
  resultCopy: { color: '#283747', fontFamily: 'dogicapixel', fontSize: 7, lineHeight: 10, marginTop: 3, textAlign: 'center' },
  sourcesRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 4 },
  sourceLink: { color: '#0E5C78', fontFamily: 'dogicapixel', fontSize: 6.5, textDecorationLine: 'underline' },
  sourceDivider: { color: '#405064', fontFamily: 'dogicapixel', fontSize: 7 },
  watchingContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  watchingCopy: { color: '#405064', fontFamily: 'dogicapixel', fontSize: 9, lineHeight: 14, marginTop: 10, textAlign: 'center' },
  watchingTimer: { color: '#E8412F', fontFamily: 'dogicapixelbold', fontSize: 20, marginTop: 14 },
});
