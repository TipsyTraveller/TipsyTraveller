import { Pressable, StyleSheet, Text, View } from "react-native";

export default function LowerButtonContainer ({ LeftButtonVisible, LeftButtonCopy, handleLeftButton, RightButtonCopy, handleRightButton, RightButtonDisabled = false }) {

    const style = StyleSheet.create({
        container: {
            width: "100%",
            flexDirection: "row",
            justifyContent: LeftButtonVisible === true ? "space-between" : "flex-end",
            gap: 12,
        },
        buttonLeftContainer: {
            flex: 1,
        },  
        buttonRightContainer: {
            flex: 1,
        },
        button: {
            width: "100%",
            minHeight: 54,
            borderRadius: 50,
            backgroundColor: "#FFF1CD",
            borderWidth: 4,
            borderColor: "#2C3E50",
            alignItems: "center",
            justifyContent: "center"
        },
        buttonCopy: { 
            fontFamily: "dogicapixelbold",
            fontSize: 16,
        },
        buttonDisabled: {
            opacity: 0.42,
        }
    })

    return(
        <View style={ style.container}>
            {
                LeftButtonVisible &&
                <View style={ style.buttonLeftContainer}>
                    <Pressable
                        accessibilityRole="button"
                        style={({ pressed }) => [style.button, pressed && { opacity: 0.75 }]}
                        onPress={ handleLeftButton }
                    >
                        <Text style={ style.buttonCopy }>
                            { LeftButtonCopy }
                        </Text>
                    </Pressable>
                </View>
            }
            <View style={ style.buttonRightContainer}>
                <Pressable
                    accessibilityRole="button"
                    disabled={RightButtonDisabled}
                    style={({ pressed }) => [
                        style.button,
                        RightButtonDisabled && style.buttonDisabled,
                        pressed && { opacity: 0.75 },
                    ]}
                    onPress={ handleRightButton }
                >
                    <Text style={ style.buttonCopy }>
                        { RightButtonCopy }
                    </Text>
                </Pressable>
            </View>
        </View>
    )
} 

