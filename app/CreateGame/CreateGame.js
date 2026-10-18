import { Alert, View, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { get, ref, runTransaction } from "firebase/database";
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

const PLAYER_CAPACITY = {
    "1-4": 4,
    "5-8": 8,
    "9-12": 12,
};

const countTeamMembers = (players) => (
    ["team1", "team2", "team3"].reduce((total, teamKey) => {
        const team = players?.[teamKey];
        return total + (team && typeof team === "object" ? Object.keys(team).length : 0);
    }, 0)
);

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
            const playersSnapshot = await get(ref(db, `players/${editingGameID}`));
            const players = playersSnapshot.val() || {};
            const playerCount = countTeamMembers(players);
            const nextCapacity = PLAYER_CAPACITY[gameSettings.nrOfPlayers];
            const team3 = players.team3;
            const team3HasMembers = team3 && typeof team3 === "object" && Object.keys(team3).length > 0;

            if (playerCount > nextCapacity) {
                Alert.alert(
                    "Player range too small",
                    `${playerCount} players are already in this game. Choose a range that fits everyone.`
                );
                return;
            }

            if (gameSettings.nrOfPlayers !== "9-12" && team3HasMembers) {
                Alert.alert(
                    "Team 3 is in use",
                    "Choose 9-12 players while Team 3 still has members."
                );
                return;
            }

            const transaction = await runTransaction(
                ref(db, `games/${editingGameID}`),
                (currentGame) => {
                    if (!currentGame || currentGame.status !== "lobby") return;

                    return {
                        ...currentGame,
                        difficulty: gameSettings.difficulty,
                        duration: gameSettings.duration,
                        nrOfPlayers: gameSettings.nrOfPlayers,
                    };
                }
            );

            if (!transaction.committed) {
                Alert.alert(
                    "Game can no longer be edited",
                    "The room may have closed or moved on from the lobby."
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
                contentContainerStyle={style.content}
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
