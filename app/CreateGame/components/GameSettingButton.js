import { StyleSheet, View, Text, Pressable, Image, useWindowDimensions } from "react-native";


export default function GameSettingButton({ title, setting, option, imgPath, gameSettings, setGameSettings }) {
    const { height } = useWindowDimensions();

    const handleButton = () => {
        if( setting === "difficulty"){
            setGameSettings({
                ...gameSettings,
                difficulty: option
            })
        }else if( setting === "duration"){
            setGameSettings({
                ...gameSettings,
                duration: option
            })
        }else {
            setGameSettings({
                ...gameSettings,
                nrOfPlayers: option
            })
        }
    }

    const isActive = gameSettings[setting] === option;

    return (
        <View style={ style.optionButtonWrapper} >
            <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                onPress={ () => handleButton() }
                style={[
                    style.button,
                    { height: Math.max(112, Math.min(150, height * 0.2)) },
                    isActive && style.buttonActive  
                ]}
            >
                <Image 
                    style={ style.buttonImage }
                    source={ imgPath}
                />
                <Text
                    style={style.buttonCopy}
                >{ title }</Text>
            </Pressable>
        </View>
    )
} 

const style = StyleSheet.create({
    optionButtonWrapper: {
        width: '31%'
    },
    button: {
        backgroundColor: "#FFFFFF",
        width: "100%",
        borderRadius: 12,
        color: "#000",
        justifyContent: "flex-end",
        alignItems: "center",
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        // Android Shadow
        elevation: 8,
    },
    buttonCopy: {
        paddingBottom: 10,
        fontWeight: 600,
        fontFamily: "dogicapixelbold"
    },
    buttonActive: {
        backgroundColor: "#1BA39C"
    },
    buttonImage: {
        width: "70%",
        height: "40%",
        resizeMode: "contain",
        marginBottom: 20
    }
})
