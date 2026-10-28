import { Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import {ref, set, get, onDisconnect, child, push, serverTimestamp} from "firebase/database";
import { db } from "../../firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getProfile, getSettings } from "../shared/storage/userSettings";
import { roomRulesFromSettings } from "../GameScreen/constants/roomRules";
//COMPONENTS
import Button from "../shared/components/Button/Button"
import Header from "../shared/components/Header/Header";
import MainAnimation from "../shared/components/MainAnimation/MainAnimation";
import InputField from "../shared/components/InputField/InputField";
import { getRouteSnapshotForDuration } from "../GameScreen/services/countryStopsService";

export default function HostName ({ navigation, route }) {
    const [userName, setUserName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const gameSettings = route.params;
    const isHost = true;

    useEffect(() => {
        getProfile().then((profile) => {
            if (profile?.name) {
                setUserName(profile.name);
            }
        });
    }, []);
    const handleCreate = async () => {
        const trimmedUserName = userName.trim();
        if (!trimmedUserName || isCreating){
            if (!trimmedUserName) Alert.alert("Username required", "Enter a username to create the game.");
            return;
        }

        Keyboard.dismiss();
        setIsCreating(true);
        try {
            let deviceID = await AsyncStorage.getItem("deviceID");
            if(!deviceID){
                deviceID = Math.random().toString(36).substring(2) + Date.now().toString(36);
                await AsyncStorage.setItem("deviceID", deviceID);
            }
            const localSettings = await getSettings();
            const synchronizedSettings = {
                ...gameSettings,
                roomRules: roomRulesFromSettings(localSettings),
            };
            const newGameID = await generateUniqueGame(synchronizedSettings);
            await set(ref(db, `players/${newGameID}`), {playerCounter: 0, team1: "", team2: "", team3: ""});
            const playersRef = ref(db, `players/${newGameID}/team${1}`);
            await push(playersRef, {name: trimmedUserName, isLeader: true, deviceID: deviceID} );

            //testcleanup na disconnecten
            const gamesRef = ref(db, `games/${newGameID}`);
            // await onDisconnect(gamesRef).remove();
            await onDisconnect(gamesRef).update({disconnectedAt: serverTimestamp()});
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
    const generateRandomNumber = () => {
        let code ="";
        for(let i =0;i<4; i++){
            code += Math.floor(Math.random() * (10));
        }
        return code;
    }
    const generateUniqueGame = async (settings) => {
        let newGameID = generateRandomNumber();
        let gameExists = true;

        while(gameExists){
            const snapshot = await get(child(ref(db),`games/${newGameID}`));
            if(!snapshot.exists()){
                gameExists = false;
                let deviceID = await AsyncStorage.getItem("deviceID");
                await set(ref(db, `games/${newGameID}`),{
                    ...settings,
                    routeStops: await getRouteSnapshotForDuration(settings.duration),
                    HostName: userName.trim(),
                    createdAt: Date.now(),
                    hostDeviceID: deviceID,
                    status: "lobby"
                });
                return newGameID;
            }
            else {
                newGameID = generateRandomNumber();
            }
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

