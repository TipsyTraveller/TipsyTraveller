import React, { memo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

const TRACK_EDGE = 18;
const ICON_SIZE = 28;

const VehicleIcon = ({ color, isActive }) => (
  <View style={[styles.vehicleBadge, isActive && styles.vehicleBadgeActive]}>
    <Svg width={ICON_SIZE} height={18} viewBox="0 0 34 20" fill="none">
      <Path
        d="M3 13.5 5.6 9h5.2l3.4-4h8.1l4.2 4H30l1.5 4.5v2H3v-2Z"
        fill={color}
        stroke="#111111"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <Path d="m13.4 9 2.4-2.4h5.5L23.8 9H13.4Z" fill="#FFF1CD" />
      <Circle cx="9" cy="15.5" r="2.6" fill="#2C3E50" stroke="#111111" strokeWidth="1.3" />
      <Circle cx="26" cy="15.5" r="2.6" fill="#2C3E50" stroke="#111111" strokeWidth="1.3" />
    </Svg>
  </View>
);

const FinishFlag = () => (
  <View style={styles.finishFlag}>
    <View style={styles.flagPole} />
    <View style={styles.flagGrid}>
      {Array.from({ length: 12 }, (_, index) => (
        <View
          key={index}
          style={[
            styles.flagSquare,
            { backgroundColor: (Math.floor(index / 4) + index) % 2 === 0 ? '#111111' : '#FFF1CD' },
          ]}
        />
      ))}
    </View>
  </View>
);

const RaceProgressTracker = ({
  activeTeamId,
  gamePieces,
  movingPieceId,
  passedLeg,
  routeModel,
  state,
  teamProgress,
}) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const trackerWidth = Math.min(560, Math.max(300, width * 0.62));
  const trackWidth = trackerWidth - 32 - TRACK_EDGE * 2;

  return (
    <View
      pointerEvents="none"
      style={[styles.positioner, { bottom: insets.bottom + 8 }]}
    >
      <View style={[styles.panel, { width: trackerWidth }]}>
        <View style={styles.headerRow}>
          <Text style={styles.eyebrow}>RACE PROGRESS</Text>
          <Text style={styles.finishLabel}>FINISH</Text>
        </View>

        <View style={styles.trackArea}>
          <View style={[styles.trackRail, { left: TRACK_EDGE, right: TRACK_EDGE }]} />
          {routeModel.stopProgress.map((progress, index) => (
            <View
              key={`${routeModel.countryStops[index]?.id || index}-tick`}
              style={[
                styles.stopTick,
                { left: TRACK_EDGE + progress * trackWidth },
                (index === 0 || index === routeModel.finalStopIndex) && styles.majorStopTick,
              ]}
            />
          ))}

          {gamePieces.map((piece, index) => {
            const storedLeg = teamProgress[piece.id]?.currentLeg ?? 0;
            const displayedLeg = state === 'moving' && movingPieceId === piece.id
              ? Math.max(storedLeg, passedLeg)
              : storedLeg;
            const progress = routeModel.stopProgress[displayedLeg] ?? 0;

            return (
              <View
                accessibilityLabel={`${piece.label}, ${piece.model?.label || 'vehicle'}, stop ${displayedLeg + 1} of ${routeModel.finalStopIndex + 1}`}
                key={piece.id}
                style={[
                  styles.vehiclePosition,
                  {
                    left: TRACK_EDGE + progress * trackWidth,
                    top: 5 + index * 13,
                  },
                ]}
              >
                <VehicleIcon color={piece.color} isActive={piece.id === activeTeamId} />
              </View>
            );
          })}

          <View style={styles.startDot} />
          <FinishFlag />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  positioner: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  panel: {
    height: 72,
    paddingHorizontal: 16,
    paddingTop: 7,
    paddingBottom: 8,
    borderWidth: 3,
    borderColor: '#111111',
    borderRadius: 10,
    backgroundColor: 'rgba(255, 241, 205, 0.94)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 12,
  },
  eyebrow: {
    color: '#2C3E50',
    fontFamily: 'dogicapixelbold',
    fontSize: 7,
    letterSpacing: 0.7,
  },
  finishLabel: {
    color: '#D71920',
    fontFamily: 'dogicapixelbold',
    fontSize: 7,
    letterSpacing: 0.5,
  },
  trackArea: {
    flex: 1,
    position: 'relative',
    marginTop: 2,
  },
  trackRail: {
    position: 'absolute',
    top: 25,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2C3E50',
  },
  stopTick: {
    position: 'absolute',
    top: 22,
    width: 3,
    height: 10,
    marginLeft: -1.5,
    borderRadius: 1.5,
    backgroundColor: '#1BA39C',
  },
  majorStopTick: {
    top: 20,
    height: 14,
    backgroundColor: '#D71920',
  },
  vehiclePosition: {
    position: 'absolute',
    width: 34,
    marginLeft: -17,
    alignItems: 'center',
    zIndex: 6,
  },
  vehicleBadge: {
    width: 34,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    backgroundColor: '#FFF1CD',
  },
  vehicleBadgeActive: {
    borderWidth: 2,
    borderColor: '#FFD700',
    backgroundColor: '#FFFFFF',
  },
  startDot: {
    position: 'absolute',
    left: TRACK_EDGE - 5,
    top: 22,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#111111',
    backgroundColor: '#1BA39C',
    zIndex: 3,
  },
  finishFlag: {
    position: 'absolute',
    right: TRACK_EDGE - 10,
    top: 1,
    width: 28,
    height: 40,
    zIndex: 5,
  },
  flagPole: {
    position: 'absolute',
    left: 3,
    top: 0,
    bottom: 0,
    width: 3,
    borderRadius: 1.5,
    backgroundColor: '#111111',
  },
  flagGrid: {
    position: 'absolute',
    left: 6,
    top: 1,
    width: 20,
    height: 15,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: '#111111',
  },
  flagSquare: {
    width: '25%',
    height: '33.333%',
  },
});

export default memo(RaceProgressTracker);
