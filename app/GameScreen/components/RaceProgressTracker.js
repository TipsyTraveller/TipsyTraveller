import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

const VehicleIcon = ({ color, isActive }) => (
  <View style={[styles.vehicleBadge, isActive && styles.vehicleBadgeActive]}>
    <Svg width={23} height={14} viewBox="0 0 34 20" fill="none">
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
      {Array.from({ length: 9 }, (_, index) => (
        <View
          key={index}
          style={[
            styles.flagSquare,
            { backgroundColor: (Math.floor(index / 3) + index) % 2 === 0 ? '#111111' : '#FFF1CD' },
          ]}
        />
      ))}
    </View>
  </View>
);

const getActionLabel = ({ canRestart, canRoll, isConnected, state }) => {
  if (!isConnected) return 'OFFLINE';
  if (state === 'loading') return 'LOAD';
  if (state === 'waiting') return canRoll ? 'ROLL' : 'WAIT';
  if (state === 'rolling') return 'ROLLING';
  if (state === 'moving') return 'MOVING';
  if (state === 'challenge') return 'TASK';
  if (state === 'done') return canRestart ? 'RESTART' : 'WAIT';
  return 'WAIT';
};

const RaceProgressTracker = ({
  activeTeamId,
  canRestart,
  canRoll,
  gamePieces,
  isConnected,
  movingPieceId,
  onRestart,
  onRoll,
  passedLeg,
  routeModel,
  state,
  teamProgress,
}) => {
  const insets = useSafeAreaInsets();
  const isDone = state === 'done';
  const buttonDisabled = isDone ? !canRestart : !canRoll;
  const buttonLabel = getActionLabel({ canRestart, canRoll, isConnected, state });

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.positioner,
        {
          top: insets.top + 8,
          right: insets.right + 8,
          bottom: insets.bottom + 8,
        },
      ]}
    >
      <View style={styles.panel}>
        <View style={styles.finishHeader} pointerEvents="none">
          <Text style={styles.finishLabel}>FINISH</Text>
          <FinishFlag />
        </View>

        <View style={styles.routeArea} pointerEvents="none">
          <View style={styles.trackBounds}>
            <View style={styles.trackRail} />
            {routeModel.stopProgress.map((progress, index) => (
              <View
                key={`${routeModel.countryStops[index]?.id || index}-tick`}
                style={[
                  styles.stopTick,
                  { top: `${(1 - progress) * 100}%` },
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
              const laneOffset = (index - (gamePieces.length - 1) / 2) * 18;

              return (
                <View
                  accessibilityLabel={`${piece.label}, ${piece.model?.label || 'vehicle'}, stop ${displayedLeg + 1} of ${routeModel.finalStopIndex + 1}`}
                  key={piece.id}
                  style={[
                    styles.vehiclePosition,
                    {
                      marginLeft: -14 + laneOffset,
                      top: `${(1 - progress) * 100}%`,
                    },
                  ]}
                >
                  <VehicleIcon color={piece.color} isActive={piece.id === activeTeamId} />
                </View>
              );
            })}

            <View style={styles.startDot} />
          </View>
        </View>

        <TouchableOpacity
          accessibilityLabel={isDone ? 'Restart game' : 'Roll dice'}
          accessibilityRole="button"
          disabled={buttonDisabled}
          onPress={isDone ? onRestart : onRoll}
          style={[styles.actionButton, buttonDisabled && styles.actionButtonDisabled]}
        >
          <Text style={styles.actionLabel}>{buttonLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  positioner: {
    position: 'absolute',
    width: 78,
  },
  panel: {
    flex: 1,
    width: 78,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: '#111111',
    borderRadius: 10,
    backgroundColor: 'rgba(255, 241, 205, 0.92)',
    shadowColor: '#000000',
    shadowOffset: { width: -4, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 0,
  },
  finishHeader: {
    height: 28,
    alignItems: 'center',
  },
  finishLabel: {
    color: '#D71920',
    fontFamily: 'dogicapixelbold',
    fontSize: 6,
    letterSpacing: 0.4,
  },
  finishFlag: {
    width: 21,
    height: 20,
    marginTop: 2,
  },
  flagPole: {
    position: 'absolute',
    left: 2,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#111111',
  },
  flagGrid: {
    position: 'absolute',
    left: 4,
    top: 0,
    width: 16,
    height: 13,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: '#111111',
  },
  flagSquare: {
    width: '33.333%',
    height: '33.333%',
  },
  routeArea: {
    flex: 1,
    position: 'relative',
    minHeight: 120,
  },
  trackBounds: {
    position: 'absolute',
    top: 12,
    right: 0,
    bottom: 12,
    left: 0,
  },
  trackRail: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 3,
    marginLeft: -1.5,
    borderRadius: 1.5,
    backgroundColor: '#2C3E50',
  },
  stopTick: {
    position: 'absolute',
    left: '50%',
    width: 10,
    height: 2,
    marginTop: -1,
    marginLeft: -5,
    borderRadius: 1,
    backgroundColor: '#1BA39C',
  },
  majorStopTick: {
    width: 15,
    height: 3,
    marginLeft: -7.5,
    backgroundColor: '#D71920',
  },
  vehiclePosition: {
    position: 'absolute',
    left: '50%',
    width: 28,
    height: 20,
    marginTop: -10,
    alignItems: 'center',
    zIndex: 3,
  },
  vehicleBadge: {
    width: 28,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: '#FFF1CD',
  },
  vehicleBadgeActive: {
    borderWidth: 2,
    borderColor: '#FFD700',
    backgroundColor: '#FFFFFF',
  },
  startDot: {
    position: 'absolute',
    left: '50%',
    bottom: -5,
    width: 10,
    height: 10,
    marginLeft: -5,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#111111',
    backgroundColor: '#1BA39C',
  },
  actionButton: {
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: '#111111',
    borderRadius: 7,
    backgroundColor: '#1BA39C',
  },
  actionButtonDisabled: {
    opacity: 0.45,
  },
  actionLabel: {
    color: '#FFFFFF',
    fontFamily: 'dogicapixelbold',
    fontSize: 7,
  },
});

export default memo(RaceProgressTracker);
