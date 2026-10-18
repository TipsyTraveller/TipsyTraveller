import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import LottieView from "lottie-react-native";
import React, {useRef, useEffect} from "react";

const LOTTIE_COMPOSITION_WIDTH = 2430;
// The globe layers are positioned around x=1023 and the static foreground around x=1040.
// Center their shared visual midpoint rather than the transparent composition bounds.
const LOTTIE_ARTWORK_CENTER_X = 1032;

export default function MainAnimation ({ compact = false }) {

    const animation = useRef(null);
    const { width, height } = useWindowDimensions();
    const containerSize = Math.min(width - 32, compact ? 270 : 400, height * (compact ? 0.34 : 0.44));
    const animationWidth = containerSize * 1.18;
    const animationHeight = animationWidth * (2092 / 2430);
    const artworkOffsetX = animationWidth * (
        (LOTTIE_COMPOSITION_WIDTH / 2 - LOTTIE_ARTWORK_CENTER_X) / LOTTIE_COMPOSITION_WIDTH
    );
    useEffect(() => {
        if (animation.current) {
            animation.current.play(45, 88);
        }
    }, []);

    const handleAnimationFinish = () => {
        if (animation.current) {
            animation.current.play(45, 88); // restart segment
        }
    };
    return(
        <View style={[style.animationContainer, { width: containerSize, height: containerSize }]}>
            <View
                style={[
                    style.animationImage,
                    {
                        width: animationWidth,
                        height: animationHeight,
                        top: -containerSize * 0.25,
                        left: '50%',
                        transform: [{ translateX: -animationWidth / 2 + artworkOffsetX }],
                    },
                ]}
            >
                <LottieView
                    autoPlay={false}
                    speed={0.4}
                    ref={animation}
                    onAnimationFinish={handleAnimationFinish}
                    resizeMode="contain"
                    style={style.lottie}
                    source={require('../../../../assets/animations/animatie-wereld.json')}
                />
            </View>
            <View style={[style.titleContainer, { bottom: compact ? 14 : 24 }]}>
                <Text style={[style.appName, compact && style.compactAppName]}>TIPSY</Text>
                <Text style={[style.appName, compact && style.compactAppName]}>TRAVELLER</Text>
            </View>
            {/*<Text style={ style.appName }>TIPSY {"\n"} TRAVELLER</Text>*/}
        </View>
    )
}

const style = StyleSheet.create({
    animationContainer: {
        overflow:"hidden",
        marginBottom: 0,
        alignItems: "center",
    },
    animationImage: {
        position: "absolute",
    },
    lottie: {
        width: "100%",
        height: "100%",
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
    }
})
