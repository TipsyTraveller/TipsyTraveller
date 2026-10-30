import { Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useRef, useState } from "react";
import {ref, onDisconnect, push, serverTimestamp} from "firebase/database";
import { db } from "../../firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getProfile, getSettings, saveActiveGameId } from "../shared/storage/userSettings";
import { roomRulesFromSettings } from "../GameScreen/constants/roomRules";
//COMPONENTS
import Button from "../shared/components/Button/Button"
import Header from "../shared/components/Header/Header";
import MainAnimation from "../shared/components/MainAnimation/MainAnimation";
import InputField from "../shared/components/InputField/InputField";
import { getRouteSnapshotForDuration } from "../GameScreen/services/countryStopsService";
import { reserveRoomCode } from "../Lobby/lobbyService";

export default function HostName ({ navigation, route }) {
    const [userName, setUserName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const gameSettings = route.params;
    const isHost = true;
    const routeStopsPromiseRef = useRef(null);

    useEffect(() => {
        routeStopsPromiseRef.current = getRouteSnapshotForDuration(gameSettings.duration);
        getProfile().then((profile) => {
            if (profile?.name) {
                setUserName(profile.name);
            }
        });
    }, [gameSettings.duration]);
    const handleCreate = async () => {
        const trimmedUserName = userName.trim();
        if (!trimmedUserName || isCreating){
            if (!trimmedUserName) Alert.alert("Username required", "Enter a username to create the game.");
            return;
        }

        Keyboard.dismiss();
        setIsCreating(true);
        try {
            const deviceIDPromise = AsyncStorage.getItem("deviceID");
            const [storedDeviceID, localSettings, profile, routeStops] = await Promise.all([
                deviceIDPromise,
                getSettings(),
                getProfile(),
                routeStopsPromiseRef.current || getRouteSnapshotForDuration(gameSettings.duration),
            ]);
            let deviceID = storedDeviceID;
            if(!deviceID){
                deviceID = Math.random().toString(36).substring(2) + Date.now().toString(36);
                await AsyncStorage.setItem("deviceID", deviceID);
            }
            const synchronizedSettings = {
                ...gameSettings,
                roomRules: roomRulesFromSettings(localSettings),
            };
            const hostPlayerId = push(ref(db, 'playerKeys')).key;
            const newGameID = await reserveRoomCode({
                createGame: () => ({
                    ...synchronizedSettings,
                    routeStops,
                    HostName: trimmedUserName,
                    createdAt: Date.now(),
                    hostDeviceID: deviceID,
                    status: "lobby"
                }),
                createPlayers: () => ({
                    playerCounter: 1,
                    team1: {
                        [hostPlayerId]: {
                            name: trimmedUserName,
                            isLeader: true,
                            deviceID,
                            badge: profile.badge,
                            ...(profile.isPersistent ? { profileId: profile.profileId } : {}),
                        },
                    },
                    team2: "",
                    team3: "",
                }),
            });

            await onDisconnect(ref(db, `games/${newGameID}/disconnectedAt`))
                .set(serverTimestamp());
            await saveActiveGameId(newGameID);
            navigation.reset({
                index: 1,
                routes: [
                    { name: "Home" },
                    {
                        name: "LobbyScreen",
                        params: {
                            gameID: newGameID,
                            isHost: isHost,
                            hostName: trimmedUserName,
                            gameSettings: synchronizedSettings,
                        },
                    },
                ],
            });
        } catch (error) {
            console.log("error creating game",error);
            Alert.alert("Could not create game", "Check your connection and try again.");
        } finally {
            setIsCreating(false);
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
                            <Text style={ style.inputLabel }>ENTER USERNAME</Text>
                            <InputField
                                placeholder="USERNAME"
                                value={ userName }
                                setValue={ setUserName }
                                onSubmitEditing={handleCreate}
                            />
                        </View>

                        <Button
                            buttonCopy={isCreating ? 'Creating...' : 'Create'}
                            disabled={isCreating || !userName.trim()}
                            handlePress={ handleCreate }
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
        paddingBottom: 50,
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

