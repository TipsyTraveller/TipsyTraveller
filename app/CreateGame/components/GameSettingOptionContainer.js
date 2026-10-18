import { Text, View, StyleSheet } from 'react-native'

//COMPONENTS
import GameSettingButton from './GameSettingButton'

export default function GameSettingOptionContainer ({ GameSettingOption}) {
    return (
        <View style={ style.optionContainer }>
            <View style={style.settingTitle}>
                <Text style={ style.settingTitleTitle}>SELECT { GameSettingOption.setting }</Text>
            </View>
            <View style={style.buttonContainer}>
                <GameSettingButton
                    setting={ GameSettingOption.setting }
                    title={ GameSettingOption.titles[0] }
                    option={ GameSettingOption.options[0]}
                    imgPath={ GameSettingOption.imgPathOptions[0] }
                    gameSettings={ GameSettingOption.gameSettings }
                    setGameSettings={ GameSettingOption.setGameSettings }
                />
                <GameSettingButton
                    setting={ GameSettingOption.setting }
                    title={ GameSettingOption.titles[1] }
                    option={ GameSettingOption.options[1]}
                    imgPath={ GameSettingOption.imgPathOptions[1] }
                    gameSettings={ GameSettingOption.gameSettings }
                    setGameSettings={ GameSettingOption.setGameSettings }
                />
                <GameSettingButton
                    setting={ GameSettingOption.setting }
                    title={ GameSettingOption.titles[2] }
                    option={ GameSettingOption.options[2]}
                    imgPath={ GameSettingOption.imgPathOptions[2] }
                    gameSettings={ GameSettingOption.gameSettings }
                    setGameSettings={ GameSettingOption.setGameSettings }
                />
                
            </View>
        </View>
    )
}



const style = StyleSheet.create({
    optionContainer: {
        marginTop: 12,
        marginBottom: 10,
        width: "90%",
        maxWidth: 620,
    },
    buttonContainer: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 18
    },
    settingTitle: {
        paddingBottom: 5,
        borderBottomColor:  "#000",
        borderBottomWidth: 1,
    },
    settingTitleTitle: {
        fontSize: 18,
        textTransform: "uppercase",
        fontFamily: "dogicapixel"
    },
})
