import {StyleSheet, Text, TouchableOpacity, View} from "react-native";
import { BADGE_OPTIONS } from '../../shared/storage/userSettings';

export default function PlayerBox ({ name, badge, isLeader, onRemovePlayer, canRemove }) {
    const badgeInfo = BADGE_OPTIONS.find((option) => option.id === badge) || BADGE_OPTIONS[0];
    return (
        <View style={ style.playerBoxContainer }>
            <Text style={style.badgeEmoji}>{badgeInfo.emoji}</Text>
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
    badgeEmoji: {
        fontSize: 16,
        marginRight: 6,
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
