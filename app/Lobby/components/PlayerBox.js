import {StyleSheet, Text, TouchableOpacity, View} from "react-native";
export default function PlayerBox ({ name, isLeader, onRemovePlayer, canRemove }) {
    return (
        <View style={ style.playerBoxContainer }>
            <Text style={ style.text }>
                { name }
            </Text>

            {isLeader ? (
                <Text style={style.leaderText}>LEADER</Text>
            ) : canRemove ? (
                <TouchableOpacity
                    accessibilityLabel={`Remove ${name}`}
                    accessibilityRole="button"
                    hitSlop={8}
                    style={style.removePlayerContainer}
                    onPress={onRemovePlayer}
                >
                    <Text style={style.removeText}>X</Text>
                </TouchableOpacity>
            ) : null}
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

})
