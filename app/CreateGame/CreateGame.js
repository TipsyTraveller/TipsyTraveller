import { Alert, Platform, View, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { ref, runTransaction } from "firebase/database";
import { db } from "../../firebaseConfig";

//COMPONENTS
import MainAnimation from "../shared/components/MainAnimation/MainAnimation";
import GameSettingOptionContainer from "./components/GameSettingOptionContainer";
import Header from "../shared/components/Header/Header";
//IMAGES
import difficultyEasyImage from "../../assets/images/beer-flesje.png"
import difficultyMediumImage from "../../assets/images/2beers-flesje.png"
import difficultyHardImage from "../../assets/images/3beers-flesje.png";
import LowerButtonContainer from "../shared/components/LowerButtonContainer/LowerButtonContainer";
import { getRouteSnapshotForDuration } from "../GameScreen/services/countryStopsService";
import { countPlayers, getTeamEntries, PLAYER_CAPACITY } from "../Lobby/lobbyState";

//TYPE
/**
 * @typedef { Object } GameSettingOption
 * @property { string } setting
 * @property { string[] } titles
 * @property { (string|number)[] } options 
 * @property { any[] } imgPathOptions 
 * @property { Object } gameSettings 
 * @property { Function } setGameSettings 
 */

const DEFAULT_GAME_SETTINGS = {
    difficulty: "",
    duration: "",
    nrOfPlayers: "",
    persons: {}
};

export default function SelectionPages ({ navigation, route }) {

    const [currentSetting, setCurrentSetting] = useState("difficulty")
    const [gameSettings, setGameSettings] = useState(DEFAULT_GAME_SETTINGS)
    const [isSaving, setIsSaving] = useState(false);
    const editingGameID = route.params?.editingGameID;

    useEffect(() => {
        if (!editingGameID) return;

        setGameSettings({
            ...DEFAULT_GAME_SETTINGS,
            ...route.params?.gameSettings,
        });
        setCurrentSetting("difficulty");
    }, [editingGameID, route.params?.gameSettings]);

    const saveExistingGame = async () => {
        if (!editingGameID || isSaving) return;

        setIsSaving(true);
        try {
            const routeStops = await getRouteSnapshotForDuration(gameSettings.duration);
            let rejectionMessage = "The room may have closed or moved on from the lobby.";

            const transaction = await runTransaction(
                ref(db),
                (root) => {
                    const currentGame = root?.games?.[editingGameID];
                    if (!currentGame || currentGame.status !== "lobby") return;
                    const players = root?.players?.[editingGameID] || {};
                    const playerCount = countPlayers(players);
                    const nextCapacity = PLAYER_CAPACITY[gameSettings.nrOfPlayers];
                    if (!nextCapacity || playerCount > nextCapacity) {
                        rejectionMessage = `${playerCount} players are already in this game. Choose a range that fits everyone.`;
                        return;
                    }
                    if (
                        gameSettings.nrOfPlayers !== "9-12"
                        && getTeamEntries(players, "team3").length > 0
                    ) {
                        rejectionMessage = "Choose 9-12 players while Team 3 still has members.";
                        return;
                    }

                    return {
                        ...root,
                        games: {
                            ...(root.games || {}),
                            [editingGameID]: {
                                ...currentGame,
                                difficulty: gameSettings.difficulty,
                                duration: gameSettings.duration,
                                routeStops,
                                nrOfPlayers: gameSettings.nrOfPlayers,
                            },
                        },
                    };
                }
            );

            if (!transaction.committed) {
                Alert.alert(
                    "Game can no longer be edited",
                    rejectionMessage
                );
                return;
            }

            navigation.goBack();
        } catch (error) {
            console.log("Unable to update game settings", error);
            Alert.alert("Could not update settings", "Check your connection and try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleNextSetting = async () => {

        if (isSaving) return;

        if(currentSetting === "difficulty" && gameSettings.difficulty !== ""){
            setCurrentSetting("duration")
        }else if(currentSetting === "duration" && gameSettings.duration !== ""){
            setCurrentSetting("nrOfPlayers")
        }else if(currentSetting === "nrOfPlayers" && gameSettings.nrOfPlayers !== ""){
            try{
                if (editingGameID) {
                    await saveExistingGame();
                } else {
                    navigation.navigate( "HostName" ,  gameSettings);
                }
            } catch(err){
                console.log(err);
            }

        }
        
    }

    const handleBackButton = () => {
        if (currentSetting === "duration") {
            setCurrentSetting("difficulty");
        } else if (currentSetting === "nrOfPlayers") {
            setCurrentSetting("duration");
        } else {
            navigation.goBack();
        }
    }

    const currentSelection = gameSettings[currentSetting];

    /** @type {GameSettingOption} */
    const difficultySettings = {
        setting: "difficulty",
        titles: ["EASY", "MEDIUM", "LETHAL"],
        options: ["easy", "medium", "hard"],
        imgPathOptions: [difficultyEasyImage, difficultyMediumImage, difficultyHardImage],
        gameSettings,
        setGameSettings
    };

    /** @type {GameSettingOption} */
    const durationSettings = {
        setting: "duration",
        titles: ["SHORT", "MEDIUM", "LONG"],
        options: ["short", "medium", "long"],
        imgPathOptions: [difficultyEasyImage, difficultyMediumImage, difficultyHardImage],
        gameSettings,
        setGameSettings
    };

    /** @type {GameSettingOption} */
    const playerSettings = {
        setting: "nrOfPlayers",
        titles: ["1-4", "5-8", "9-12"],
        options: ["1-4", "5-8", "9-12"],
        imgPathOptions: [difficultyEasyImage, difficultyMediumImage, difficultyHardImage],
        gameSettings,
        setGameSettings
    };

    return(
        <SafeAreaView style={style.mainContainer}>
            <Header 
                navigation={ navigation } 
                showBackButton={ false }
            />
            <ScrollView
                bounces={false}
                contentContainerStyle={[style.content, Platform.OS === "web" && style.webContent]}
                style={style.scroll}
                showsVerticalScrollIndicator={false}
            >
                <MainAnimation compact />

                {currentSetting === "difficulty" ? (
                    <GameSettingOptionContainer GameSettingOption={ difficultySettings } />
                ) : currentSetting === "duration" ? (
                    <GameSettingOptionContainer GameSettingOption={ durationSettings } />
                ) : (
                    <GameSettingOptionContainer GameSettingOption={ playerSettings } />
                )}
            </ScrollView>

            <View style={ style.lowerButtonContainerWrapper }>
                <LowerButtonContainer 
                    LeftButtonVisible={ true }
                    LeftButtonCopy={ "<-" }
                    handleLeftButton={ handleBackButton }
                    RightButtonCopy={isSaving ? "SAVING" : "->"}
                    handleRightButton={ handleNextSetting }
                    RightButtonDisabled={!currentSelection || isSaving}
                />
            </View>
        </SafeAreaView>
    )
}

const style = StyleSheet.create({
    mainContainer: {
        backgroundColor: "#FAF3E0",
        flex: 1,
        alignItems: "center",
    },
    content: {
        flexGrow: 1,
        width: "100%",
        alignItems: "center",
        justifyContent: "space-between",
    },
    webContent: {
        justifyContent: "flex-start",
        paddingTop: 4,
    },
    scroll: {
        flex: 1,
        width: "100%",
    },
    lowerButtonContainerWrapper: {
        width: "100%",
        maxWidth: 620,
        paddingHorizontal: 20,
        paddingVertical: 12,
    }
})
