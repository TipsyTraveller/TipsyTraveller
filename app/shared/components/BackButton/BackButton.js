import { TouchableOpacity, Text, StyleSheet } from "react-native"

export default function BackButton ({ navigation, onPress }) {

    return(
         <TouchableOpacity
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={8}
            style={ styles.buttonContainer }
            onPress={onPress || (() => navigation.goBack())}
         >
            <Text style={ styles.buttonText }>{'<'} BACK</Text>
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    buttonContainer: {
        backgroundColor: "#C4C4C4",
        minWidth: 78,
        minHeight: 40,
        paddingHorizontal: 12,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 8,
    },
    buttonText: {
        color: "black",
        fontSize: 9,
        fontWeight: "bold",
        fontFamily: "dogicapixel",
    },
})
