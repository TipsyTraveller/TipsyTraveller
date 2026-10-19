import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import BackButton from '../BackButton/BackButton';
import { AccountIcon, SettingsIcon } from './HeaderIcons';

export default function Header({
  showBackButton = false,
  navigation,
  title = null,
  showAccountButton = true,
  showSettingsButton = true,
  activeScreen = null,
  onBackPress = null,
}) {
  const hookNav = useNavigation();
  const nav = navigation || hookNav;

  const [accountPressed, setAccountPressed] = useState(false);
  const [settingsPressed, setSettingsPressed] = useState(false);

  const handleAccountPress = () => {
    if (activeScreen === 'account') return;
    if (nav?.navigate) {
      nav.navigate('AccountScreen');
    }
  };

  const handleSettingsPress = () => {
    if (activeScreen === 'settings') return;
    if (nav?.navigate) {
      nav.navigate('SettingsScreen');
    }
  };

  return (
    <View style={[styles.mainContainer, (showBackButton || title) && styles.withBackButton]}>
      {/* Left Slot: Back button or empty spacer */}
      <View style={styles.leftContainer}>
        {showBackButton && (
          <BackButton
            navigation={nav}
            onPress={onBackPress}
          />
        )}
      </View>

      {/* Center Slot: Optional Title */}
      {title ? (
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>
      ) : null}

      {/* Right Slot: Functional Account & Settings Buttons */}
      <View style={styles.icons} accessible={false}>
        {showAccountButton && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Player Account and Profile"
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            style={[
              styles.iconButton,
              activeScreen === 'account' && styles.iconButtonActive,
              accountPressed && styles.iconButtonPressed,
            ]}
            onPress={handleAccountPress}
            onPressIn={() => setAccountPressed(true)}
            onPressOut={() => setAccountPressed(false)}
            activeOpacity={0.85}
          >
            <AccountIcon
              size={20}
              color={activeScreen === 'account' ? '#2C3E50' : '#2C3E50'}
            />
          </TouchableOpacity>
        )}

        {showSettingsButton && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Game Settings"
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            style={[
              styles.iconButton,
              activeScreen === 'settings' && styles.iconButtonActive,
              settingsPressed && styles.iconButtonPressed,
            ]}
            onPress={handleSettingsPress}
            onPressIn={() => setSettingsPressed(true)}
            onPressOut={() => setSettingsPressed(false)}
            activeOpacity={0.85}
          >
            <SettingsIcon
              size={20}
              color={activeScreen === 'settings' ? '#2C3E50' : '#2C3E50'}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 4,
    zIndex: 10,
  },
  withBackButton: {
    justifyContent: 'space-between',
  },
  leftContainer: {
    minWidth: 78,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    color: '#2C3E50',
    fontFamily: 'dogicapixelbold',
    fontSize: 13,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  icons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: '#2C3E50',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#2C3E50',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
      web: {
        cursor: 'pointer',
        boxShadow: '0px 2px 4px rgba(44, 62, 80, 0.18)',
        userSelect: 'none',
        transition: 'transform 0.1s ease',
      },
    }),
  },
  iconButtonActive: {
    backgroundColor: '#FFD700',
    borderColor: '#2C3E50',
    transform: [{ scale: 1.05 }],
  },
  iconButtonPressed: {
    backgroundColor: '#FFF1CD',
    transform: [{ scale: 0.92 }],
  },
});
