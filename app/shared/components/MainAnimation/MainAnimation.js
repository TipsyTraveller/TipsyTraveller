import { StyleSheet } from "react-native";
import LottieView from "lottie-react-native";
import React, { useRef, useEffect } from "react";
import MainAnimationLayout from "./MainAnimationLayout";

export default function MainAnimation ({ compact = false }) {
    const animation = useRef(null);

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
        <MainAnimationLayout compact={compact}>
            <LottieView
                autoPlay={false}
                speed={0.4}
                ref={animation}
                onAnimationFinish={handleAnimationFinish}
                resizeMode="contain"
                style={style.lottie}
                source={require('../../../../assets/animations/animatie-wereld.json')}
            />
        </MainAnimationLayout>
    );
}

const style = StyleSheet.create({
    lottie: {
        width: "100%",
        height: "100%",
    },
});
