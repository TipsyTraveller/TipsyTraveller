import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { off, onValue, push, ref } from 'firebase/database';
import { db } from '../../firebaseConfig';
import TeamContainer from './components/TeamContainer';
import LowerButtonContainer from '../shared/components/LowerButtonContainer/LowerButtonContainer';
import InputField from '../shared/components/InputField/InputField';
import BackButton from '../shared/components/BackButton/BackButton';
import {
  chooseTeamForJoin, countPlayers, getLobbyReadiness, getRequiredTeamKeys,
  getTeamEntries, PLAYER_CAPACITY,
} from './lobbyState';
import { mutateLobbyRoster, startCharacterSelection } from './lobbyService';
import { saveActiveGameId } from '../shared/storage/userSettings';

const asTeamObject = (players, teamKey) => Object.fromEntries(getTeamEntries(players, teamKey));

export default function Lobby({ navigation, route }) {
  const { gameID, gameSettings } = route.params;
  const [gameData, setGameData] = useState(gameSettings || route.params || {});
  const [teamMembers, setTeamMembers] = useState();
  const [localDeviceID, setLocalDeviceID] = useState(null);
  const [userName, setUserName] = useState('');
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [pendingRosterAction, setPendingRosterAction] = useState(null);

  const host = Boolean(localDeviceID && gameData?.hostDeviceID === localDeviceID);
  const readiness = useMemo(
    () => getLobbyReadiness(gameData, teamMembers),
    [gameData, teamMembers]
  );
  const requiredTeamKeys = getRequiredTeamKeys(gameData);
  const roomIsFull = readiness.capacity && readiness.playerCount >= readiness.capacity;

  useEffect(() => {
    AsyncStorage.getItem('deviceID').then(setLocalDeviceID);
    saveActiveGameId(gameID);
  }, [gameID]);

  useEffect(() => {
    const playersRef = ref(db, `players/${gameID}`);
    onValue(playersRef, (snapshot) => {
      if (snapshot.exists()) {
        setTeamMembers(snapshot.val());
      } else {
        Alert.alert('Room unavailable', 'This game has been deleted.');
        navigation.navigate('Home', {});
      }
    });
    return () => off(playersRef);
  }, [gameID, navigation]);

  useEffect(() => {
    const gameRef = ref(db, `games/${gameID}`);
    onValue(gameRef, (snapshot) => {
      if (snapshot.exists()) setGameData(snapshot.val());
    });
    return () => off(gameRef);
  }, [gameID]);

  useEffect(() => {
    if (!teamMembers || !navigation.isFocused()) return;
    if (gameData?.status === 'characterSelection') {
      navigation.navigate('CharacterSelection', { gameID, gameData, teamMembers });
    } else if (gameData?.status === 'game' && gameData?.gameplay) {
      navigation.replace('GameScreen', { gameID, gameData, teamMembers });
    }
  }, [gameData, gameID, navigation, teamMembers]);

  const runRosterAction = async (actionKey, mutate) => {
    if (!host || pendingRosterAction) return false;
    setPendingRosterAction(actionKey);
    try {
      const result = await mutateLobbyRoster({
        gameID,
        hostDeviceID: localDeviceID,
        mutate,
      });
      if (!result.ok) Alert.alert('Could not update roster', result.message);
      return result.ok;
    } catch (error) {
      console.log('Unable to update lobby roster', error);
      Alert.alert('Could not update roster', 'Check your connection and try again.');
      return false;
    } finally {
      setPendingRosterAction(null);
    }
  };

  const handleAddPlayer = async () => {
    const trimmedName = userName.trim();
    if (!trimmedName || isAddingPlayer || roomIsFull) return;
    Keyboard.dismiss();
    setIsAddingPlayer(true);
    const playerId = push(ref(db, `players/${gameID}/team1`)).key;
    try {
      const added = await runRosterAction(`add:${playerId}`, ({ game, players }) => {
        const capacity = PLAYER_CAPACITY[game.nrOfPlayers];
        if (!capacity || countPlayers(players) >= capacity) {
          return { error: { code: 'full', message: 'This room is full.' } };
        }
        const teamKey = chooseTeamForJoin(game, players);
        const team = asTeamObject(players, teamKey);
        return {
          players: {
            ...players,
            [teamKey]: { ...team, [playerId]: { name: trimmedName, isLeader: false } },
          },
        };
      });
      if (added) setUserName('');
    } finally {
      setIsAddingPlayer(false);
    }
  };

    const handleRules = () => {
        Alert.alert(
            "How to play",
            "Use one phone per team; that phone stays with the team leader. When your team is called, roll the die, move, and complete the country challenge. Pass the phone when a challenge names a player. Roadblocks make a leading team beat a hard challenge or take a detour. Progress, challenges, and finishing position earn points. If a phone disconnects, rejoin with the same device to restore the current turn."
        );
    };

  const handleRemovePlayer = (teamKey, playerId, player) => {
    if (player.isLeader) {
      Alert.alert('Assign another leader first', 'Team leaders cannot be removed.');
      return;
    }
    runRosterAction(`remove:${playerId}`, ({ players }) => {
      const team = asTeamObject(players, teamKey);
      if (!team[playerId] || team[playerId].isLeader) {
        return { error: { code: 'changed', message: 'That player can no longer be removed.' } };
      }
      delete team[playerId];
      return { players: { ...players, [teamKey]: Object.keys(team).length ? team : '' } };
    });
  };

  const handleMovePlayer = (sourceTeamKey, destinationTeamKey, playerId) => {
    runRosterAction(`move:${playerId}`, ({ game, players }) => {
      if (!getRequiredTeamKeys(game).includes(destinationTeamKey)) {
        return { error: { code: 'invalid_team', message: 'That team is not used in this game.' } };
      }
      const source = asTeamObject(players, sourceTeamKey);
      const destination = asTeamObject(players, destinationTeamKey);
      const player = source[playerId];
      if (!player) {
        return { error: { code: 'changed', message: 'That player has already moved.' } };
      }
      delete source[playerId];
      const destinationHasLeader = Object.values(destination)
        .some((member) => member?.isLeader);
      destination[playerId] = {
        ...player,
        isLeader: Boolean(player.isLeader && player.deviceID && !destinationHasLeader),
      };
      return {
        players: {
          ...players,
          [sourceTeamKey]: Object.keys(source).length ? source : '',
          [destinationTeamKey]: destination,
        },
      };
    });
  };

  const handleAssignLeader = (teamKey, playerId) => {
    runRosterAction(`leader:${playerId}`, ({ players }) => {
      const team = asTeamObject(players, teamKey);
      if (!team[playerId]?.deviceID) {
        return {
          error: {
            code: 'no_device',
            message: 'Only a player who joined on a phone can control the team.',
          },
        };
      }
      const nextTeam = Object.fromEntries(Object.entries(team).map(([id, player]) => [
        id,
        { ...player, isLeader: id === playerId },
      ]));
      return { players: { ...players, [teamKey]: nextTeam } };
    });
  };

  const handleBack = () => {
    if (!host) {
      navigation.goBack();
      return;
    }
    navigation.push('CreateGameScreen', {
      editingGameID: gameID,
      gameSettings: {
        difficulty: gameData?.difficulty || '',
        duration: gameData?.duration || '',
        nrOfPlayers: gameData?.nrOfPlayers || '',
        persons: gameData?.persons || {},
      },
    });
  };

  const handleNextButton = async () => {
    if (!host || !readiness.isReady || isStarting) return;
    setIsStarting(true);
    try {
      const result = await startCharacterSelection({ gameID, hostDeviceID: localDeviceID });
      if (!result.ok) Alert.alert('Lobby is not ready', result.message);
    } catch (error) {
      console.log('Unable to start game', error);
      Alert.alert('Could not start game', 'Check your connection and try again.');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <SafeAreaView style={styles.mainContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.upperContainer}>
          <BackButton navigation={navigation} onPress={handleBack} />
          <View style={styles.gamePinContainer}>
            <Text style={styles.gamePinText}>GAME ID</Text>
            <Text style={styles.gamePinText}>{gameID}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.teamScroll}
          contentContainerStyle={styles.teamContainerWrapper}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {requiredTeamKeys.map((teamKey, index) => (
            <TeamContainer
              key={teamKey}
              team={teamMembers?.[teamKey]}
              teamKey={teamKey}
              index={index + 1}
              requiredTeamKeys={requiredTeamKeys}
              onRemovePlayer={handleRemovePlayer}
              onMovePlayer={handleMovePlayer}
              onAssignLeader={handleAssignLeader}
              canManage={host && !pendingRosterAction}
            />
          ))}
        </ScrollView>

        {host && (
          <View style={styles.addPlayerSection}>
            <Text style={styles.addPlayerLabel}>
              ADD PLAYER · {readiness.playerCount}/{readiness.capacity || '?'}
            </Text>
            <View style={styles.inputContainer}>
              <InputField
                placeholder={roomIsFull ? 'ROOM FULL' : 'PLAYER NAME'}
                value={userName}
                setValue={setUserName}
                accessibilityLabel="Local player name"
                containerStyle={styles.inputField}
                inputStyle={styles.inputFieldText}
                onSubmitEditing={handleAddPlayer}
              />
              <Pressable
                accessibilityLabel="Add player"
                accessibilityRole="button"
                accessibilityState={{ disabled: !userName.trim() || isAddingPlayer || roomIsFull }}
                disabled={!userName.trim() || isAddingPlayer || roomIsFull}
                onPress={handleAddPlayer}
                style={({ pressed }) => [
                  styles.addButton,
                  (!userName.trim() || isAddingPlayer || roomIsFull) && styles.addButtonDisabled,
                  pressed && styles.addButtonPressed,
                ]}
              >
                <Text style={styles.addButtonText}>{isAddingPlayer ? 'ADDING' : 'ADD'}</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={[styles.readinessBanner, readiness.isReady && styles.readinessBannerReady]}>
          <Text style={styles.readinessTitle}>
            {readiness.isReady ? 'LOBBY READY' : 'NOT READY'}
          </Text>
          <Text style={styles.readinessText}>
            {readiness.isReady
              ? 'Continue so each team leader can select a vehicle.'
              : readiness.reason || 'Loading roster…'}
          </Text>
        </View>

        <LowerButtonContainer
          LeftButtonVisible
          LeftButtonCopy="RULES"
          handleLeftButton={handleRules}
          RightButtonCopy={isStarting ? 'STARTING' : host ? 'START' : 'WAITING'}
          handleRightButton={handleNextButton}
          RightButtonDisabled={!host || !readiness.isReady || isStarting}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    backgroundColor: '#FAF3E0', flex: 1, alignItems: 'center', paddingHorizontal: 20,
  },
  keyboardView: { flex: 1, width: '100%' },
  upperContainer: { width: '100%', justifyContent: 'space-between', flexDirection: 'row' },
  gamePinContainer: { justifyContent: 'flex-end', marginTop: 4 },
  gamePinText: {
    textAlign: 'right', fontFamily: 'dogicapixel', marginBottom: 10, fontSize: 18,
  },
  teamScroll: { width: '100%', flex: 1 },
  teamContainerWrapper: { paddingTop: 12, paddingBottom: 8 },
  addPlayerSection: { width: '100%', marginBottom: 12 },
  addPlayerLabel: {
    color: '#2C3E50', fontFamily: 'dogicapixelbold', fontSize: 11, marginBottom: 8,
  },
  inputContainer: { flexDirection: 'row', alignItems: 'stretch', gap: 10 },
  inputField: {
    flex: 1, minHeight: 54, marginTop: 0, backgroundColor: '#FFFFFF',
    borderColor: '#2C3E50', borderWidth: 2, borderRadius: 12,
  },
  inputFieldText: { color: '#2C3E50', fontSize: 13, textAlign: 'left' },
  addButton: {
    minWidth: 82, minHeight: 54, paddingHorizontal: 12, backgroundColor: '#1BA39C',
    borderColor: '#2C3E50', borderWidth: 2, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  addButtonDisabled: { opacity: 0.42 },
  addButtonPressed: { opacity: 0.75, transform: [{ translateY: 1 }] },
  addButtonText: { color: '#FFFFFF', fontFamily: 'dogicapixelbold', fontSize: 12 },
  readinessBanner: {
    width: '100%', backgroundColor: '#FADBD8', borderColor: '#A93226',
    borderWidth: 2, borderRadius: 12, padding: 10, marginBottom: 10,
  },
  readinessBannerReady: { backgroundColor: '#D5F5E3', borderColor: '#1E8449' },
  readinessTitle: { color: '#2C3E50', fontFamily: 'dogicapixelbold', fontSize: 10 },
  readinessText: {
    color: '#2C3E50', fontFamily: 'dogicapixel', fontSize: 9, lineHeight: 15, marginTop: 5,
  },
});
