import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ConnectionOverlay = ({
  activeLeader,
  canClaimHost = false,
  isConnected,
  isHost,
  isLoading,
  isRoomExpired,
  leaders = [],
  connectedPlayers = [],
  localDeviceID,
  onLeave,
  onReturnHome,
  onReplaceLeader,
  onTransferHost,
  presenceLoaded = true,
  roomMeta,
}) => {
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingHost, setPendingHost] = useState(null);

  const status = useMemo(() => {
    if (isRoomExpired) return { label: 'ROOM EXPIRED', tone: 'danger' };
    if (!isConnected) return { label: 'OFFLINE', tone: 'danger' };
    if (isLoading) return { label: 'RECONNECTING…', tone: 'warning' };
    if (roomMeta?.disconnectedAt) return { label: 'HOST DISCONNECTED', tone: 'warning' };
    if (presenceLoaded && activeLeader && !activeLeader.connected) {
      return { label: `${activeLeader.name} DISCONNECTED`, tone: 'warning' };
    }
    return null;
  }, [activeLeader, isConnected, isLoading, isRoomExpired, presenceLoaded, roomMeta?.disconnectedAt]);

  const transferCandidates = leaders.filter((leader) => (
    leader.connected && leader.deviceID !== localDeviceID
  ));

  const transfer = async (deviceID) => {
    if (pendingHost) return;
    setPendingHost(deviceID);
    try {
      await onTransferHost?.(deviceID);
    } finally {
      setPendingHost(null);
    }
  };

  const disconnectedLeaders = leaders.filter((leader) => !leader.connected);

  if (isRoomExpired) {
    return (
      <View style={styles.expiredBackdrop}>
        <View style={styles.expiredCard}>
          <Text style={styles.expiredTitle}>ROOM EXPIRED</Text>
          <Text style={styles.expiredText}>
            The host has been disconnected for more than ten minutes. This room can no longer continue.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onReturnHome}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>RETURN HOME</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View
      pointerEvents="box-none"
      style={[styles.positioner, { right: insets.right + 10, top: insets.top + 8 }]}
    >
      <View style={styles.topRow}>
        {status && (
          <View style={[styles.statusPill, status.tone === 'danger' && styles.statusDanger]}>
            <Text style={styles.statusText}>{status.label}</Text>
          </View>
        )}
        <Pressable
          accessibilityLabel="Open game connection menu"
          accessibilityRole="button"
          onPress={() => setIsOpen((open) => !open)}
          style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}
        >
          <Text style={styles.menuButtonText}>{isOpen ? 'CLOSE' : 'GAME'}</Text>
        </Pressable>
      </View>

      {isOpen && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>CONNECTIONS</Text>
          {leaders.map((leader) => (
            <View key={`${leader.teamId}-${leader.deviceID}`} style={styles.leaderRow}>
              <View style={[styles.dot, leader.connected ? styles.dotOnline : styles.dotOffline]} />
              <View style={styles.leaderCopy}>
                <Text numberOfLines={1} style={styles.leaderName}>{leader.name}</Text>
                <Text style={styles.leaderMeta}>{leader.teamId.toUpperCase()} LEADER</Text>
              </View>
              {isHost && leader.deviceID !== localDeviceID && leader.connected && (
                <Pressable
                  accessibilityLabel={`Transfer host to ${leader.name}`}
                  accessibilityRole="button"
                  disabled={Boolean(pendingHost)}
                  onPress={() => transfer(leader.deviceID)}
                  style={({ pressed }) => [styles.transferButton, pressed && styles.pressed]}
                >
                  <Text style={styles.transferText}>
                    {pendingHost === leader.deviceID ? 'TRANSFERRING…' : 'MAKE HOST'}
                  </Text>
                </Pressable>
              )}
            </View>
          ))}

          {isHost && transferCandidates.length === 0 && (
            <Text style={styles.helperText}>Another connected team leader is required to transfer host.</Text>
          )}
          {canClaimHost && (
            <Pressable
              accessibilityLabel="Take over as host"
              accessibilityRole="button"
              disabled={Boolean(pendingHost)}
              onPress={() => transfer(localDeviceID)}
              style={({ pressed }) => [styles.replacementButton, pressed && styles.pressed]}
            >
              <Text style={styles.replacementButtonText}>
                {pendingHost === localDeviceID ? 'TAKING OVER…' : 'TAKE OVER HOST'}
              </Text>
            </Pressable>
          )}
          {isHost && disconnectedLeaders.map((leader) => {
            const replacements = connectedPlayers.filter((player) => (
              player.teamId === leader.teamId && player.playerId !== leader.playerId
            ));
            if (!replacements.length) return null;
            return (
              <View key={`replacements-${leader.teamId}`} style={styles.replacementSection}>
                <Text style={styles.replacementTitle}>{`REPLACE ${leader.name.toUpperCase()}`}</Text>
                {replacements.map((player) => (
                  <Pressable
                    key={player.playerId}
                    accessibilityLabel={`Make ${player.name} the ${leader.teamId} leader`}
                    accessibilityRole="button"
                    onPress={() => onReplaceLeader?.({ teamId: leader.teamId, playerId: player.playerId })}
                    style={({ pressed }) => [styles.replacementButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.replacementButtonText}>{`MAKE ${player.name.toUpperCase()} LEADER`}</Text>
                  </Pressable>
                ))}
              </View>
            );
          })}
          {status && !isRoomExpired && (
            <Text style={styles.helperText}>
              Automatic movement and timed finalization continue. Leader actions resume when an active leader reconnects.
            </Text>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={onLeave}
            style={({ pressed }) => [styles.leaveButton, pressed && styles.pressed]}
          >
            <Text style={styles.leaveText}>LEAVE GAME</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  positioner: { position: 'absolute', zIndex: 30, alignItems: 'flex-end' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  statusPill: {
    backgroundColor: '#E89B19', borderColor: '#111111', borderRadius: 7, borderWidth: 1,
    paddingHorizontal: 9, paddingVertical: 7,
  },
  statusDanger: { backgroundColor: '#C94A4A' },
  statusText: { color: '#FFFFFF', fontFamily: 'dogicapixelbold', fontSize: 7 },
  menuButton: {
    backgroundColor: '#FFF1CD', borderColor: '#2C3E50', borderRadius: 8, borderWidth: 1,
    paddingHorizontal: 11, paddingVertical: 8,
  },
  menuButtonText: { color: '#2C3E50', fontFamily: 'dogicapixelbold', fontSize: 7 },
  panel: {
    backgroundColor: '#FFF1CD', borderColor: '#2C3E50', borderRadius: 12, borderWidth: 1,
    marginTop: 7, padding: 12, width: 310,
  },
  panelTitle: { color: '#111111', fontFamily: 'dogicapixelbold', fontSize: 9, marginBottom: 8 },
  leaderRow: {
    alignItems: 'center', borderTopColor: 'rgba(44,62,80,0.18)', borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row', minHeight: 42, paddingVertical: 6,
  },
  dot: { borderColor: '#2C3E50', borderRadius: 5, borderWidth: 1, height: 9, marginRight: 7, width: 9 },
  dotOnline: { backgroundColor: '#1BA36F' },
  dotOffline: { backgroundColor: '#C94A4A' },
  leaderCopy: { flex: 1, minWidth: 0 },
  leaderName: { color: '#111111', fontFamily: 'dogicapixelbold', fontSize: 8 },
  leaderMeta: { color: '#596676', fontFamily: 'dogicapixel', fontSize: 6, marginTop: 3 },
  transferButton: {
    backgroundColor: '#1BA39C', borderColor: '#111111', borderRadius: 6, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 7,
  },
  transferText: { color: '#FFFFFF', fontFamily: 'dogicapixelbold', fontSize: 6 },
  helperText: { color: '#596676', fontFamily: 'dogicapixel', fontSize: 6, lineHeight: 10, marginTop: 8 },
  replacementSection: {
    borderTopColor: 'rgba(44,62,80,0.18)', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 8, paddingTop: 8,
  },
  replacementTitle: { color: '#A73535', fontFamily: 'dogicapixelbold', fontSize: 6, marginBottom: 6 },
  replacementButton: {
    alignItems: 'center', backgroundColor: '#E89B19', borderColor: '#111111', borderRadius: 6,
    borderWidth: 1, marginTop: 4, paddingVertical: 7,
  },
  replacementButtonText: { color: '#FFFFFF', fontFamily: 'dogicapixelbold', fontSize: 6 },
  leaveButton: {
    alignItems: 'center', borderColor: '#A73535', borderRadius: 7, borderWidth: 1,
    marginTop: 11, paddingVertical: 9,
  },
  leaveText: { color: '#A73535', fontFamily: 'dogicapixelbold', fontSize: 7 },
  primaryButton: {
    backgroundColor: '#1BA39C', borderColor: '#111111', borderRadius: 8, borderWidth: 1,
    marginTop: 16, paddingHorizontal: 20, paddingVertical: 12,
  },
  primaryButtonText: { color: '#FFFFFF', fontFamily: 'dogicapixelbold', fontSize: 8 },
  pressed: { opacity: 0.72 },
  expiredBackdrop: {
    ...StyleSheet.absoluteFillObject, alignItems: 'center', backgroundColor: 'rgba(16,24,34,0.78)',
    justifyContent: 'center', zIndex: 50,
  },
  expiredCard: {
    alignItems: 'center', backgroundColor: '#FFF1CD', borderColor: '#111111', borderRadius: 14,
    borderWidth: 2, maxWidth: 460, padding: 24, width: '72%',
  },
  expiredTitle: { color: '#A73535', fontFamily: 'dogicapixelbold', fontSize: 14 },
  expiredText: {
    color: '#2C3E50', fontFamily: 'dogicapixel', fontSize: 8, lineHeight: 14,
    marginTop: 12, textAlign: 'center',
  },
});

export default ConnectionOverlay;
