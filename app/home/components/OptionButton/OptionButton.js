import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useState } from 'react';

export default function OptionButton ({ ButtonCopy, onPress, color}){

  const [isPressed, setIsPressed] = useState(false);

  
  return (
    <TouchableOpacity 
      accessibilityRole="button"
      style={ [
        style.buttonContainer,
          { backgroundColor: color },
        isPressed && style.buttonPressed
      ]} 
      onPress={ onPress }
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}      
      >
      <Text style={ style.buttonCopy } >{ ButtonCopy}</Text>
    </TouchableOpacity>
  );
};

const style = StyleSheet.create({
    buttonContainer: {
      width: "100%",

      alignItems: "center",
      justifyContent: "center",
      minHeight: 72,
      borderRadius: 18,
      marginBottom: 14,
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
      color: "#393939",
      fontSize: 18,
      fontWeight: 600,
        fontFamily: "dogicapixelbold",
    },
    buttonPressed: {
      backgroundColor: "#1BA39C",
      transform: [{ scale: 0.95 }],
      opacity: 1
    },
})
