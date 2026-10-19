import React, { useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DevPortalButton({ onPress, visible = true }) {
  const [corner, setCorner] = useState('top-right');
  let insets = { top: 0, bottom: 0, left: 0, right: 0 };
  try {
    insets = useSafeAreaInsets() || insets;
  } catch (error) {
    // Fallback if safe-area context is temporarily not ready
  }

  if (!visible) return null;

  const topPos = Math.max(insets?.top || 0, 10) + 8;
  const bottomPos = Math.max(insets?.bottom || 0, 10) + 8;
  const leftPos = Math.max(insets?.left || 0, 10) + 10;
  const rightPos = Math.max(insets?.right || 0, 10) + 10;

  const positionStyle = {
    'top-right': { top: topPos, right: rightPos },
    'bottom-right': { bottom: bottomPos, right: rightPos },
    'bottom-left': { bottom: bottomPos, left: leftPos },
    'top-left': { top: topPos, left: leftPos },
  }[corner] || { top: topPos, right: rightPos };

  const handleLongPress = () => {
    const cycle = {
      'top-right': 'bottom-right',
      'bottom-right': 'bottom-left',
      'bottom-left': 'top-left',
      'top-left': 'top-right',
    };
    setCorner((prev) => cycle[prev] || 'top-right');
  };

  return (
    <View style={[styles.container, positionStyle]} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.button}
        onPress={onPress}
        onLongPress={handleLongPress}
        activeOpacity={0.75}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View style={styles.indicator} />
        <Text style={styles.buttonText}>⚡ DEV</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 99999,
    elevation: 99999,
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
    paddingVertical: 6,
    minHeight: 32,
    minWidth: 72,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    ...Platform.select({
      web: {
        cursor: 'pointer',
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
