import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { onValue, ref, runTransaction, set } from 'firebase/database';
import { Canvas, useFrame } from '@react-three/fiber/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../../firebaseConfig';
import Header from '../shared/components/Header/Header';
import { AndroidSafeView } from '../shared/styles/SafeAreaView/SafeAreaView';
import VehicleModel from '../GameScreen/components/VehicleModel';
import { GAME_PIECES } from '../GameScreen/constants/gamePieces';
import { MODEL_OPTIONS } from '../GameScreen/constants/modelOptions';

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
  const hasNavigatedRef = useRef(false);
  const selectedModel = MODEL_OPTIONS[selectedModelIndex];
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

    runTransaction(ref(db, `games/${gameID}/status`), (currentStatus) => (
      currentStatus === 'characterSelection' ? 'game' : currentStatus
    )).catch((error) => {
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
    } finally {
      setIsSaving(false);
    }
  };

  const choiceIsSaved = confirmedModelId === selectedModel.id;

  return (
    <SafeAreaView style={[styles.mainContainer, AndroidSafeView.AndroidSafeView]}>
      <Header showBackButton navigation={navigation} />

      <View style={styles.titleContainer}>
        <Text style={styles.title}>
          {isTeamLeader && playerTeam
            ? `${getTeamLabel(playerTeam)} GARAGE`
            : 'VEHICLE SELECTION'}
        </Text>
        <Text style={styles.subtitle}>
          {readyTeamCount} / {requiredTeamKeys.length} TEAMS READY
        </Text>
      </View>

      <View style={styles.readinessContainer}>
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

      <View style={styles.lowerContainer}>
        {isTeamLeader ? (
          <>
            <View style={styles.modelPreview}>
              <Canvas camera={{ position: [0, 0.45, 3.1], fov: 38 }}>
                <ambientLight intensity={1.6} />
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
              <TouchableOpacity onPress={handlePreviousModel} style={styles.arrowButton}>
                <Text style={styles.arrowText}>{'<'}</Text>
              </TouchableOpacity>
              <View style={styles.modelNameContainer}>
                <Text style={styles.modelName}>{selectedModel.label}</Text>
                <Text style={styles.modelCount}>
                  {selectedModelIndex + 1} / {MODEL_OPTIONS.length}
                </Text>
              </View>
              <TouchableOpacity onPress={handleNextModel} style={styles.arrowButton}>
                <Text style={styles.arrowText}>{'>'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
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
          </>
        ) : (
          <View style={styles.waitingContainer}>
            <Text style={styles.waitingText}>
              Your team leader is choosing a vehicle. The game starts when every team is ready.
            </Text>
          </View>
        )}
      </View>
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
  titleContainer: {
    width: '92%',
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#2C3E50',
    fontFamily: 'dogicapixelbold',
    fontSize: 14,
    lineHeight: 20,
  },
  subtitle: {
    color: '#7A7468',
    fontFamily: 'dogicapixel',
    fontSize: 9,
  },
  readinessContainer: {
    width: '92%',
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  readinessPill: {
    minHeight: 30,
    paddingHorizontal: 9,
    borderRadius: 15,
    backgroundColor: '#FFF1CD',
    borderWidth: 1,
    borderColor: '#D8CFB9',
    flexDirection: 'row',
    alignItems: 'center',
  },
  readinessPillReady: {
    borderColor: '#1BA39C',
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
    flex: 1,
    width: '92%',
    alignItems: 'center',
    paddingBottom: 10,
  },
  modelPreview: {
    width: '100%',
    height: 190,
    marginVertical: 8,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#223144',
  },
  selectorContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  arrowButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#1BA39C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    color: '#FFFFFF',
    fontSize: 20,
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
    fontSize: 13,
    fontFamily: 'dogicapixelbold',
  },
  modelCount: {
    color: '#7A7468',
    marginTop: 4,
    fontSize: 9,
    fontFamily: 'dogicapixel',
  },
  confirmButton: {
    width: '100%',
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#D71920',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#1BA39C',
  },
  confirmText: {
    color: '#FFFFFF',
    fontFamily: 'dogicapixelbold',
    fontSize: 10,
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  waitingText: {
    color: '#2C3E50',
    textAlign: 'center',
    fontFamily: 'dogicapixel',
    fontSize: 12,
    lineHeight: 20,
  },
});
