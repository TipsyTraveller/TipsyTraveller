import React from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

const LOTTIE_COMPOSITION_WIDTH = 2430;
// The globe layers are positioned around x=1023 and the static foreground around x=1040.
// Center their shared visual midpoint rather than the transparent composition bounds.
const LOTTIE_ARTWORK_CENTER_X = 1032;

export default function MainAnimationLayout({ children, compact = false }) {
    const { width, height } = useWindowDimensions();
    const containerSize = Math.min(width - 32, compact ? 270 : 400, height * (compact ? 0.34 : 0.44));
    const animationWidth = containerSize * 1.18;
    const animationHeight = animationWidth * (2092 / 2430);
    const artworkOffsetX = animationWidth * (
        (LOTTIE_COMPOSITION_WIDTH / 2 - LOTTIE_ARTWORK_CENTER_X) / LOTTIE_COMPOSITION_WIDTH
    );

    return (
        <View style={[styles.animationContainer, { width: containerSize, height: containerSize }]}> 
            <View
                style={[
                    styles.animationImage,
                    {
                        width: animationWidth,
                        height: animationHeight,
                        top: -containerSize * 0.25,
                        left: "50%",
                        transform: [{ translateX: -animationWidth / 2 + artworkOffsetX }],
                    },
                ]}
            >
                {children}
            </View>
            <View style={[styles.titleContainer, { bottom: compact ? 14 : 24 }]}> 
                <Text style={[styles.appName, compact && styles.compactAppName]}>TIPSY</Text>
                <Text style={[styles.appName, compact && styles.compactAppName]}>TRAVELLER</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    animationContainer: {
        overflow: "hidden",
        marginBottom: 0,
        alignItems: "center",
    },
    animationImage: {
        position: "absolute",
        overflow: "hidden",
    },
    titleContainer: {
        alignItems: "center",
        position: "absolute",
    },
    appName: {
        color: "#393939",
        fontSize: 40,
        textAlign: "center",
        lineHeight: 50,
        fontFamily: "dogicapixelbold",
    },
    compactAppName: {
        fontSize: 28,
        lineHeight: 34,
    },
});
