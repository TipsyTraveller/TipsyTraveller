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
    if (activeScreen === 'settings') {
      nav.replace('AccountScreen');
    } else if (nav?.navigate) {
      nav.navigate('AccountScreen');
    }
  };

  const handleSettingsPress = () => {
    if (activeScreen === 'settings') return;
    if (activeScreen === 'account') {
      nav.replace('SettingsScreen');
    } else if (nav?.navigate) {
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
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[
              styles.iconButton,
              activeScreen === 'account' && styles.iconButtonActive,
              accountPressed && styles.iconButtonPressed,
            ]}
            onPress={handleAccountPress}
            onPressIn={() => setAccountPressed(true)}
            onPressOut={() => setAccountPressed(false)}
            activeOpacity={0.75}
          >
            <AccountIcon
              size={24}
              color="#2C3E50"
            />
          </TouchableOpacity>
        )}

        {showSettingsButton && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Game Settings"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[
              styles.iconButton,
              activeScreen === 'settings' && styles.iconButtonActive,
              settingsPressed && styles.iconButtonPressed,
            ]}
            onPress={handleSettingsPress}
            onPressIn={() => setSettingsPressed(true)}
            onPressOut={() => setSettingsPressed(false)}
            activeOpacity={0.75}
          >
            <SettingsIcon
              size={24}
              color="#2C3E50"
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
    minHeight: 48,
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
    fontSize: 12.5,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  icons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'transform 0.12s ease, background-color 0.12s ease',
      },
    }),
  },
  iconButtonActive: {
    backgroundColor: '#FFF1CD',
    borderWidth: 1.5,
    borderColor: '#2C3E50',
  },
  iconButtonPressed: {
    backgroundColor: 'rgba(44, 62, 80, 0.1)',
    transform: [{ scale: 0.9 }],
  },
});
