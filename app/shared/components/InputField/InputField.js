import React from 'react';
import {
    TextInput,
    StyleSheet,
    View
} from 'react-native';

export default function InputField({
    placeholder,
    value,
    setValue,
    inputRef,
    maxLength = 24,
    onSubmitEditing,
    returnKeyType = "done",
    containerStyle,
    inputStyle,
    accessibilityLabel,
}) {


    const handleChange = (text) => {
        setValue(text);
    };

    return (
        <View style={[styles.inputfieldContainer, containerStyle]}>
            <TextInput
                style={[styles.inputfield, inputStyle]}
                value={value}
                placeholder={placeholder}
                accessibilityLabel={accessibilityLabel || placeholder}
                onChangeText={handleChange}
                ref={inputRef}
                maxLength={maxLength}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType={returnKeyType}
                onSubmitEditing={onSubmitEditing}
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
        placeholderLetterSpacing: 0,
        letterSpacing: 0,
    }
});
