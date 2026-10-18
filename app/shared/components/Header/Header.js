import React from "react";
import { StyleSheet, Image, View } from 'react-native';

//COMPONENTS
import BackButton from "../BackButton/BackButton";

//IMAGES
import profileImage from "../../../../assets/images/profile-icon.png";
import SettingsIcon from "../../../../assets/images/settings-icon.png";


export default function Header ({showBackButton = false, navigation}) {
    return (
        <View style={[styles.mainContainer, showBackButton && styles.withBackButton]}>

            {showBackButton && (
               <BackButton 
                navigation={ navigation }
               />
            )}
            <View style={styles.icons} accessible={false} importantForAccessibility="no-hide-descendants">
                <Image source={profileImage} style={styles.image} />
                <Image source={SettingsIcon} style={styles.image} />
            </View>
        </View>

    );
}

const styles = StyleSheet.create({
    mainContainer: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'flex-end',
        width: '100%',
        minHeight: 48,
        paddingHorizontal: 20,
    },
    withBackButton: { justifyContent: 'space-between' },
    icons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        opacity: 0.72,
    },
    image: { width: 32, height: 32 },
});

