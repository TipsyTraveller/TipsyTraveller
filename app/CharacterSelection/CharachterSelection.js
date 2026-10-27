import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { onValue, ref, runTransaction, set } from 'firebase/database';
import { Canvas, useFrame } from '@react-three/fiber/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../../firebaseConfig';
import Header from '../shared/components/Header/Header';
import VehicleModel from '../GameScreen/components/VehicleModel';
import { preloadBoardAssets } from '../GameScreen/constants/boardAssets';
import { GAME_PIECES } from '../GameScreen/constants/gamePieces';
import { MODEL_OPTIONS } from '../GameScreen/constants/modelOptions';
import { createInitialGameplay } from '../GameScreen/gameplayState';
import { getLobbyReadiness } from '../Lobby/lobbyState';

const getRequiredTeamKeys = (gameData) => (
  gameData?.nrOfPlayers === '9-12'
    ? ['team1', 'team2', 'team3']
    : ['team1', 'team2']
);

const getTeamLabel = (teamKey) => (
  GAME_PIECES.find((team) => team.id === teamKey)?.label || teamKey
);

const getTeamColor = (teamKey) => (
  GAME_PIECES.find((team) => team.id === teamKey)?.color || '#d71920'
);

export default function CharacterSelection({ navigation, route }) {
  const { gameID, gameData: initialGameData, teamMembers } = route.params;
  const [liveGameData, setLiveGameData] = useState(initialGameData || {});
  const [isTeamLeader, setIsTeamLeader] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [playerTeam, setPlayerTeam] = useState(null);
  const [selectedModelIndex, setSelectedModelIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const { height } = useWindowDimensions();
  const hasNavigatedRef = useRef(false);
  const initialGameplayRef = useRef(null);
  const selectedModel = MODEL_OPTIONS[selectedModelIndex];

  useEffect(() => {
    preloadBoardAssets();
  }, []);

  const requiredTeamKeys = useMemo(
    () => getRequiredTeamKeys(liveGameData),
    [liveGameData?.nrOfPlayers]
  );
  const allTeamsReady = requiredTeamKeys.every(
    (teamKey) => Boolean(liveGameData?.teamModels?.[teamKey])
  );
  const readyTeamCount = requiredTeamKeys.filter(
    (teamKey) => Boolean(liveGameData?.teamModels?.[teamKey])
  ).length;
  const confirmedModelId = playerTeam
    ? liveGameData?.teamModels?.[playerTeam]
    : null;

  useEffect(() => {
    const identifyPlayer = async () => {
      const deviceID = await AsyncStorage.getItem('deviceID');
      if (!deviceID) return;

      let foundTeamKey = null;
      let foundTeamLeader = false;

      requiredTeamKeys.forEach((teamKey) => {
        const team = teamMembers?.[teamKey];
        if (!team || typeof team !== 'object') return;

        Object.values(team).forEach((player) => {
          if (player.deviceID === deviceID) {
            foundTeamKey = teamKey;
            foundTeamLeader = Boolean(player.isLeader);
          }
        });
      });

      setPlayerTeam(foundTeamKey);
      setIsTeamLeader(foundTeamLeader);
      setIsHost(liveGameData?.hostDeviceID === deviceID);
    };

    identifyPlayer();
  }, [liveGameData?.hostDeviceID, requiredTeamKeys, teamMembers]);

  useEffect(() => {
    const gameRef = ref(db, `games/${gameID}`);
    const unsubscribe = onValue(gameRef, (snapshot) => {
      if (!snapshot.exists()) return;

      const nextGameData = snapshot.val();
      setLiveGameData(nextGameData);

      if (nextGameData.status === 'game' && !hasNavigatedRef.current) {
        hasNavigatedRef.current = true;
        navigation.replace('GameScreen', {
          gameID,
          gameData: nextGameData,
          teamMembers,
        });
      }
    });

    return unsubscribe;
  }, [gameID, navigation, teamMembers]);

  useEffect(() => {
    if (!playerTeam || !confirmedModelId) return;

    const confirmedIndex = MODEL_OPTIONS.findIndex(
      (model) => model.id === confirmedModelId
    );
    if (confirmedIndex >= 0) setSelectedModelIndex(confirmedIndex);
  }, [confirmedModelId, playerTeam]);

  useEffect(() => {
    if (!isHost || !allTeamsReady || liveGameData?.status !== 'characterSelection') {
      return;
    }

    const startedAt = Date.now();
    runTransaction(ref(db), (root) => {
      const currentGame = root?.games?.[gameID];
      if (!currentGame || currentGame.status !== 'characterSelection') return undefined;
      const currentPlayers = root?.players?.[gameID] || {};
      const readiness = getLobbyReadiness(
        currentGame,
        currentPlayers,
        { requireVehicles: true }
      );
      if (!readiness.isReady) return undefined;

      if (!initialGameplayRef.current) {
        initialGameplayRef.current = createInitialGameplay(currentGame, startedAt, currentPlayers);
      }

      return {
        ...root,
        games: {
          ...(root.games || {}),
          [gameID]: {
            ...currentGame,
            gameplay: initialGameplayRef.current,
            status: 'game',
          },
        },
      };
    }).catch((error) => {
      console.log('Unable to start game after vehicle selection', error);
    });
  }, [allTeamsReady, gameID, isHost, liveGameData?.status]);

  const handlePreviousModel = () => {
    setSelectedModelIndex((previousIndex) => (
      previousIndex === 0 ? MODEL_OPTIONS.length - 1 : previousIndex - 1
    ));
  };

  const handleNextModel = () => {
    setSelectedModelIndex((previousIndex) => (
      previousIndex === MODEL_OPTIONS.length - 1 ? 0 : previousIndex + 1
    ));
  };

  const handleConfirm = async () => {
    if (!playerTeam || isSaving) return;

    setIsSaving(true);
    try {
      await set(
        ref(db, `games/${gameID}/teamModels/${playerTeam}`),
        selectedModel.id
      );
    } catch (error) {
      console.log('Unable to save vehicle selection', error);
      Alert.alert('Could not save vehicle', 'Check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const choiceIsSaved = confirmedModelId === selectedModel.id;

  return (
    <SafeAreaView style={styles.mainContainer}>
      <Header showBackButton navigation={navigation} />

      <ScrollView
        contentContainerStyle={styles.content}
        bounces={false}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <View style={styles.titleContainer}>
          <Text style={styles.title}>SELECT VEHICLE</Text>
          <Text style={styles.subtitle}>
            {isTeamLeader && playerTeam
              ? `${getTeamLabel(playerTeam).toUpperCase()} GARAGE`
              : 'YOUR TEAM LEADER IS PICKING'}
          </Text>
        </View>

        <View style={styles.readinessContainer}>
          <Text style={styles.readinessLabel}>
            {readyTeamCount} / {requiredTeamKeys.length} TEAMS READY
          </Text>
          <View style={styles.readinessTeams}>
            {requiredTeamKeys.map((teamKey) => {
              const modelId = liveGameData?.teamModels?.[teamKey];
              const model = MODEL_OPTIONS.find((option) => option.id === modelId);
              return (
                <View
                  key={teamKey}
                  style={[
                    styles.readinessPill,
                    model && styles.readinessPillReady,
                  ]}
                >
                  <View
                    style={[styles.teamDot, { backgroundColor: getTeamColor(teamKey) }]}
                  />
                  <Text style={styles.readinessTeam}>{getTeamLabel(teamKey)}</Text>
                  <Text style={model ? styles.readyText : styles.choosingText}>
                    {model ? 'READY' : 'PICKING'}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.lowerContainer}>
          {isTeamLeader ? (
            <View style={styles.selectionCard}>
              <View style={[styles.modelPreview, { height: Math.max(150, Math.min(230, height * 0.3)) }]}>
                <Canvas camera={{ position: [0, 0.45, 3.1], fov: 38 }}>
                  <ambientLight intensity={1.8} />
                  <hemisphereLight args={['#fff7df', '#223144', 1.4]} />
                  <directionalLight position={[3, 4, 4]} intensity={2.2} />
                  <Suspense fallback={null}>
                    <RotatingVehiclePreview
                      color={getTeamColor(playerTeam)}
                      model={selectedModel}
                    />
                  </Suspense>
                </Canvas>
              </View>

              <View style={styles.selectorContainer}>
                <TouchableOpacity
                  accessibilityLabel="Previous vehicle"
                  accessibilityRole="button"
                  onPress={handlePreviousModel}
                  style={styles.arrowButton}
                >
                  <Text style={styles.arrowText}>{'‹'}</Text>
                </TouchableOpacity>
                <View style={styles.modelNameContainer}>
                  <Text style={styles.modelName}>{selectedModel.label}</Text>
                  <Text style={styles.modelCount}>
                    RIDE {selectedModelIndex + 1} OF {MODEL_OPTIONS.length}
                  </Text>
                </View>
                <TouchableOpacity
                  accessibilityLabel="Next vehicle"
                  accessibilityRole="button"
                  onPress={handleNextModel}
                  style={styles.arrowButton}
                >
                  <Text style={styles.arrowText}>{'›'}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                disabled={choiceIsSaved || isSaving}
                onPress={handleConfirm}
                style={[
                  styles.confirmButton,
                  (choiceIsSaved || isSaving) && styles.confirmButtonDisabled,
                ]}
              >
                <Text style={styles.confirmText}>
                  {isSaving ? 'SAVING...' : choiceIsSaved ? 'RIDE SELECTED' : 'SELECT THIS RIDE'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.waitingContainer}>
              <Text style={styles.waitingTitle}>HANG TIGHT!</Text>
              <Text style={styles.waitingText}>
                Your team leader is choosing a vehicle. The game starts when every team is ready.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RotatingVehiclePreview({ color, model }) {
  const groupRef = useRef();

  useFrame((state, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.7;
  });

  return (
    <group ref={groupRef}>
      <VehicleModel color={color} mode="preview" model={model} />
    </group>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FAF3E0',
    alignItems: 'center',
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    // paddingBottom: 20,
  },
  scroll: {
    width: '100%',
  },
  titleContainer: {
    width: '90%',
    maxWidth: 620,
    marginTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2C3E50',
  },
  title: {
    color: '#2C3E50',
    fontFamily: 'dogicapixel',
    fontSize: 18,
    lineHeight: 24,
  },
  subtitle: {
    color: '#7A7468',
    fontFamily: 'dogicapixel',
    fontSize: 9,
    marginTop: 6,
  },
  readinessContainer: {
    width: '90%',
    maxWidth: 620,
    marginTop: 12,
  },
  readinessLabel: {
    color: '#2C3E50',
    fontFamily: 'dogicapixelbold',
    fontSize: 9,
    marginBottom: 8,
  },
  readinessTeams: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  readinessPill: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E6DDC8',
    flexDirection: 'row',
    alignItems: 'center',
  },
  readinessPillReady: {
    borderColor: '#1BA39C',
    backgroundColor: '#E6F6F3',
  },
  teamDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  readinessTeam: {
    color: '#2C3E50',
    fontFamily: 'dogicapixelbold',
    fontSize: 9,
    marginRight: 8,
  },
  readyText: {
    color: '#1BA39C',
    fontFamily: 'dogicapixelbold',
    fontSize: 8,
  },
  choosingText: {
    color: '#7A7468',
    fontFamily: 'dogicapixel',
    fontSize: 8,
  },
  lowerContainer: {
    width: '90%',
    maxWidth: 620,
    alignItems: 'center',
    marginTop: 14,
  },
  selectionCard: {
    width: '100%',
    padding: 12,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
  },
  modelPreview: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: '#FFF1CD',
  },
  selectorContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  arrowButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF1CD',
    borderWidth: 3,
    borderColor: '#2C3E50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    color: '#2C3E50',
    fontSize: 30,
    lineHeight: 32,
    fontFamily: 'dogicapixelbold',
  },
  modelNameContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  modelName: {
    color: '#2C3E50',
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'dogicapixelbold',
    textTransform: 'uppercase',
  },
  modelCount: {
    color: '#7A7468',
    marginTop: 4,
    fontSize: 9,
    fontFamily: 'dogicapixel',
  },
  confirmButton: {
    width: '100%',
    minHeight: 58,
    borderRadius: 16,
    backgroundColor: '#1BA39C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.55,
  },
  confirmText: {
    color: '#2C3E50',
    fontFamily: 'dogicapixelbold',
    fontSize: 12,
  },
  waitingContainer: {
    width: '100%',
    minHeight: 210,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 30,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
  },
  waitingTitle: {
    color: '#1BA39C',
    textAlign: 'center',
    fontFamily: 'dogicapixelbold',
    fontSize: 18,
    marginBottom: 16,
  },
  waitingText: {
    color: '#2C3E50',
    textAlign: 'center',
    fontFamily: 'dogicapixel',
    fontSize: 12,
    lineHeight: 20,
  },
});
