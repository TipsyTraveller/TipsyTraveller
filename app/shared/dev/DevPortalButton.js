import React, { useRef } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BUTTON_WIDTH = 76;
const BUTTON_HEIGHT = 34;

export default function DevPortalButton({ onPress, visible = true }) {
  const insets = useSafeAreaInsets();
  const screen = Dimensions.get('window');

  const defaultTop = Math.max(insets.top + 8, 14);
  const defaultLeft = Math.max(screen.width - BUTTON_WIDTH - 14, 14);

  const pan = useRef(new Animated.ValueXY({ x: defaultLeft, y: defaultTop })).current;
  const isDraggingRef = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4;
      },
      onPanResponderGrant: () => {
        isDraggingRef.current = false;
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gestureState) => {
        if (Math.hypot(gestureState.dx, gestureState.dy) > 6) {
          isDraggingRef.current = true;
        }
        Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        })(_, gestureState);
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        if (!isDraggingRef.current && Math.hypot(gestureState.dx, gestureState.dy) < 6) {
          onPress?.();
        }
        isDraggingRef.current = false;
      },
    })
  ).current;

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: pan.getTranslateTransform(),
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.button}>
        <View style={styles.indicator} />
        <Text style={styles.buttonText}>⚡ DEV</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 999999,
    elevation: 999999,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a2530',
    borderWidth: 2,
    borderColor: '#ffd700',
    borderRadius: 8,
    paddingHorizontal: 8,
    height: BUTTON_HEIGHT,
    minWidth: BUTTON_WIDTH,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    ...Platform.select({
      web: {
        cursor: 'grab',
        userSelect: 'none',
      },
    }),
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#27ae60',
    marginRight: 6,
  },
  buttonText: {
    color: '#ffd700',
    fontSize: 9,
    fontFamily: 'dogicapixelbold',
    letterSpacing: 0.5,
  },
});
