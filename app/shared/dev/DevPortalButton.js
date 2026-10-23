import React, { useEffect, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { devEventBus } from './devEventBus';

export default function DevPortalButton({ onPress, visible = true }) {
  const [corner, setCorner] = useState('top-right');
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  let insets = { top: 0, bottom: 0, left: 0, right: 0 };
  try {
    insets = useSafeAreaInsets() || insets;
  } catch (error) {
    // Fallback if safe-area context is temporarily not ready
  }

  useEffect(() => {
    AsyncStorage.getItem('dev_portal_button_corner')
      .then((saved) => {
        if (saved) setCorner(saved);
      })
      .catch(() => {});

    const unsub = devEventBus.on('dev:setButtonCorner', (newCorner) => {
      if (newCorner) {
        setCorner(newCorner);
        AsyncStorage.setItem('dev_portal_button_corner', newCorner).catch(() => {});
      }
    });

    return () => unsub?.();
  }, []);

  if (!visible) return null;

  const topPos = Math.max(insets?.top || 0, 10) + 8;
  const bottomPos = Math.max(insets?.bottom || 0, 10) + 8;
  const leftPos = Math.max(insets?.left || 0, 10) + 70;
  // Offset to the left so it does not cover:
  // - Account and Settings buttons (Header) in portrait (~124px offset)
  // - Compact race tracker in landscape on GameScreen (~72px offset)
  const rightOffset = isLandscape ? 72 : 124;
  const rightPos = Math.max(insets?.right || 0, 10) + rightOffset;

  const positionStyle = {
    'top-right': { top: topPos, right: rightPos },
    'bottom-right': { bottom: bottomPos, right: Math.max(insets?.right || 0, 10) + 10 },
    'bottom-left': { bottom: bottomPos, left: Math.max(insets?.left || 0, 10) + 10 },
    'top-left': { top: topPos, left: leftPos },
  }[corner] || { top: topPos, right: rightPos };

  const handleLongPress = () => {
    const cycle = {
      'top-right': 'bottom-right',
      'bottom-right': 'bottom-left',
      'bottom-left': 'top-left',
      'top-left': 'top-right',
    };
    const nextCorner = cycle[corner] || 'top-right';
    setCorner(nextCorner);
    AsyncStorage.setItem('dev_portal_button_corner', nextCorner).catch(() => {});
  };

  return (
    <View style={[styles.container, positionStyle]} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.button}
        onPress={onPress}
        onLongPress={handleLongPress}
        activeOpacity={0.75}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Open Dev Portal"
        accessibilityHint="Long press to move the button to another corner"
      >
        <View style={styles.iconBadge}>
          <Text style={styles.iconText}>⚡</Text>
        </View>
        <View>
          <Text style={styles.buttonEyebrow}>TOOLS</Text>
          <Text style={styles.buttonText}>DEV LAB</Text>
        </View>
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
    backgroundColor: '#101b25',
    borderWidth: 1,
    borderColor: '#ffd700',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 7,
    minHeight: 42,
    minWidth: 92,
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
  iconBadge: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: '#1b3e3c',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  iconText: {
    fontSize: 12,
  },
  buttonEyebrow: {
    color: '#70d9d2',
    fontSize: 5.5,
    fontFamily: 'dogicapixelbold',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  buttonText: {
    color: '#fff1cd',
    fontSize: 7,
    fontFamily: 'dogicapixelbold',
    letterSpacing: 0.5,
  },
});
