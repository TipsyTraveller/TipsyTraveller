import { SafeAreaView } from "react-native-safe-area-context";
import { Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, StyleSheet, View, TouchableOpacity } from "react-native";
import {useEffect, useState} from "react";
//COMPONENTS
import TeamContainer from "./components/TeamContainer";
import LowerButtonContainer from "../shared/components/LowerButtonContainer/LowerButtonContainer";
import InputField from "../shared/components/InputField/InputField";
//FIREBASE
import {set, ref,push,child, onValue, off, get, runTransaction, remove, update} from "firebase/database";
import { db } from "../../firebaseConfig";
//STYLES
import BackButton from "../shared/components/BackButton/BackButton";

export default function Lobby ({ navigation, route }) {
    const { gameID, isHost, gameSettings } = route.params;
    const [host, setHost] = useState(isHost);
    const [gameData, setGameData] = useState(gameSettings || route.params || {});
    const [userName, setUserName] = useState('');
    const [teamMembers, setTeamMembers] = useState();
    const [readyToAdd, setReadyToAdd] = useState(false);
    const [isAddingPlayer, setIsAddingPlayer] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    useEffect(() => {

        const players = ref(db, `players/${gameID}`);
        onValue(players, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                setTeamMembers(data);
                setHost(isHost);

            }
            else {
                //console.log("no Game found");
                Alert.alert("Error", "Game has been deleted.");
                navigation.navigate("Home", {});
            }
        });
        return () => off(players);
    }, [gameID]);

    useEffect(() => {
        if (!teamMembers|| !gameData?.nrOfPlayers) return;
        const totalPlayers = Object.values(teamMembers)
            .reduce((sum, team) => sum + Object.values(team).length, 0);

        if (["1-4", "5-8"].includes(gameData.nrOfPlayers)) {
            setReadyToAdd(totalPlayers >= 2);
        } else if (gameData.nrOfPlayers === "9-12") {
            setReadyToAdd(totalPlayers >= 3);
        }

    }, [gameData?.nrOfPlayers, teamMembers]);
    useEffect(() => {
        const game = ref(db, `games/${gameID}`);
        const unsubscribe = onValue(game, (snapshot) => {
            if (snapshot.exists()) {
                //console.log(snapshot.val());
               setGameData(snapshot.val());
            }else {
                console.log("No such game found");
            }
        });

        return () => off(game);

    }, [gameID]);

    useEffect(() => {
        if (!teamMembers || !navigation.isFocused()) return;

        if (gameData?.status === "characterSelection") {
            navigation.navigate("CharacterSelection", {
            gameID: gameID,
            gameData: gameData,
            teamMembers: teamMembers,
            });
        }
        if (gameData?.status === "game" && gameData?.gameplay) {
            navigation.replace("GameScreen", {
                gameID: gameID,
                gameData: gameData,
                teamMembers: teamMembers,
            });
        }
    }, [gameData, gameID, navigation, teamMembers]);

    const handleAddPlayer  = async () => {
        const trimmedUserName = userName.trim();
        if (!trimmedUserName || isAddingPlayer) return;

        Keyboard.dismiss();
        setIsAddingPlayer(true);
        try {
        const playersRef = ref(db, `players/${gameID}`);
        const snapshot = await get(playersRef);
        let currentCount = 0;
        if (snapshot.exists()) {
            const playersData = snapshot.val();
            Object.keys(playersData).forEach((key) => {
                if (key.startsWith("team")){
                    currentCount += Object.keys(playersData[key] || {}).length;
                }
            });
        }
        const newCount = currentCount + 1;
        await set(ref(db, `players/${gameID}/playerCounter`), newCount);
        const teamNr = giveTeamNr(newCount);
        await push(ref(db, `players/${gameID}/team${teamNr}`),{name: trimmedUserName, isLeader: false});
        setUserName("");
        } catch (error) {
            console.log("Unable to add local player", error);
            Alert.alert("Could not add player", "Check your connection and try again.");
        } finally {
            setIsAddingPlayer(false);
        }

    }
    const handleRemovePlayer = async (teamNr, player) => {
        if (!host){
            Alert.alert("Action not allowed", "Only the host can add and remove players.");
            return;
        }
        if (player.isLeader){
            Alert.alert("Action not allowed", "You cannot remove a team leader.");
            return;
        }
        const teamRef = ref(db, `players/${gameID}/team${teamNr}`);
        const snapshot = await get(teamRef);
        if (snapshot.exists()) {
            const playersData = snapshot.val();
            const playerKey = Object.keys(playersData).find((key) => playersData[key].name === player.name);
            if (playerKey) {
                await remove(child(teamRef, playerKey));

                await runTransaction(ref(db, `players/${gameID}/playerCounter`), (currentValue) => {
                    return Math.max((currentValue || 0) - 1, 0);
                });
            }
        }
    }
    const giveTeamNr = (playerCount) => {

        if (gameData.nrOfPlayers === "1-4" || gameData.nrOfPlayers === "5-8") {
            if(playerCount % 2 === 0){
                return 2;
            }
            else {
                return 1;
            }
        }
        if (gameData.nrOfPlayers === "9-12") {
            if(playerCount=== 3 || playerCount === 6|| playerCount===9 ||playerCount === 12){
                return 3;
            }
            else if (playerCount=== 2 || playerCount ===5|| playerCount===8 ||playerCount === 11){
                return 2;
            }
            else {
                return 1;
            }
        }
    }

    const handleRules = () => {
        Alert.alert(
            "How to play",
            "Teams take turns rolling the die and moving along the route. Complete the country challenge after each stop. The tour ends when every team reaches the finish."
        );
    }

    const handleBack = () => {
        if (!host) {
            navigation.goBack();
            return;
        }

        navigation.push("CreateGameScreen", {
            editingGameID: gameID,
            gameSettings: {
                difficulty: gameData?.difficulty || "",
                duration: gameData?.duration || "",
                nrOfPlayers: gameData?.nrOfPlayers || "",
                persons: gameData?.persons || {},
            },
        });
    }

    const handleNextButton = async () => {
        let totalPlayers = 0;
        if (teamMembers) {
            Object.keys(teamMembers).forEach((key) => {
                if (key.startsWith("team")) {
                    totalPlayers += Object.keys(teamMembers[key] || {}).length;
                }

            });
        }
        if (gameData?.nrOfPlayers === "1-4" && totalPlayers < 2) {
            Alert.alert("Not enough players", "At least 2 players are required to start the game.");
            return;
        }
        if (gameData?.nrOfPlayers === "5-8" && totalPlayers < 2) {
            Alert.alert("Not enough players", "At least 2 players are required to start the game.");
            return;
        }
        if (gameData?.nrOfPlayers === "9-12" && totalPlayers < 3) {
            Alert.alert("Not enough players", "At least 3 players are required to start the game.");
            return;
        }
        if (!host) {
            Alert.alert("Action not allowed", "Only the host can start the game.");
            return;
        }
        setIsStarting(true);
        try {
            await update(ref(db, `games/${gameID}`), {
                status: "characterSelection",
                teamModels: null,
            });
        } catch (error) {
            console.log("Unable to start game", error);
            Alert.alert("Could not start game", "Check your connection and try again.");
            setIsStarting(false);
        }
        
    }

    return (
        <SafeAreaView style={style.mainContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={style.keyboardView}
          >
            <View style={ style.upperContainer }>
                <BackButton navigation={ navigation } onPress={handleBack}/>
                <View style={ style.gamePinContainer}>
                    <Text style={ style.gamePinText }>
                       { `GAME ID` }
                    </Text>
                    <Text style={ style.gamePinText }>
                       { `${gameID}` }
                    </Text>
                </View>
            </View>

            <ScrollView
                style={style.teamScroll}
                contentContainerStyle={style.teamContainerWrapper}
                keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <TeamContainer
                    team={ teamMembers && teamMembers.team1 }
                    index={ 1 }
                    onRemovePlayer={handleRemovePlayer}
                    canRemove={host}
                />
                <TeamContainer
                    team={ teamMembers && teamMembers.team2 }
                    index={ 2 }
                    onRemovePlayer={handleRemovePlayer}
                    canRemove={host}
                />
                {gameData && gameData.nrOfPlayers === "9-12" && (
                    <TeamContainer
                        team={ teamMembers && teamMembers.team3 }
                        index={ 3 }
                        onRemovePlayer={handleRemovePlayer}
                        canRemove={host}

                    />
                ) }

                
            </ScrollView>

            {host && readyToAdd && (
                    <View style={ style.inputContainer}>
                        {/*<Text style={ style.inputLabel }>ENTER USERNAME</Text>*/}
                        <View style={ style.inputField }>
                            <InputField
                                placeholder="ADD PLAYERS"
                                value={ userName }
                                setValue={ setUserName }
                            />
                        </View>
                        <View style={ style.deleteButton }>
                            <TouchableOpacity
                                accessibilityLabel="Add player"
                                accessibilityRole="button"
                                disabled={!userName.trim() || isAddingPlayer}
                                onPress={handleAddPlayer}
                                style={style.addButton}
                            >
                                <Text style={ style.plusIcon }>{isAddingPlayer ? '...' : '+'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )
            }
            { host && !readyToAdd && (
                <View style={ style.waitingForPlayersContainer }>
                    <Text style={ style.waitingForPlayers }>Waiting for teamleaders to join...</Text>
                </View>
                )
            }
            <LowerButtonContainer 
                LeftButtonVisible={ true }
                LeftButtonCopy={ "RULES" }
                handleLeftButton={ handleRules }
                RightButtonCopy={isStarting ? "STARTING" : host ? "START" : "WAITING"}
                handleRightButton={ handleNextButton }
                RightButtonDisabled={!host || isStarting}
            />
          </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

const style = StyleSheet.create({
    mainContainer: {
        backgroundColor: "#FAF3E0",
        flex: 1,
        alignItems: "center",
        paddingHorizontal: 20
    },
    keyboardView: {
        flex: 1,
        width: "100%",
    },
    upperContainer: {
        width: "100%",
        justifyContent: "space-between",
        flexDirection: 'row',
    },
    gamePinContainer: {
        justifyContent: "flex-end",
        marginTop: 4
    },
    gamePinText: {
        textAlign: "right",
        fontFamily: "dogicapixel",
        marginBottom: 10,
        fontSize: 18,
    },
    teamScroll: {
        width: "100%",
        flex: 1,
    },
    teamContainerWrapper: {
        paddingTop: 12,
        paddingBottom: 8,
    },
    inputContainer: {
        width: "100%",
        paddingHorizontal: 0,
        flexDirection: "row",
        marginBottom: 20,
        alignItems: "center",
        minHeight: 58,
    },

    inputField: {
        marginRight: 10,
        flex: 1,
    },

    deleteButton: {
        backgroundColor: "#1BA39C",
        width: 54,
        height: 54,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 5,
    },
    addButton: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
    },

    plusIcon: {
        fontSize: 24,
        color: "#fff",
        fontWeight: "bold"
    },
    waitingForPlayersContainer: {
        paddingBottom: 25,
    },
    waitingForPlayers: {
        fontSize: 20,
        fontFamily: "dogicapixelbold",
    }
})
