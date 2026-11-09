import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

const VehicleIcon = ({ color, isActive }) => (
  <View style={[styles.vehicleIcon, isActive && styles.vehicleIconActive]}>
    <Svg width={26} height={15} viewBox="0 0 34 20" fill="none">
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

const getActionLabel = ({ canRoll, isConnected }) => {
  if (!isConnected) return 'OFFLINE';
  return canRoll ? 'ROLL' : 'WAIT';
};

const RaceProgressTracker = ({
  activeTeamId,
  canRoll,
  gamePieces,
  isConnected,
  onRoll,
  routeModel,
  teamProgress,
  visible,
}) => {
  const insets = useSafeAreaInsets();
  const buttonLabel = getActionLabel({ canRoll, isConnected });
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    opacity.stopAnimation();
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: visible ? 180 : 140,
      easing: visible ? Easing.out(Easing.quad) : Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start();

    return () => opacity.stopAnimation();
  }, [opacity, visible]);

  return (
    <Animated.View
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      pointerEvents={visible ? 'box-none' : 'none'}
      style={[
        styles.positioner,
        { opacity },
        {
          top: insets.top + 4,
          right: insets.right + 4,
          bottom: insets.bottom + 4,
        },
      ]}
    >
      <View style={styles.panel}>
        <View style={styles.finishHeader} pointerEvents="none">
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
              const displayedLeg = teamProgress[piece.id]?.currentLeg ?? 0;
              const progress = routeModel.stopProgress[displayedLeg] ?? 0;
              const isActive = piece.id === activeTeamId;
              const laneOffset = (index - (gamePieces.length - 1) / 2) * 9;

              return (
                <View
                  accessibilityLabel={`${piece.label}, ${piece.model?.label || 'vehicle'}, stop ${displayedLeg + 1} of ${routeModel.finalStopIndex + 1}`}
                  key={piece.id}
                  style={[
                    styles.vehiclePosition,
                    isActive && styles.activeVehiclePosition,
                    {
                      marginLeft: -14 + laneOffset,
                      top: `${(1 - progress) * 100}%`,
                    },
                  ]}
                >
                  <VehicleIcon color={piece.color} isActive={isActive} />
                </View>
              );
            })}

            <View style={styles.startDot} />
          </View>
        </View>

        <TouchableOpacity
          accessibilityLabel="Roll dice"
          accessibilityRole="button"
          disabled={!visible || !canRoll}
          onPress={onRoll}
          style={[styles.actionButton, (!visible || !canRoll) && styles.actionButtonDisabled]}
        >
          <Text style={styles.actionLabel}>{buttonLabel}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  positioner: {
    position: 'absolute',
    width: 56,
  },
  panel: {
    flex: 1,
    width: 56,
    paddingHorizontal: 3,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: '#111111',
    borderRadius: 9,
    backgroundColor: 'rgba(255, 241, 205, 0.92)',
  },
  finishHeader: {
    height: 18,
    alignItems: 'center',
  },
  finishFlag: {
    width: 18,
    height: 17,
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
    width: 14,
    height: 11,
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
    width: 8,
    height: 2,
    marginTop: -1,
    marginLeft: -4,
    borderRadius: 1,
    backgroundColor: '#1BA39C',
  },
  majorStopTick: {
    width: 12,
    height: 3,
    marginLeft: -6,
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
  activeVehiclePosition: {
    zIndex: 4,
  },
  vehicleIcon: {
    width: 28,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleIconActive: {
    transform: [{ scale: 1.12 }],
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
    minHeight: 26,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 1,
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
    fontSize: 6,
  },
});

export default memo(RaceProgressTracker);
