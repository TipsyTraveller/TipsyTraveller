import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import React, { useCallback, useEffect, useState } from "react";
import MainAnimationLayout from "./MainAnimationLayout";

const animationData = JSON.stringify(
    require("../../../../assets/animations/animatie-wereld.json")
);

export default function MainAnimation({ compact = false }) {
    const [player, setPlayer] = useState(null);
    const setPlayerRef = useCallback((nextPlayer) => setPlayer(nextPlayer), []);

    useEffect(() => {
        if (!player) return undefined;

        const playLoopSegment = () => {
            player.setSegment(45, 88);
            player.play();
        };

        player.addEventListener("load", playLoopSegment);
        if (player.isLoaded) playLoopSegment();

        return () => player.removeEventListener("load", playLoopSegment);
    }, [player]);

    return (
        <MainAnimationLayout compact={compact}>
            <DotLottieReact
                aria-hidden="true"
                autoplay
                data={animationData}
                dotLottieRefCallback={setPlayerRef}
                loop
                speed={0.4}
                style={styles.lottie}
            />
        </MainAnimationLayout>
    );
}

const styles = {
    lottie: {
        display: "block",
        height: "100%",
        width: "100%",
    },
};
