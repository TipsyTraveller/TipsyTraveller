import {StyleSheet, Text, TouchableOpacity, View} from "react-native";
export default function PlayerBox ({
    name,
    isLeader,
    hasDevice,
    onRemovePlayer,
    onMovePlayer,
    onAssignLeader,
    moveTargets = [],
    canManage,
}) {
    return (
        <View style={ style.playerBoxContainer }>
            <Text style={ style.text }>
                { name }
            </Text>

            {isLeader && (
                <Text style={style.leaderText}>LEADER</Text>
            )}
            {canManage && (
                <View style={style.actions}>
                    {!isLeader && hasDevice && (
                        <TouchableOpacity
                            accessibilityLabel={`Make ${name} team leader`}
                            accessibilityRole="button"
                            onPress={onAssignLeader}
                            style={style.actionButton}
                        >
                            <Text style={style.actionText}>LEAD</Text>
                        </TouchableOpacity>
                    )}
                    {moveTargets.map((teamKey) => (
                        <TouchableOpacity
                            accessibilityLabel={`Move ${name} to ${teamKey}`}
                            accessibilityRole="button"
                            key={teamKey}
                            onPress={() => onMovePlayer(teamKey)}
                            style={style.actionButton}
                        >
                            <Text style={style.actionText}>{teamKey.replace('team', 'T')}</Text>
                        </TouchableOpacity>
                    ))}
                    {!isLeader && (
                <TouchableOpacity
                    accessibilityLabel={`Remove ${name}`}
                    accessibilityRole="button"
                    hitSlop={8}
                    style={style.removePlayerContainer}
                    onPress={onRemovePlayer}
                >
                    <Text style={style.removeText}>X</Text>
                </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    )
}  

const style = StyleSheet.create({
    playerBoxContainer: {
        backgroundColor: "rgba(247, 108, 94, .56)",
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 10,

        flexDirection: 'row',
        alignItems: 'center',
    },
    text: {
        fontSize: 16,
        fontFamily: "dogicapixel"
    },
    removePlayerContainer: {
        marginLeft: 10,
        minWidth: 20,
        alignItems: 'center',
    },
    removeText: {
        color: '#8B1116',
        fontFamily: 'dogicapixelbold',
        fontSize: 13,
    },
    leaderText: {
        marginLeft: 10,
        color: '#2C3E50',
        fontFamily: 'dogicapixelbold',
        fontSize: 7,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
        gap: 5,
    },
    actionButton: {
        minWidth: 22,
        minHeight: 22,
        paddingHorizontal: 4,
        borderRadius: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionText: {
        color: '#2C3E50',
        fontFamily: 'dogicapixelbold',
        fontSize: 7,
    },

})
