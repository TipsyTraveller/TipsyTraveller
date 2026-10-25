import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addBotPlayer,
  autoFillLobby,
  getOrCreateDevDeviceId,
  readyUpTeams,
  regenerateDeviceId,
  removeBotPlayers,
} from './devFirebaseService';
import {
  getCurrentRouteInfo,
  navigate,
  resetRoot,
  startInstantCharacterSelection,
  startInstantGameScreen,
  startLiveTestLobby,
} from './devNavigation';
import { devEventBus } from './devEventBus';
import CountryStopsTab from './CountryStopsTab';
import { resolveGameRouteStops } from '../../GameScreen/constants/countryStops';
import { subscribeCountryStops } from '../../GameScreen/services/countryStopsService';

const TABS = [
  { id: 'screens', icon: '🚀', label: 'Screens' },
  { id: 'multiplayer', icon: '👥', label: 'Bots' },
  { id: 'board', icon: '🎲', label: 'Board' },
  ...(Platform.OS === 'web' ? [{ id: 'countries', icon: '🗺️', label: 'Countries' }] : []),
  { id: 'tools', icon: '⚙️', label: 'Identity' },
];

export default function DevPortalModal({ visible, onClose }) {
  const [activeTab, setActiveTab] = useState('screens');
  const [gamePin, setGamePin] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [buttonCorner, setButtonCorner] = useState('top-right');
  const [loadingAction, setLoadingAction] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [authoredRouteStops, setAuthoredRouteStops] = useState([]);
  const [confirmingStorageClear, setConfirmingStorageClear] = useState(false);
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isCompact = width < 560;

  useEffect(() => {
    if (visible) {
      loadDeviceId();
      detectActiveGamePin();
      const routeInfo = getCurrentRouteInfo();
      if (routeInfo?.name === 'GameScreen') {
        setActiveTab('board');
      }
      AsyncStorage.getItem('dev_portal_button_corner')
        .then((saved) => {
          if (saved) setButtonCorner(saved);
        })
        .catch(() => {});
    }
    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (visible) {
        onClose?.();
        return true;
      }
      return false;
    });
    return () => backSub.remove();
  }, [visible, onClose]);

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    return subscribeCountryStops(setAuthoredRouteStops, (error) => {
      console.warn('Failed to load authored country stops for Dev Portal board tools.', error);
    });
  }, []);

  const loadDeviceId = async () => {
    try {
      const id = await getOrCreateDevDeviceId();
      setDeviceId(id);
    } catch (e) {
      console.warn('Failed to load device ID', e);
    }
  };

  const detectActiveGamePin = () => {
    try {
      const routeInfo = getCurrentRouteInfo();
      const activePin = routeInfo?.params?.gameID || routeInfo?.params?.editingGameID;
      if (activePin && activePin !== 'DEV-INSTANT' && activePin !== 'DEV-MOCK') {
        setGamePin(String(activePin));
      }
    } catch (e) {
      console.warn('Failed to detect active pin', e);
    }
  };

  const showStatus = (msg) => {
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage('');
    }, 3500);
  };

  // --- Handlers: Screens ---
  const handleStartInstantGame = async (teamCount) => {
    setLoadingAction('instantGame');
    try {
      await startInstantGameScreen({ teamCount });
      showStatus(`Started instant ${teamCount}-team GameScreen`);
      onClose();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleStartCharacterSelection = async (teamCount) => {
    setLoadingAction('instantChar');
    try {
      await startInstantCharacterSelection({ teamCount });
      showStatus(`Started Character Selection (${teamCount} teams)`);
      onClose();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleStartLiveLobby = async (nrOfPlayers) => {
    setLoadingAction('liveLobby');
    try {
      const newPin = await startLiveTestLobby({ nrOfPlayers });
      setGamePin(newPin);
      showStatus(`Created live room ${newPin}`);
      onClose();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoadingAction(null);
    }
  };

  // --- Handlers: Multiplayer & Bots ---
  const handleAutoFillLobby = async () => {
    if (!gamePin.trim()) {
      Alert.alert('Game PIN Required', 'Enter or detect an active 4-digit game PIN.');
      return;
    }
    setLoadingAction('autoFill');
    try {
      const res = await autoFillLobby(gamePin.trim());
      showStatus(`Added ${res.addedCount} required leader bots!`);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAddBot = async (teamNr) => {
    if (!gamePin.trim()) {
      Alert.alert('Game PIN Required', 'Enter or detect an active 4-digit game PIN.');
      return;
    }
    setLoadingAction(`botTeam${teamNr}`);
    try {
      const res = await addBotPlayer(gamePin.trim(), teamNr);
      showStatus(`Added ${res.botName} to Team ${teamNr}`);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReadyUpTeams = async () => {
    if (!gamePin.trim()) {
      Alert.alert('Game PIN Required', 'Enter or detect an active 4-digit game PIN.');
      return;
    }
    setLoadingAction('readyUp');
    try {
      await readyUpTeams(gamePin.trim());
      showStatus('Assigned default cars to all teams in Firebase!');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRemoveBots = async () => {
    if (!gamePin.trim()) {
      Alert.alert('Game PIN Required', 'Enter or detect an active 4-digit game PIN.');
      return;
    }
    setLoadingAction('removeBots');
    try {
      const res = await removeBotPlayers(gamePin.trim());
      showStatus(`Removed ${res.removedCount} bot player(s).`);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoadingAction(null);
    }
  };

  // --- Handlers: Board & Game ---
  const handleForceRoll = (value) => {
    devEventBus.emit('dev:forceRoll', { value });
    showStatus(`Emitted dice roll: ${value}`);
    onClose();
  };

  const handleTestChallenge = async (stopIndex, forceType = null) => {
    const routeInfo = getCurrentRouteInfo();
    const isGameScreen = routeInfo?.name === 'GameScreen';
    const stopName = activeRouteStops[stopIndex]?.name || `stop ${stopIndex}`;
    showStatus(`Driving active team to ${stopName}${forceType ? ` (${forceType})` : ''}...`);
    onClose();

    if (!isGameScreen) {
      await startInstantGameScreen({ teamCount: 2, duration: 'long' });
      setTimeout(() => {
        devEventBus.emit('dev:testChallenge', { forceType, stopIndex });
      }, 400);
    } else {
      devEventBus.emit('dev:testChallenge', { forceType, stopIndex });
    }
  };

  const handleSkipChallenge = () => {
    devEventBus.emit('dev:skipChallenge');
    showStatus('Skipped challenge!');
    onClose();
  };

  const handleRestartBoard = () => {
    devEventBus.emit('dev:restart');
    showStatus('Restarted 3D board!');
    onClose();
  };

  const handleToggleRoadblock = (legIndex = null) => {
    devEventBus.emit('dev:toggleRoadblock', { legIndex });
    showStatus('Toggled roadblock on route!');
    onClose();
  };

  const handleTestRoadblock = () => {
    devEventBus.emit('dev:testRoadblock');
    showStatus('Started the complete roadblock choice flow!');
    onClose();
  };

  const handleClearRoadblocks = () => {
    devEventBus.emit('dev:clearRoadblocks');
    showStatus('Cleared all roadblocks!');
    onClose();
  };

  // --- Handlers: Identity & Tools ---
  const handleRegenerateDeviceId = async () => {
    const newId = await regenerateDeviceId();
    setDeviceId(newId);
    showStatus('Generated new device ID!');
  };

  const clearStorage = async () => {
    await AsyncStorage.clear();
    const newId = await regenerateDeviceId();
    setDeviceId(newId);
    setConfirmingStorageClear(false);
    showStatus('AsyncStorage cleared!');
  };

  const handleClearStorage = () => {
    setConfirmingStorageClear(true);
  };

  const handleChangeCorner = (newCorner) => {
    setButtonCorner(newCorner);
    devEventBus.emit('dev:setButtonCorner', newCorner);
    showStatus(`Dev button moved to ${newCorner}`);
  };

  const currentRouteInfo = getCurrentRouteInfo();
  const currentRouteName = currentRouteInfo?.name || 'Unknown';
  const currentGameData = currentRouteInfo?.params?.gameData;
  const shouldUseAuthoredStops = Platform.OS === 'web'
    && (!currentGameData?.routeStops || currentRouteInfo?.params?.isDevGame);
  const activeRouteStops = shouldUseAuthoredStops && authoredRouteStops.length >= 2
      ? authoredRouteStops
      : resolveGameRouteStops(currentGameData || {});

  return (
    <View style={styles.fullscreenOverlay}>
      <TouchableOpacity
        style={styles.backdropTouch}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={[
        styles.modalCard,
        isLandscape && styles.modalCardLandscape,
        isCompact && styles.modalCardCompact,
      ]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>DEVELOPMENT TOOLS</Text>
              <Text style={styles.headerTitle}>Tipsy Traveller Lab</Text>
              <View style={styles.contextRow}>
                <View style={styles.contextChip}>
                  <Text style={styles.contextLabel}>SCREEN</Text>
                  <Text style={styles.contextValue} numberOfLines={1}>{currentRouteName}</Text>
                </View>
                {Boolean(gamePin) && (
                  <View style={styles.contextChip}>
                    <Text style={styles.contextLabel}>ROOM</Text>
                    <Text style={styles.contextValue}>{gamePin}</Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close Dev Portal"
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Status Banner */}
          {Boolean(statusMessage) && (
            <View style={styles.statusBanner}>
              <Text style={styles.statusBannerText}>{statusMessage}</Text>
            </View>
          )}

          {/* Tabs */}
          <View style={styles.tabBar} accessibilityRole="tablist">
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[styles.tabButton, activeTab === tab.id && styles.tabButtonActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === tab.id }}
                accessibilityLabel={`${tab.label} tools`}
              >
                <Text style={styles.tabIcon}>{tab.icon}</Text>
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === tab.id && styles.tabButtonTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Body */}
          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
          >
            {/* TAB 1: SCREENS */}
            {activeTab === 'screens' && (
              <View style={styles.section}>
                <Text style={styles.sectionHeading}>Instant Board Play (No Lobby)</Text>
                <Text style={styles.sectionDescription}>
                  Skip lobby and character selection entirely and test 3D board mechanics immediately.
                </Text>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.primaryButton]}
                    onPress={() => handleStartInstantGame(2)}
                    disabled={loadingAction === 'instantGame'}
                  >
                    <Text style={styles.actionButtonText}>🎮 GameScreen (2 Teams)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.primaryButton]}
                    onPress={() => handleStartInstantGame(3)}
                    disabled={loadingAction === 'instantGame'}
                  >
                    <Text style={styles.actionButtonText}>🎮 GameScreen (3 Teams)</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionHeading}>Vehicle Selection (Mock)</Text>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleStartCharacterSelection(2)}
                  >
                    <Text style={styles.actionButtonText}>🚗 Car Selection (2 Teams)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleStartCharacterSelection(3)}
                  >
                    <Text style={styles.actionButtonText}>🚗 Car Selection (3 Teams)</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionHeading}>Live Test Lobby (Firebase)</Text>
                <Text style={styles.sectionDescription}>
                  Provisions a real Firebase room with a bot in Team 2 and opens the Lobby.
                </Text>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.accentButton]}
                    onPress={() => handleStartLiveLobby('1-4')}
                    disabled={loadingAction === 'liveLobby'}
                  >
                    <Text style={styles.actionButtonText}>
                      {loadingAction === 'liveLobby' ? 'Creating...' : '📋 Live Lobby (2 Teams)'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.accentButton]}
                    onPress={() => handleStartLiveLobby('9-12')}
                    disabled={loadingAction === 'liveLobby'}
                  >
                    <Text style={styles.actionButtonText}>📋 Live Lobby (3 Teams)</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionHeading}>App Navigation</Text>
                <View style={styles.gridRow}>
                  <TouchableOpacity
                    style={styles.smallButton}
                    onPress={() => {
                      resetRoot([{ name: 'Home' }]);
                      onClose();
                    }}
                  >
                    <Text style={styles.smallButtonText}>🏠 Home</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.smallButton}
                    onPress={() => {
                      navigate('CreateGameScreen');
                      onClose();
                    }}
                  >
                    <Text style={styles.smallButtonText}>➕ Create</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.smallButton}
                    onPress={() => {
                      navigate('HostName', {
                        difficulty: 'medium',
                        duration: 'short',
                        nrOfPlayers: '1-4',
                      });
                      onClose();
                    }}
                  >
                    <Text style={styles.smallButtonText}>👤 HostName</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.smallButton}
                    onPress={() => {
                      navigate('JoinGameScreen');
                      onClose();
                    }}
                  >
                    <Text style={styles.smallButtonText}>🔑 Join</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.smallButton}
                    onPress={() => {
                      navigate('AccountScreen');
                      onClose();
                    }}
                  >
                    <Text style={styles.smallButtonText}>👤 Account</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.smallButton}
                    onPress={() => {
                      navigate('SettingsScreen');
                      onClose();
                    }}
                  >
                    <Text style={styles.smallButtonText}>⚙️ Settings</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* TAB 2: MULTIPLAYER & BOTS */}
            {activeTab === 'multiplayer' && (
              <View style={styles.section}>
                <Text style={styles.sectionHeading}>Target Game PIN</Text>
                <View style={styles.pinInputRow}>
                  <TextInput
                    style={styles.pinInput}
                    value={gamePin}
                    onChangeText={setGamePin}
                    placeholder="4-digit PIN (e.g. 1234)"
                    placeholderTextColor="#8892b0"
                    maxLength={10}
                  />
                  <TouchableOpacity
                    style={styles.pinDetectButton}
                    onPress={detectActiveGamePin}
                  >
                    <Text style={styles.pinDetectButtonText}>Detect</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionHeading}>1-Tap Multiplayer Solvers</Text>
                <TouchableOpacity
                  style={[styles.actionButton, styles.successButton]}
                  onPress={handleAutoFillLobby}
                  disabled={Boolean(loadingAction)}
                >
                  <Text style={styles.actionButtonText}>
                    ⚡ Auto-Fill Lobby (Add Required Leaders)
                  </Text>
                </TouchableOpacity>
                <Text style={styles.subtext}>
                  Adds missing leader bots so the host can press &quot;START GAME&quot; immediately.
                </Text>

                <TouchableOpacity
                  style={[styles.actionButton, styles.accentButton]}
                  onPress={handleReadyUpTeams}
                  disabled={Boolean(loadingAction)}
                >
                  <Text style={styles.actionButtonText}>
                    🚗 Auto-Pick Vehicles (Ready Up Teams)
                  </Text>
                </TouchableOpacity>
                <Text style={styles.subtext}>
                  Sets default vehicle models for all teams in Firebase so the game transitions to GameScreen.
                </Text>

                <Text style={styles.sectionHeading}>Add Bot To Specific Team</Text>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleAddBot(1)}
                    disabled={Boolean(loadingAction)}
                  >
                    <Text style={styles.actionButtonText}>+ Bot Team 1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleAddBot(2)}
                    disabled={Boolean(loadingAction)}
                  >
                    <Text style={styles.actionButtonText}>+ Bot Team 2</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleAddBot(3)}
                    disabled={Boolean(loadingAction)}
                  >
                    <Text style={styles.actionButtonText}>+ Bot Team 3</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionHeading}>Cleanup</Text>
                <TouchableOpacity
                  style={[styles.actionButton, styles.dangerButton]}
                  onPress={handleRemoveBots}
                  disabled={Boolean(loadingAction)}
                >
                  <Text style={styles.actionButtonText}>🧹 Remove Bot Players</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* TAB 3: BOARD & GAME TOOLS */}
            {activeTab === 'board' && (
              <View style={styles.section}>
                <Text style={styles.sectionHeading}>Force Roll (GameScreen)</Text>
                <Text style={styles.sectionDescription}>
                  Simulate throwing an exact dice value to test leg movement and landing.
                </Text>
                <View style={styles.diceRow}>
                  {[1, 2, 3].map((num) => (
                    <TouchableOpacity
                      key={num}
                      style={styles.diceButton}
                      onPress={() => handleForceRoll(num)}
                    >
                      <Text style={styles.diceButtonText}>{num}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionHeading}>GeoGuessr Place Duel</Text>
                <Text style={styles.sectionDescription}>
                  Test the head-to-head place guessing challenge on an interactive 2D map.
                </Text>
                <TouchableOpacity
                  style={[styles.actionButton, styles.accentButton]}
                  onPress={() => handleTestChallenge(1, 'geoGuessr')}
                >
                  <Text style={styles.actionButtonText}>🌍 Launch GeoGuessr Duel</Text>
                </TouchableOpacity>

                <Text style={styles.sectionHeading}>Drive To Country & Challenge</Text>
                <Text style={styles.sectionDescription}>
                  Drive active team to destination and open its country challenge.
                </Text>
                <TouchableOpacity
                  style={[styles.actionButton, styles.accentButton, { marginBottom: 10 }]}
                  onPress={handleSkipChallenge}
                >
                  <Text style={styles.actionButtonText}>⏭️ Skip Active Challenge</Text>
                </TouchableOpacity>
                <View style={styles.challengeGrid}>
                  {activeRouteStops.slice(1).map((stop, index) => {
                    const stopIndex = index + 1;
                    const challengeTitle = stop.challenges?.[0]?.title || 'No challenge yet';
                    return (
                    <TouchableOpacity
                      key={stop.id}
                      style={styles.challengeButton}
                      onPress={() => handleTestChallenge(stopIndex)}
                    >
                      <Text style={styles.challengeButtonText}>{stopIndex}: {stop.name} ({challengeTitle})</Text>
                    </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.sectionHeading}>🚧 Roadblock Obstacles</Text>
                <Text style={styles.sectionDescription}>
                  Test the full choice flow, or place the 3D obstacle by itself for visual checks.
                </Text>
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryButton]}
                  onPress={handleTestRoadblock}
                >
                  <Text style={styles.actionButtonText}>🧭 Test Roadblock Event</Text>
                </TouchableOpacity>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.accentButton]}
                    onPress={() => handleToggleRoadblock(null)}
                  >
                    <Text style={styles.actionButtonText}>🚧 Spawn / Toggle Roadblock</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.dangerButton]}
                    onPress={handleClearRoadblocks}
                  >
                    <Text style={styles.actionButtonText}>🧹 Clear Roadblocks</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionHeading}>Board Controls</Text>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.accentButton]}
                    onPress={handleSkipChallenge}
                  >
                    <Text style={styles.actionButtonText}>⏭️ Skip Challenge</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.primaryButton]}
                    onPress={handleRestartBoard}
                  >
                    <Text style={styles.actionButtonText}>🔄 Reset Board State</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {activeTab === 'countries' && Platform.OS === 'web' && (
              <CountryStopsTab onClose={onClose} />
            )}

            {/* TAB 4: IDENTITY & TOOLS */}
            {activeTab === 'tools' && (
              <View style={styles.section}>
                <Text style={styles.sectionHeading}>Local Device Identity</Text>
                <Text style={styles.sectionDescription}>
                  Stored in AsyncStorage. Used by Firebase to recognize host and team leaders.
                </Text>
                <View style={styles.codeBox}>
                  <Text style={styles.codeText} selectable>
                    {deviceId || 'Loading...'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.actionButton, styles.accentButton]}
                  onPress={handleRegenerateDeviceId}
                >
                  <Text style={styles.actionButtonText}>🔄 Regenerate Device ID</Text>
                </TouchableOpacity>
                <Text style={styles.subtext}>
                  Simulates opening the app on a fresh device without reinstalling.
                </Text>

                {confirmingStorageClear ? (
                  <View style={styles.confirmationPanel}>
                    <Text style={styles.confirmationTitle}>Clear local app data?</Text>
                    <Text style={styles.confirmationCopy}>
                      This resets the account, settings, device identity, and Dev Portal preferences on this device.
                    </Text>
                    <View style={styles.confirmationActions}>
                      <TouchableOpacity
                        style={[styles.smallButton, styles.confirmationButton]}
                        onPress={() => setConfirmingStorageClear(false)}
                      >
                        <Text style={styles.smallButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.smallButton, styles.dangerButton, styles.confirmationButton]}
                        onPress={clearStorage}
                      >
                        <Text style={styles.actionButtonText}>Clear data</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.dangerButton]}
                    onPress={handleClearStorage}
                  >
                    <Text style={styles.actionButtonText}>🗑️ Clear All AsyncStorage</Text>
                  </TouchableOpacity>
                )}

                <Text style={styles.sectionHeading}>Dev Button Position</Text>
                <Text style={styles.sectionDescription}>
                  Placed to the left of header/tour controls so all buttons stay accessible.
                </Text>
                <View style={styles.gridRow}>
                  {[
                    { id: 'top-right', label: 'Top-Right' },
                    { id: 'top-left', label: 'Top-Left' },
                    { id: 'bottom-right', label: 'Bottom-Right' },
                    { id: 'bottom-left', label: 'Bottom-Left' },
                  ].map((pos) => (
                    <TouchableOpacity
                      key={pos.id}
                      style={[
                        styles.smallButton,
                        buttonCorner === pos.id && styles.activeCornerButton,
                      ]}
                      onPress={() => handleChangeCorner(pos.id)}
                    >
                      <Text
                        style={[
                          styles.smallButtonText,
                          buttonCorner === pos.id && styles.activeCornerText,
                        ]}
                      >
                        {pos.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionHeading}>Environment Info</Text>
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>Platform: {Platform.OS}</Text>
                  <Text style={styles.infoText}>__DEV__: {String(__DEV__)}</Text>
                  <Text style={styles.infoText}>
                    EXPO_PUBLIC_ENABLE_DEV_PORTAL:{' '}
                    {String(
                      typeof process !== 'undefined' && process?.env
                        ? process.env.EXPO_PUBLIC_ENABLE_DEV_PORTAL
                        : 'unknown'
                    )}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreenOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    zIndex: 999999,
    elevation: 999999,
  },
  backdropTouch: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  modalCard: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '92%',
    backgroundColor: '#162330',
    borderWidth: 1,
    borderColor: '#3c4d5d',
    borderRadius: 18,
    overflow: 'hidden',
    zIndex: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  modalCardLandscape: {
    maxWidth: 820,
    maxHeight: '95%',
  },
  modalCardCompact: {
    maxHeight: '96%',
    borderRadius: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: '#101b25',
    borderBottomWidth: 1,
    borderBottomColor: '#2e4050',
  },
  headerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  eyebrow: {
    fontSize: 7,
    color: '#70d9d2',
    fontFamily: 'dogicapixelbold',
    letterSpacing: 1.2,
    marginBottom: 5,
  },
  headerTitle: {
    fontSize: 15,
    color: '#fff1cd',
    fontFamily: 'dogicapixelbold',
  },
  contextRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  contextChip: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 230,
    backgroundColor: '#1b2c3a',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#365064',
    paddingVertical: 5,
    paddingHorizontal: 9,
  },
  contextLabel: {
    color: '#7d91a2',
    fontFamily: 'dogicapixelbold',
    fontSize: 6,
    marginRight: 6,
  },
  contextValue: {
    flexShrink: 1,
    color: '#70d9d2',
    fontFamily: 'dogicapixelbold',
    fontSize: 7,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#213241',
    borderWidth: 1,
    borderColor: '#405363',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'dogicapixelbold',
  },
  statusBanner: {
    backgroundColor: '#123d3b',
    borderBottomWidth: 1,
    borderBottomColor: '#1ba39c',
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  statusBannerText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: 'dogicapixelbold',
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#101b25',
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabButton: {
    flex: 1,
    minWidth: 58,
    minHeight: 52,
    borderRadius: 9,
    paddingVertical: 7,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#26394a',
    borderWidth: 1,
    borderColor: '#ffd700',
  },
  tabIcon: {
    fontSize: 13,
    marginBottom: 4,
  },
  tabButtonText: {
    fontSize: 7,
    color: '#8892b0',
    fontFamily: 'dogicapixel',
  },
  tabButtonTextActive: {
    color: '#ffd700',
    fontFamily: 'dogicapixelbold',
  },
  scrollBody: {
    flexGrow: 1,
  },
  scrollContent: {
    padding: 18,
  },
  section: {
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 9.5,
    color: '#fff1cd',
    fontFamily: 'dogicapixelbold',
    marginTop: 14,
    marginBottom: 7,
  },
  sectionDescription: {
    fontSize: 8.5,
    color: '#a9b8c4',
    fontFamily: 'dogicapixel',
    marginBottom: 8,
    lineHeight: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#26394a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    marginBottom: 6,
  },
  primaryButton: {
    backgroundColor: '#1ba39c',
    borderColor: '#178c86',
  },
  accentButton: {
    backgroundColor: '#2f80ed',
    borderColor: '#2468c4',
  },
  successButton: {
    backgroundColor: '#27ae60',
    borderColor: '#1e8e4e',
  },
  dangerButton: {
    backgroundColor: '#c0392b',
    borderColor: '#962d22',
  },
  confirmationPanel: {
    backgroundColor: '#3b2425',
    borderWidth: 1,
    borderColor: '#a83a31',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  confirmationTitle: {
    color: '#fff1cd',
    fontFamily: 'dogicapixelbold',
    fontSize: 9,
    marginBottom: 6,
  },
  confirmationCopy: {
    color: '#e5bdba',
    fontFamily: 'dogicapixel',
    fontSize: 8,
    lineHeight: 13,
  },
  confirmationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  confirmationButton: {
    minWidth: 116,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 8.5,
    fontFamily: 'dogicapixelbold',
    textAlign: 'center',
  },
  smallButton: {
    minWidth: 104,
    minHeight: 40,
    backgroundColor: '#26394a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 9,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  activeCornerButton: {
    backgroundColor: '#ffd700',
    borderColor: '#ffffff',
  },
  smallButtonText: {
    color: '#fff',
    fontSize: 8.5,
    fontFamily: 'dogicapixel',
  },
  activeCornerText: {
    color: '#1a2530',
    fontFamily: 'dogicapixelbold',
  },
  subtext: {
    fontSize: 8,
    color: '#8da0af',
    fontFamily: 'dogicapixel',
    marginBottom: 8,
    marginLeft: 2,
    lineHeight: 13,
  },
  pinInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  pinInput: {
    flex: 1,
    height: 38,
    backgroundColor: '#131c24',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
    borderRadius: 6,
    color: '#ffd700',
    paddingHorizontal: 12,
    fontSize: 10,
    fontFamily: 'dogicapixelbold',
  },
  pinDetectButton: {
    backgroundColor: '#273646',
    borderWidth: 1,
    borderColor: '#ffd700',
    borderRadius: 6,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinDetectButtonText: {
    color: '#ffd700',
    fontSize: 8.5,
    fontFamily: 'dogicapixelbold',
  },
  diceRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  diceButton: {
    flex: 1,
    height: 42,
    backgroundColor: '#fff1cd',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2c3e50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  diceButtonText: {
    color: '#2c3e50',
    fontSize: 14,
    fontFamily: 'dogicapixelbold',
  },
  challengeGrid: {
    gap: 6,
    marginBottom: 12,
  },
  challengeButton: {
    backgroundColor: '#243241',
    borderLeftWidth: 4,
    borderLeftColor: '#ffd700',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  challengeButtonText: {
    color: '#edf2f7',
    fontSize: 8,
    fontFamily: 'dogicapixel',
  },
  codeBox: {
    backgroundColor: '#131c24',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
  },
  codeText: {
    color: '#1ba39c',
    fontSize: 8,
    fontFamily: 'dogicapixel',
  },
  infoBox: {
    backgroundColor: '#131c24',
    padding: 10,
    borderRadius: 6,
    gap: 4,
  },
  infoText: {
    color: '#a0aec0',
    fontSize: 7.5,
    fontFamily: 'dogicapixel',
  },
});
