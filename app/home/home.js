import { ScrollView, Text, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MainAnimation from "../shared/components/MainAnimation/MainAnimation";
import OptionButton from "./components/OptionButton/OptionButton";
import Header from "../shared/components/Header/Header";
//COMPONENTS

export default function Home ({ navigation }) {

    const handleNavigaiton = ( optionType ) => {
        navigation.navigate( optionType );
    }

    return(
        <SafeAreaView style={style.mainContainer}>
            <Header  navigation={navigation} showBackButton={false}/>
            <ScrollView
                bounces={false}
                contentContainerStyle={style.content}
                style={style.scroll}
                showsVerticalScrollIndicator={false}
            >
                <MainAnimation />
                <Text style={ style.description }>Take a roadtrip and drink your way to victory!</Text>
                <View style={ style.buttonContainer } >
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
