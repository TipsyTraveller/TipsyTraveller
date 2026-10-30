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
import {ref, get, child} from "firebase/database";
import { db } from "../../firebaseConfig";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile, saveActiveGameId } from "../shared/storage/userSettings";
//COMPONENTS
import Button from "../shared/components/Button/Button"
import Header from "../shared/components/Header/Header";
import MainAnimation from "../shared/components/MainAnimation/MainAnimation";
import InputField from "../shared/components/InputField/InputField";
import NumberInput from "../shared/components/NumberInput/NumberInput";
import { joinRoomTransaction, restoreHostConnection } from "../Lobby/lobbyService";
import { getRoomRoute } from "../shared/roomNavigation";

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
        if (gamePin.length !== 4 || isJoining){
            if (!isJoining) Alert.alert("Missing details", "Enter a four-digit game PIN.");
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

                if (gameSettings.hostDeviceID === deviceID) {
                    await restoreHostConnection({ gameID: gamePin, gameData: gameSettings, deviceID });
                }
                
                const profile = await getProfile();
                const joinResult = await joinRoomTransaction({
                    gameID: gamePin,
                    deviceID,
                    name: userName.trim(),
                    badge: profile.badge,
                    profileId: profile.isPersistent ? profile.profileId : null,
                });
                if (joinResult.ok) {
                    await saveActiveGameId(gamePin);
                    const playersSnapshot = await get(ref(db, `players/${gamePin}`));
                    const roomRoute = getRoomRoute({
                        gameID: gamePin,
                        gameData: gameSettings,
                        teamMembers: playersSnapshot.val(),
                    });
                    navigation.navigate(roomRoute.name, roomRoute.params);
                } else {
                    Alert.alert("Could not join", joinResult.message);
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
                            disabled={isJoining || gamePin.length !== 4}
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

