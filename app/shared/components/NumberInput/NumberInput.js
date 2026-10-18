import React from 'react';
import {
    TextInput,
    StyleSheet,
    View,
    Platform
} from 'react-native';

export default function NumberInput({ placeholder, value, setValue, inputRef, onSubmitEditing }) {

    const handleChange = (text) => {
        // Allow only digits
        const cleaned = text.replace(/[^0-9]/g, '').slice(0, 4);
        setValue(cleaned);
    };

    return (
        <View style={styles.inputfieldContainer}>
            <TextInput
                style={styles.inputfield}
                value={value}
                placeholder={placeholder}
                ref={inputRef}
                keyboardType={ Platform.OS === "ios" ? "number-pad" : "numeric"}
                onChangeText={handleChange}
                returnKeyType={ "done" }
                onSubmitEditing={onSubmitEditing}
                maxLength={4}
                textContentType="oneTimeCode"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    inputfieldContainer: {
        backgroundColor: "#D9D9D9",
        minHeight: 56,
        marginTop: 14,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    inputfield: {
        width: "100%",
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 16,
        textAlign: "center",
        fontFamily: "dogicapixelbold",
        letterSpacing: 10,
        placeholderLetterSpacing: 0,
    }
});
