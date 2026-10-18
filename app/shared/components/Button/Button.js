import { Text, View, StyleSheet, TouchableOpacity} from "react-native";

export default function Button ({ handlePress, buttonCopy, disabled = false }) {
    return(
        <View style={ styles.container }>
            <TouchableOpacity
                accessibilityRole="button"
                disabled={disabled}
                style={[styles.button, disabled && styles.buttonDisabled]}
                onPress={ handlePress }
            >
                <Text style={ styles.buttonCopy }>
                    {  buttonCopy }
                </Text>
            </TouchableOpacity>
        </View>
    )
}
const styles = StyleSheet.create({
    container: {
        width: "100%",
        flexDirection: "row",
        alingItems: "center",
        justifyContent: "center",
    },
    button: {
        width: "100%",
        maxWidth: 280,
        minHeight: 56,
        borderRadius: 50,
        backgroundColor: "#FFF1CD",
        borderWidth: 4,
        borderColor: "#2C3E50",
        alignItems: "center",
        justifyContent: "center"
    },
    buttonCopy: {
        fontFamily: "dogicapixelbold",
        fontSize: 18,
        textTransform: "uppercase",
    },
    buttonDisabled: { opacity: 0.5 },

})
