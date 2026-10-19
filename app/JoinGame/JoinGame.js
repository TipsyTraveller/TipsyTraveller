import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {ref, set, get, onDisconnect, child, push, serverTimestamp} from "firebase/database";
import { db } from "../../firebaseConfig";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile } from "../shared/storage/userSettings";
//COMPONENTS
import Button from "../shared/components/Button/Button"
import Header from "../shared/components/Header/Header";
import MainAnimation from "../shared/components/MainAnimation/MainAnimation";
import InputField from "../shared/components/InputField/InputField";
import NumberInput from "../shared/components/NumberInput/NumberInput";

export default function JoinGame ({ navigation }) {
    const [gamePin, setGamePin] = useState('');
    const [userName, setUserName] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const userNameInputRef = useRef(null);

    useEffect(() => {
        getProfile().then((profile) => {
            if (profile?.name) {
                setUserName(profile.name);
            }
        });
    }, []);

    const handleJoin = async () => {
        if (!userName.trim() || gamePin.length !== 4 || isJoining){
            if (!isJoining) Alert.alert("Missing details", "Enter a four-digit game PIN and a username.");
            return;
        }

        Keyboard.dismiss();
        setIsJoining(true);
        try {
            const snapshot = await get(child(ref(db),`games/${gamePin}`));

            if(snapshot.exists()){
                const gameSettings = snapshot.val();
                
                // Check if game has expired (10 minutes)
                if (gameSettings.disconnectedAt) {
                    const tenMinutes = 10 * 60 * 1000;
                    if (Date.now() - gameSettings.disconnectedAt > tenMinutes) {
                        Alert.alert("Error", "This game has expired because the host was disconnected for too long.");
                        return;
                    }
                }
                
                let deviceID = await AsyncStorage.getItem('deviceID');
                if (!deviceID) {
                    deviceID = Math.random().toString(36).substring(2) + Date.now().toString(36);
                    await AsyncStorage.setItem('deviceID', deviceID);
                }

                let currentUserIsHost = false;
                if (gameSettings.hostDeviceID === deviceID) {
                    currentUserIsHost = true;
                    // Clear the disconnected flag when host rejoins
                    await set(ref(db, `games/${gamePin}/disconnectedAt`), null);
                    await onDisconnect(ref(db, `games/${gamePin}`)).update({disconnectedAt: serverTimestamp()});
                }
                
                const joinSuccess = await addPlayerToRightTeam(gameSettings);
                if (joinSuccess) {
                    navigation.navigate( "LobbyScreen" , {gameID: gamePin, isHost: currentUserIsHost, gameSettings});
                }
            }
            else {
                //console.log("game not found");
                Alert.alert("Error", "Please enter a valid game ID");
            }
        } catch (error) {
            console.log("error joining game", error);
            Alert.alert("Could not join game", "Check your connection and try again.");
        } finally {
            setIsJoining(false);
        }
    }
    const addPlayerToRightTeam = async (gameSettings) => {
        const playersRef = ref(db, `players/${gamePin}`);
        const snapshot = await get(playersRef);
        
        let deviceID = await AsyncStorage.getItem('deviceID');
        if (!deviceID) {
            deviceID = Math.random().toString(36).substring(2) + Date.now().toString(36);
            await AsyncStorage.setItem('deviceID', deviceID);
        }

        if(snapshot.exists()){
            const playerData = snapshot.val();
            
            // Check if user is already in a team
            for (const teamKey of ['team1', 'team2', 'team3']) {
                const team = playerData[teamKey];
                if (team) {
                    const isAlreadyInTeam = Object.values(team).some(player => player.deviceID === deviceID);
                    if (isAlreadyInTeam) {
                        return true; // Already joined, proceed to lobby
                    }
                }
            }

            const team1Count = playerData.team1 ? Object.values(playerData.team1).length : 0;
            const team2Count = playerData.team2 ? Object.values(playerData.team2).length : 0;
            const team3Count = playerData.team3 ? Object.values(playerData.team3).length : 0;

            if (gameSettings.nrOfPlayers === "1-4") {
                if (team1Count + team2Count >= 4) {
                    Alert.alert("Warning", "Game is full");
                    return false;
                }

                const teamNr = team1Count <= team2Count ? 1 : 2;
                const isLeader = teamNr === 2 && team2Count === 0;

                await push(ref(db, `players/${gamePin}/team${teamNr}`), {
                    name: userName.trim(),
                    isLeader: isLeader,
                    deviceID: deviceID
                });

                return true;
            }

            if (gameSettings.nrOfPlayers === "5-8") {
                if (team1Count + team2Count >= 8) {
                    Alert.alert("Warning", "Game is full");
                    return false;
                }

                const teamNr = team1Count <= team2Count ? 1 : 2;
                const isLeader = teamNr === 2 && team2Count === 0;

                await push(ref(db, `players/${gamePin}/team${teamNr}`), {
                    name: userName.trim(),
                    isLeader: isLeader,
                    deviceID: deviceID
                });

                return true;
            }

            if (gameSettings.nrOfPlayers === "9-12") {
                if (team1Count + team2Count + team3Count >= 12) {
                    Alert.alert("Warning", "Game is full");
                    return false;
                }

                const teamCounts = [
                    { teamNr: 1, count: team1Count },
                    { teamNr: 2, count: team2Count },
                    { teamNr: 3, count: team3Count },
                ];

                teamCounts.sort((a, b) => a.count - b.count);

                const teamNr = teamCounts[0].teamNr;
                const currentTeamCount = teamCounts[0].count;
                const isLeader = currentTeamCount === 0;

                await push(ref(db, `players/${gamePin}/team${teamNr}`), {
                    name: userName.trim(),
                    isLeader: isLeader,
                    deviceID: deviceID
                });

                return true;
            }
        }
        return false;
    }
    return(
        <SafeAreaView style={style.mainContainer}>
            <Header
                showBackButton={ true }
                navigation={ navigation }
            />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={style.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={style.content}
                    keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <MainAnimation compact />

                    <View style={ style.lowerContainer }>
                        <View style={ style.inputContainer}>
                            <Text style={ style.inputLabel }>ENTER GAME PIN</Text>
                            <NumberInput
                                placeholder="GAME PIN"
                                value={ gamePin }
                                setValue={ setGamePin }
                                onSubmitEditing={() => userNameInputRef.current?.focus()}
                            />
                        </View>
                        <View style={ style.inputContainer}>
                            <Text style={ style.inputLabel }>ENTER USERNAME</Text>
                            <InputField
                                inputRef={userNameInputRef}
                                placeholder="USERNAME"
                                value={ userName }
                                setValue={ setUserName }
                                onSubmitEditing={handleJoin}
                            />
                        </View>

                        <Button
                            buttonCopy={isJoining ? 'Joining...' : 'Join'}
                            disabled={isJoining || gamePin.length !== 4 || !userName.trim()}
                            handlePress={ handleJoin }
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )

}

const style = StyleSheet.create({
    mainContainer: {
        backgroundColor: "#FAF3E0",
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    content: {
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: 24,
    },
    lowerContainer:{
        width: "90%",
        maxWidth: 520,
        paddingBottom: 12,
    },
    inputContainer: {
        paddingBottom: 24,
    },
    inputLabel: {
        fontSize: 18,
        textTransform: "uppercase",
        fontFamily: "dogicapixel",
        borderBottomColor:  "#000",
        borderBottomWidth: 1,
        paddingBottom: 5,
    },

})

