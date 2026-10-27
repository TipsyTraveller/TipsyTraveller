import { StyleSheet, Text, View } from "react-native";

//COMPONENTS
import PlayerBox from "./PlayerBox";

export default function TeamContainer ({
    team,
    teamKey,
    index,
    requiredTeamKeys,
    onRemovePlayer,
    onMovePlayer,
    onAssignLeader,
    canManage,
}) {

    return (
        <View style={ style.teamContainer}>
            <View style={ style.teamHeader}>
                <Text style={ style.teamNumber }>
                    { `TEAM ${index}` }
                </Text>
                <View style={ style.line }></View>
            </View>
            <View style={ style.teamMemberContainer }>
                {team && Object.entries(team).map(([playerKey, player]) => (
                    <PlayerBox
                        canManage={canManage}
                        name={player.name}
                        isLeader={player.isLeader}
                        hasDevice={Boolean(player.deviceID)}
                        key={playerKey}
                        moveTargets={requiredTeamKeys.filter((key) => key !== teamKey)}
                        onRemovePlayer={() => onRemovePlayer(teamKey, playerKey, player)}
                        onMovePlayer={(destinationTeamKey) => (
                            onMovePlayer(teamKey, destinationTeamKey, playerKey)
                        )}
                        onAssignLeader={() => onAssignLeader(teamKey, playerKey)}
                    />
                ))}
            </View>
        </View>
    )
}

const style = StyleSheet.create({
    teamContainer: {
        backgroundColor: "#FFF1CD",
        width: "100%",
        padding: 16,
        borderRadius: 22,
        borderColor: "rgba(0, 0, 0, 0.3)",
        borderWidth: 2,
        shadowColor: "#696969",
        shadowOffset: [10, 0],
        shadowOpacity: 0.4,
        shadowRadius: 6,
        marginBottom: 12
    },
    teamHeader: {
        marginBottom: 10
    },
    teamNumber: {
        fontFamily: "dogicapixelbold",
        fontSize: 18,
        marginBottom: 10
    },
    line: {
        height: 2,
        backgroundColor: "#000000",
        width: 100
    },
    teamMemberContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    }
})
