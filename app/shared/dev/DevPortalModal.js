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

const TABS = [
  { id: 'screens', label: '🚀 Screens' },
  { id: 'multiplayer', label: '👥 Bots' },
  { id: 'board', label: '🎲 Board' },
  { id: 'tools', label: '⚙️ Identity' },
];

export default function DevPortalModal({ visible, onClose }) {
  const [activeTab, setActiveTab] = useState('screens');
  const [gamePin, setGamePin] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [loadingAction, setLoadingAction] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  useEffect(() => {
    if (visible) {
      loadDeviceId();
      detectActiveGamePin();
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

  const handleTestChallenge = (stopIndex) => {
    devEventBus.emit('dev:testChallenge', { stopIndex });
    showStatus(`Opened challenge for stop ${stopIndex}`);
    onClose();
  };

  const handleRestartBoard = () => {
    devEventBus.emit('dev:restart');
    showStatus('Restarted 3D board!');
    onClose();
  };

  // --- Handlers: Identity & Tools ---
  const handleRegenerateDeviceId = async () => {
    const newId = await regenerateDeviceId();
    setDeviceId(newId);
    showStatus('Generated new device ID!');
  };

  const handleClearStorage = async () => {
    await AsyncStorage.clear();
    const newId = await regenerateDeviceId();
    setDeviceId(newId);
    showStatus('AsyncStorage cleared!');
  };

  const currentRouteName = getCurrentRouteInfo()?.name || 'Unknown';

  return (
    <View style={styles.fullscreenOverlay}>
      <TouchableOpacity
        style={styles.backdropTouch}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={[styles.modalCard, isLandscape && styles.modalCardLandscape]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>🛠️ DEV PORTAL</Text>
              <Text style={styles.headerSubtitle}>
                Screen: <Text style={styles.highlightText}>{currentRouteName}</Text>
                {gamePin ? `  |  Room: ${gamePin}` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
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
          <View style={styles.tabBar}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[styles.tabButton, activeTab === tab.id && styles.tabButtonActive]}
              >
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
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <TouchableOpacity
                      key={num}
                      style={styles.diceButton}
                      onPress={() => handleForceRoll(num)}
                    >
                      <Text style={styles.diceButtonText}>{num}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionHeading}>Test Challenge Cards</Text>
                <Text style={styles.sectionDescription}>
                  Instantly open country challenges to preview layout and typography.
                </Text>
                <View style={styles.challengeGrid}>
                  {[
                    { stop: 1, name: '1: Paris (Charades)' },
                    { stop: 2, name: '2: Madrid (Tapas)' },
                    { stop: 3, name: '3: Lisbon (Fado)' },
                    { stop: 4, name: '4: Seville (Flamenco)' },
                    { stop: 5, name: '5: Rome (Pasta)' },
                    { stop: 6, name: '6: Berlin (Autobahn)' },
                    { stop: 7, name: '7: Brussels (Toast)' },
                  ].map((c) => (
                    <TouchableOpacity
                      key={c.stop}
                      style={styles.challengeButton}
                      onPress={() => handleTestChallenge(c.stop)}
                    >
                      <Text style={styles.challengeButtonText}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionHeading}>Board Controls</Text>
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryButton]}
                  onPress={handleRestartBoard}
                >
                  <Text style={styles.actionButtonText}>🔄 Reset Board State</Text>
                </TouchableOpacity>
              </View>
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

                <TouchableOpacity
                  style={[styles.actionButton, styles.dangerButton]}
                  onPress={handleClearStorage}
                >
                  <Text style={styles.actionButtonText}>🗑️ Clear All AsyncStorage</Text>
                </TouchableOpacity>

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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    zIndex: 999999,
    elevation: 999999,
  },
  backdropTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '92%',
    backgroundColor: '#1a2530',
    borderWidth: 2,
    borderColor: '#ffd700',
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  modalCardLandscape: {
    maxWidth: 680,
    maxHeight: '95%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#131c24',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.3)',
  },
  headerTitle: {
    fontSize: 13,
    color: '#ffd700',
    fontFamily: 'dogicapixelbold',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 9,
    color: '#8892b0',
    fontFamily: 'dogicapixel',
    marginTop: 4,
  },
  highlightText: {
    color: '#1ba39c',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'dogicapixelbold',
  },
  statusBanner: {
    backgroundColor: '#1ba39c',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  statusBannerText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: 'dogicapixelbold',
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#16202a',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    borderBottomWidth: 3,
    borderBottomColor: '#ffd700',
    backgroundColor: '#1f2c3a',
  },
  tabButtonText: {
    fontSize: 9,
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
    padding: 16,
  },
  section: {
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 10,
    color: '#ffd700',
    fontFamily: 'dogicapixelbold',
    marginTop: 12,
    marginBottom: 6,
  },
  sectionDescription: {
    fontSize: 8,
    color: '#a0aec0',
    fontFamily: 'dogicapixel',
    marginBottom: 8,
    lineHeight: 12,
  },
  buttonRow: {
    flexDirection: 'row',
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
    backgroundColor: '#273646',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
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
  actionButtonText: {
    color: '#ffffff',
    fontSize: 8.5,
    fontFamily: 'dogicapixelbold',
    textAlign: 'center',
  },
  smallButton: {
    backgroundColor: '#273646',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  smallButtonText: {
    color: '#fff',
    fontSize: 8.5,
    fontFamily: 'dogicapixel',
  },
  subtext: {
    fontSize: 7.5,
    color: '#718096',
    fontFamily: 'dogicapixel',
    marginBottom: 8,
    marginLeft: 2,
    lineHeight: 11,
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
