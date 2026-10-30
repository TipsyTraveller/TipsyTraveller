import { useCallback, useState } from "react";
import { Platform, ScrollView, Text, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { get, ref } from "firebase/database";
import { db } from "../../firebaseConfig";
import MainAnimation from "../shared/components/MainAnimation/MainAnimation";
import OptionButton from "./components/OptionButton/OptionButton";
import Header from "../shared/components/Header/Header";
import { findPlayerByDevice } from "../Lobby/lobbyState";
import { restoreHostConnection } from "../Lobby/lobbyService";
import { clearActiveGameId, getActiveGameId } from "../shared/storage/userSettings";
import { getRoomRoute } from "../shared/roomNavigation";
//COMPONENTS

export default function Home ({ navigation }) {
    const [activeRoom, setActiveRoom] = useState(null);

    const handleNavigaiton = ( optionType ) => {
        navigation.navigate( optionType );
    }

    useFocusEffect(useCallback(() => {
        let isActive = true;
        setActiveRoom(null);

        const loadActiveRoom = async () => {
            try {
                const [gameID, deviceID] = await Promise.all([
                    getActiveGameId(),
                    AsyncStorage.getItem('deviceID'),
                ]);
                if (!gameID || !deviceID) return;

                const [gameSnapshot, playersSnapshot] = await Promise.all([
                    get(ref(db, `games/${gameID}`)),
                    get(ref(db, `players/${gameID}`)),
                ]);
                const gameData = gameSnapshot.val();
                const teamMembers = playersSnapshot.val();
                const existingPlayer = findPlayerByDevice(teamMembers || {}, deviceID);
                const isExpired = gameData?.disconnectedAt
                    && Date.now() - Number(gameData.disconnectedAt) > 10 * 60 * 1000;
                const canResume = gameSnapshot.exists()
                    && playersSnapshot.exists()
                    && existingPlayer
                    && ['lobby', 'characterSelection', 'game'].includes(gameData?.status)
                    && !isExpired;

                if (!canResume) {
                    await clearActiveGameId();
                    if (isActive) setActiveRoom(null);
                    return;
                }

                if (isActive) setActiveRoom({ gameID, gameData, teamMembers });
            } catch (error) {
                console.log('Unable to load active game', error);
            }
        };

        loadActiveRoom();
        return () => {
            isActive = false;
        };
    }, []));

    const handleResume = async () => {
        if (!activeRoom) return;
        const deviceID = await AsyncStorage.getItem('deviceID');
        await restoreHostConnection({
            gameID: activeRoom.gameID,
            gameData: activeRoom.gameData,
            deviceID,
        }).catch((error) => console.log('Unable to restore host connection', error));
        const roomRoute = getRoomRoute({
            gameID: activeRoom.gameID,
            gameData: activeRoom.gameData,
            teamMembers: activeRoom.teamMembers,
        });
        navigation.navigate(roomRoute.name, roomRoute.params);
    };

    return(
        <SafeAreaView style={style.mainContainer}>
            <Header  navigation={navigation} showBackButton={false}/>
            <ScrollView
                bounces={false}
                contentContainerStyle={[style.content, Platform.OS === "web" && style.webContent]}
                style={style.scroll}
                showsVerticalScrollIndicator={false}
            >
                <MainAnimation />
                <Text style={ style.description }>Take a roadtrip and drink your way to victory!</Text>
                <View style={ style.buttonContainer } >
                    {activeRoom && (
                        <OptionButton
                            ButtonCopy={ `RESUME GAME ${activeRoom.gameID}` }
                            onPress={handleResume}
                            color={'#F3B23C'}
                        />
                    )}
                    <OptionButton
                        ButtonCopy={ "CREATE GAME" }
                        onPress={() => handleNavigaiton('CreateGameScreen')}
                        color={'#1BA39C'}
                    />
                    <OptionButton
                        ButtonCopy={ "JOIN GAME" }
                        onPress={() => handleNavigaiton('JoinGameScreen')}
                        color={'white'}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

const style = StyleSheet.create({
    mainContainer: {
        backgroundColor: "#FAF3E0",
        flex: 1,
    },
    content: {
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: 12,
    },
    webContent: {
        justifyContent: "flex-start",
        gap: 32,
        paddingHorizontal: 16,
        paddingTop: 4,
    },
    scroll: {
        width: "100%",
    },
    buttonContainer: {
        width: "88%",
        maxWidth: 520,
    },
    description: {
        color: "#393939",
        fontSize: 16,
        lineHeight: 24,
        width: "82%",
        maxWidth: 430,
        textAlign: "center",
        marginBottom: 22,
        fontFamily: "dogicapixel"
    }
})
