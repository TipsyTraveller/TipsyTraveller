import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTeamPlayers } from '../constants/challenges';

const getShortTeamLabel = (label = '', index = 0) => {
  const match = String(label).match(/(\d+)/);
  if (match) return `T${match[1]}`;
  return String(label).slice(0, 3).toUpperCase() || `T${index + 1}`;
};

const GameHud = ({
  activeTeamColor = '#1BA39C',
  activeTeamId,
  activeTeamLabel = 'Team 1',
  canRestart,
  fromName = 'Start',
  gamePieces = [],
  isDetour = false,
  lastRoll,
  onAdjustDrinks,
  onRestart,
  progress = '1 / 1',
  remainingMoves = 0,
  routeStopNames = [],
  state,
  teamMembers,
  teamProgress = {},
  toName = '',
  totalStops = 1,
  turnNumber = 1,
}) => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (state === 'done' || state === 'roadblock' || state === 'challenge') {
      setIsExpanded(false);
    }
  }, [state]);

  const standings = useMemo(() => (
    [...gamePieces].sort((left, right) => {
      const leftProgress = teamProgress[left.id] || {};
      const rightProgress = teamProgress[right.id] || {};
      if (leftProgress.finishPosition && rightProgress.finishPosition) {
        return leftProgress.finishPosition - rightProgress.finishPosition;
      }
      if (leftProgress.finishPosition) return -1;
      if (rightProgress.finishPosition) return 1;
      const scoreDiff = (rightProgress.score || 0) - (leftProgress.score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (rightProgress.currentLeg || 0) - (leftProgress.currentLeg || 0);
    })
  ), [gamePieces, teamProgress]);

  const statusLine = useMemo(() => {
    if (state === 'moving') {
      const stopsWord = remainingMoves === 1 ? 'stop' : 'stops';
      return `ROLL ${lastRoll ?? '?'} · ${fromName} → ${toName} (${remainingMoves} ${stopsWord})`;
    }
    if (state === 'challenge') {
      return `CHALLENGE · ${fromName}`;
    }
    if (isDetour) {
      return `DETOUR · ${fromName} · Stop ${progress}`;
    }
    return `📍 ${fromName} · Stop ${progress}`;
  }, [fromName, isDetour, lastRoll, progress, remainingMoves, state, toName]);

  const maxExpandedHeight = Math.max(210, height - insets.top - insets.bottom - 16);
  const expandedWidth = Math.min(390, Math.max(276, width - insets.left - insets.right - 76));

  return (
    <>
      {state !== 'done' && state !== 'roadblock' && (
        <>
          {isExpanded && (
            <Pressable
              accessibilityLabel="Close scoreboard"
              onPress={() => setIsExpanded(false)}
              style={styles.backdrop}
            />
          )}

          <View
            pointerEvents="box-none"
            style={[
              styles.hudPositioner,
              {
                left: insets.left + 10,
                top: insets.top + 8,
              },
            ]}
          >
            {!isExpanded ? (
              <Pressable
                accessibilityHint="Expands the team scoreboard and drink tracker"
                accessibilityLabel={`${activeTeamLabel} turn, ${statusLine}. Tap to open scoreboard and drink tracker`}
                accessibilityRole="button"
                onPress={() => setIsExpanded(true)}
                style={({ pressed }) => [
                  styles.collapsedCard,
                  pressed && styles.cardPressed,
                ]}
              >
                <View style={styles.collapsedHeaderRow}>
                  <View style={styles.activeTeamWrap}>
                    <View
                      style={[
                        styles.activeTeamDot,
                        { backgroundColor: activeTeamColor || '#1BA39C' },
                      ]}
                    />
                    <Text numberOfLines={1} style={styles.activeTeamTitle}>
                      {activeTeamLabel}
                    </Text>
                    {isDetour && (
                      <View style={styles.detourMiniBadge}>
                        <Text style={styles.detourMiniBadgeText}>DETOUR</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.expandPill}>
                    <Text style={styles.expandPillText}>SCORE ▾</Text>
                  </View>
                </View>

                <Text numberOfLines={1} style={styles.statusText}>
                  {statusLine}
                </Text>

                <View style={styles.miniStandingsRow}>
                  {gamePieces.map((piece, index) => {
                    const pieceProgress = teamProgress[piece.id] || {};
                    const isActive = piece.id === activeTeamId;
                    const drinks = Number(pieceProgress.drinks) || 0;
                    const score = Number(pieceProgress.score) || 0;

                    return (
                      <View
                        key={piece.id}
                        style={[
                          styles.miniTeamChip,
                          isActive && styles.miniTeamChipActive,
                        ]}
                      >
                        <View
                          style={[
                            styles.miniTeamDot,
                            { backgroundColor: piece.color },
                          ]}
                        />
                        <Text style={styles.miniTeamLabel}>
                          {getShortTeamLabel(piece.label, index)}
                        </Text>
                        <Text style={styles.miniTeamScore}>{`${score}P`}</Text>
                        <View style={[styles.miniDrinkBadge, drinks > 0 && styles.miniDrinkBadgeActive]}>
                          <Text style={styles.miniDrinkText}>{`🍺${drinks}`}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </Pressable>
            ) : (
              <View
                style={[
                  styles.expandedCard,
                  {
                    width: expandedWidth,
                    maxHeight: maxExpandedHeight,
                  },
                ]}
              >
                <View style={styles.expandedHeader}>
                  <View style={styles.expandedTitleWrap}>
                    <Text style={styles.expandedTitle}>SCOREBOARD & DRINKS</Text>
                    <Text style={styles.expandedSubtitle}>
                      {`TURN ${turnNumber} · ${activeTeamLabel.toUpperCase()}`}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityLabel="Collapse scoreboard"
                    accessibilityRole="button"
                    onPress={() => setIsExpanded(false)}
                    style={({ pressed }) => [
                      styles.collapseButton,
                      pressed && styles.controlButtonPressed,
                    ]}
                  >
                    <Text style={styles.collapseButtonText}>▴ HIDE</Text>
                  </Pressable>
                </View>

                <View style={styles.activeBanner}>
                  <View
                    style={[
                      styles.activeTeamDot,
                      { backgroundColor: activeTeamColor || '#1BA39C' },
                    ]}
                  />
                  <Text numberOfLines={1} style={styles.activeBannerText}>
                    {statusLine}
                  </Text>
                </View>

                <ScrollView
                  bounces={false}
                  contentContainerStyle={styles.teamListContent}
                  showsVerticalScrollIndicator={false}
                  style={styles.teamListScroll}
                >
                  {standings.map((piece, index) => {
                    const pieceProgress = teamProgress[piece.id] || {};
                    const isActive = piece.id === activeTeamId;
                    const legIndex = Number(pieceProgress.currentLeg) || 0;
                    const stopName = routeStopNames[legIndex] || fromName || 'Start';
                    const stopNumber = Math.min(legIndex + 1, Math.max(1, totalStops));
                    const score = Number(pieceProgress.score) || 0;
                    const drinks = Number(pieceProgress.drinks) || 0;
                    const playerDrinksMap = pieceProgress.playerDrinks || {};
                    const players = getTeamPlayers(teamMembers, piece.id);

                    return (
                      <View
                        key={piece.id}
                        style={[
                          styles.teamRowCard,
                          isActive && styles.teamRowCardActive,
                        ]}
                      >
                        <View style={styles.teamRowMain}>
                          <View style={styles.teamIdentityCol}>
                            <View style={styles.teamTitleLine}>
                              <Text style={styles.rankBadgeText}>{`#${index + 1}`}</Text>
                              <View
                                style={[
                                  styles.teamDot,
                                  { backgroundColor: piece.color },
                                ]}
                              />
                              <Text numberOfLines={1} style={styles.teamRowName}>
                                {piece.label}
                              </Text>
                              {isActive && (
                                <View style={styles.turnTag}>
                                  <Text style={styles.turnTagText}>TURN</Text>
                                </View>
                              )}
                              {pieceProgress.detour && (
                                <View style={styles.detourTag}>
                                  <Text style={styles.detourTagText}>DETOUR</Text>
                                </View>
                              )}
                              {pieceProgress.isDone && (
                                <View style={styles.doneTag}>
                                  <Text style={styles.doneTagText}>FINISH</Text>
                                </View>
                              )}
                            </View>

                            <Text numberOfLines={1} style={styles.teamMetaText}>
                              {`📍 ${stopName} (${stopNumber}/${Math.max(1, totalStops)}) · ${score} PTS`}
                            </Text>
                          </View>

                          <View style={styles.drinkControlsWrap}>
                            <Pressable
                              accessibilityLabel={`Remove drink from ${piece.label}`}
                              accessibilityRole="button"
                              disabled={drinks <= 0}
                              onPress={() => onAdjustDrinks?.({ teamId: piece.id, delta: -1 })}
                              style={({ pressed }) => [
                                styles.drinkAdjustBtn,
                                drinks <= 0 && styles.drinkAdjustBtnDisabled,
                                pressed && drinks > 0 && styles.controlButtonPressed,
                              ]}
                            >
                              <Text style={styles.drinkAdjustBtnText}>−</Text>
                            </Pressable>

                            <View style={styles.drinkCountBox}>
                              <Text style={styles.drinkCountValue}>{`🍺 ${drinks}`}</Text>
                              <Text style={styles.drinkCountLabel}>
                                {drinks === 1 ? 'SIP' : 'SIPS'}
                              </Text>
                            </View>

                            <Pressable
                              accessibilityLabel={`Add drink to ${piece.label}`}
                              accessibilityRole="button"
                              onPress={() => onAdjustDrinks?.({ teamId: piece.id, delta: 1 })}
                              style={({ pressed }) => [
                                styles.drinkAdjustBtn,
                                styles.drinkAddBtn,
                                pressed && styles.controlButtonPressed,
                              ]}
                            >
                              <Text style={[styles.drinkAdjustBtnText, styles.drinkAddBtnText]}>+</Text>
                            </Pressable>
                          </View>
                        </View>

                        {players.length > 0 && (
                          <View style={styles.playersSection}>
                            {players.map((player, playerIndex) => {
                              const playerName = player.name || `Player ${playerIndex + 1}`;
                              const pDrinks = Math.max(0, Number(playerDrinksMap[playerName]) || 0);

                              return (
                                <View
                                  key={`${piece.id}-${playerName}-${playerIndex}`}
                                  style={styles.playerChip}
                                >
                                  <Text numberOfLines={1} style={styles.playerChipName}>
                                    {playerName}
                                  </Text>
                                  {pDrinks > 0 && (
                                    <Pressable
                                      accessibilityLabel={`Remove drink from ${playerName}`}
                                      accessibilityRole="button"
                                      onPress={() => onAdjustDrinks?.({
                                        teamId: piece.id,
                                        delta: -1,
                                        playerName,
                                      })}
                                      style={({ pressed }) => [
                                        styles.playerMiniBtn,
                                        pressed && styles.controlButtonPressed,
                                      ]}
                                    >
                                      <Text style={styles.playerMiniBtnText}>−</Text>
                                    </Pressable>
                                  )}
                                  <Text style={styles.playerChipDrinks}>{`🍺${pDrinks}`}</Text>
                                  <Pressable
                                    accessibilityLabel={`Add drink to ${playerName}`}
                                    accessibilityRole="button"
                                    onPress={() => onAdjustDrinks?.({
                                      teamId: piece.id,
                                      delta: 1,
                                      playerName,
                                    })}
                                    style={({ pressed }) => [
                                      styles.playerMiniBtn,
                                      styles.playerMiniAddBtn,
                                      pressed && styles.controlButtonPressed,
                                    ]}
                                  >
                                    <Text style={[styles.playerMiniBtnText, styles.playerMiniAddText]}>+</Text>
                                  </Pressable>
                                </View>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>

                <Text style={styles.footerHintText}>
                  Auto-tracks challenge penalties · Tap + / − for extra sips
                </Text>
              </View>
            )}
          </View>
        </>
      )}

      {state === 'done' && (
        <View
          pointerEvents={canRestart ? 'auto' : 'none'}
          style={[styles.doneOverlay, { top: insets.top + 8 }]}
        >
          <Text style={styles.doneText}>{standings[0]?.label} wins!</Text>
          <View style={styles.standings}>
            {standings.map((piece, index) => {
              const pieceProgress = teamProgress[piece.id] || {};
              const drinks = Number(pieceProgress.drinks) || 0;
              return (
                <View key={piece.id} style={styles.standingRow}>
                  <Text style={styles.standingPlace}>{`#${index + 1}`}</Text>
                  <View style={[styles.teamDot, { backgroundColor: piece.color }]} />
                  <Text style={styles.standingTeam}>{piece.label}</Text>
                  <Text style={styles.standingDrinks}>{`🍺 ${drinks}`}</Text>
                  <Text style={styles.standingScore}>{`${pieceProgress.score || 0} PTS`}</Text>
                </View>
              );
            })}
          </View>
          {canRestart ? (
            <TouchableOpacity
              accessibilityLabel="Restart game"
              accessibilityRole="button"
              onPress={onRestart}
              style={styles.restartButton}
            >
              <Text style={styles.restartText}>Restart</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.hostRestartText}>Host restarts</Text>
          )}
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 17, 17, 0.18)',
    zIndex: 8,
  },
  hudPositioner: {
    position: 'absolute',
    zIndex: 9,
  },
  collapsedCard: {
    minWidth: 215,
    maxWidth: 320,
    backgroundColor: 'rgba(255, 241, 205, 0.96)',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderWidth: 2.5,
    borderColor: '#111111',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 0,
    elevation: 5,
  },
  cardPressed: {
    transform: [{ translateY: 1 }],
    opacity: 0.95,
  },
  collapsedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  activeTeamWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: 6,
  },
  activeTeamDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#111111',
  },
  activeTeamTitle: {
    color: '#111111',
    fontSize: 10,
    fontFamily: 'dogicapixelbold',
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  detourMiniBadge: {
    backgroundColor: '#FFD700',
    borderWidth: 1,
    borderColor: '#111111',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  detourMiniBadgeText: {
    color: '#111111',
    fontFamily: 'dogicapixelbold',
    fontSize: 6,
  },
  expandPill: {
    backgroundColor: '#223144',
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#111111',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  expandPillText: {
    color: '#FFF1CD',
    fontFamily: 'dogicapixelbold',
    fontSize: 7,
  },
  statusText: {
    color: '#2C3E50',
    fontSize: 8,
    fontFamily: 'dogicapixel',
    marginTop: 5,
  },
  miniStandingsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    paddingTop: 5,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(17, 17, 17, 0.16)',
  },
  miniTeamChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1.5,
    borderColor: '#2C3E50',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2.5,
  },
  miniTeamChipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#111111',
    borderWidth: 2,
  },
  miniTeamDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#111111',
  },
  miniTeamLabel: {
    color: '#111111',
    fontFamily: 'dogicapixelbold',
    fontSize: 7,
  },
  miniTeamScore: {
    color: '#1BA39C',
    fontFamily: 'dogicapixelbold',
    fontSize: 7,
  },
  miniDrinkBadge: {
    backgroundColor: 'rgba(34, 49, 68, 0.1)',
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  miniDrinkBadgeActive: {
    backgroundColor: '#FFE082',
  },
  miniDrinkText: {
    color: '#111111',
    fontFamily: 'dogicapixelbold',
    fontSize: 7,
  },

  expandedCard: {
    backgroundColor: '#FFF1CD',
    borderRadius: 11,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderWidth: 3,
    borderColor: '#111111',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 8,
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  expandedTitleWrap: {
    flex: 1,
  },
  expandedTitle: {
    color: '#111111',
    fontFamily: 'dogicapixelbold',
    fontSize: 10,
  },
  expandedSubtitle: {
    color: '#1BA39C',
    fontFamily: 'dogicapixelbold',
    fontSize: 7,
    marginTop: 2,
  },
  collapseButton: {
    backgroundColor: '#223144',
    borderWidth: 1.5,
    borderColor: '#111111',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  collapseButtonText: {
    color: '#FFF1CD',
    fontFamily: 'dogicapixelbold',
    fontSize: 7,
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 7,
    backgroundColor: 'rgba(34, 49, 68, 0.08)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(17, 17, 17, 0.2)',
  },
  activeBannerText: {
    flex: 1,
    color: '#223144',
    fontFamily: 'dogicapixel',
    fontSize: 7.5,
  },
  teamListScroll: {
    marginTop: 7,
  },
  teamListContent: {
    gap: 6,
    paddingBottom: 2,
  },
  teamRowCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#111111',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  teamRowCardActive: {
    backgroundColor: '#FFFDF5',
    borderColor: '#1BA39C',
  },
  teamRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  teamIdentityCol: {
    flex: 1,
    gap: 3,
  },
  teamTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
  },
  rankBadgeText: {
    color: '#D71920',
    fontFamily: 'dogicapixelbold',
    fontSize: 8,
  },
  teamDot: {
    width: 9,
    height: 9,
    borderWidth: 1.5,
    borderColor: '#111111',
    borderRadius: 5,
  },
  teamRowName: {
    color: '#111111',
    fontFamily: 'dogicapixelbold',
    fontSize: 8.5,
    flexShrink: 1,
  },
  turnTag: {
    backgroundColor: '#1BA39C',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1.5,
  },
  turnTagText: {
    color: '#FFFFFF',
    fontFamily: 'dogicapixelbold',
    fontSize: 6,
  },
  detourTag: {
    backgroundColor: '#FFD700',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderWidth: 1,
    borderColor: '#111111',
  },
  detourTagText: {
    color: '#111111',
    fontFamily: 'dogicapixelbold',
    fontSize: 6,
  },
  doneTag: {
    backgroundColor: '#27AE60',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1.5,
  },
  doneTagText: {
    color: '#FFFFFF',
    fontFamily: 'dogicapixelbold',
    fontSize: 6,
  },
  teamMetaText: {
    color: '#2C3E50',
    fontFamily: 'dogicapixel',
    fontSize: 7,
  },
  drinkControlsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  drinkAdjustBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#111111',
    backgroundColor: '#FFF1CD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drinkAdjustBtnDisabled: {
    opacity: 0.35,
  },
  drinkAddBtn: {
    backgroundColor: '#1BA39C',
  },
  drinkAdjustBtnText: {
    color: '#111111',
    fontFamily: 'dogicapixelbold',
    fontSize: 10,
    lineHeight: 12,
  },
  drinkAddBtnText: {
    color: '#FFFFFF',
  },
  drinkCountBox: {
    minWidth: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE082',
    borderWidth: 1.5,
    borderColor: '#111111',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  drinkCountValue: {
    color: '#111111',
    fontFamily: 'dogicapixelbold',
    fontSize: 8,
  },
  drinkCountLabel: {
    color: '#2C3E50',
    fontFamily: 'dogicapixel',
    fontSize: 5.5,
    marginTop: 1,
  },
  playersSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 6,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: 'rgba(17, 17, 17, 0.12)',
  },
  playerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF1CD',
    borderWidth: 1,
    borderColor: '#111111',
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  playerChipName: {
    color: '#223144',
    fontFamily: 'dogicapixelbold',
    fontSize: 6.5,
    maxWidth: 90,
  },
  playerChipDrinks: {
    color: '#111111',
    fontFamily: 'dogicapixelbold',
    fontSize: 6.5,
  },
  playerMiniBtn: {
    width: 15,
    height: 15,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#111111',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerMiniAddBtn: {
    backgroundColor: '#1BA39C',
  },
  playerMiniBtnText: {
    color: '#111111',
    fontFamily: 'dogicapixelbold',
    fontSize: 8,
    lineHeight: 10,
  },
  playerMiniAddText: {
    color: '#FFFFFF',
  },
  controlButtonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.96 }],
  },
  footerHintText: {
    color: '#2C3E50',
    fontFamily: 'dogicapixel',
    fontSize: 6.5,
    textAlign: 'center',
    marginTop: 6,
  },

  doneOverlay: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    backgroundColor: '#FFF1CD',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderWidth: 3,
    borderColor: '#FFD700',
    minWidth: 270,
    zIndex: 10,
  },
  doneText: {
    color: '#111111',
    fontSize: 14,
    fontFamily: 'dogicapixelbold',
    textAlign: 'center',
  },
  standings: {
    marginTop: 9,
    gap: 5,
  },
  standingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  standingPlace: {
    width: 22,
    color: '#D71920',
    fontFamily: 'dogicapixelbold',
    fontSize: 8,
  },
  standingTeam: {
    flex: 1,
    color: '#2C3E50',
    fontFamily: 'dogicapixelbold',
    fontSize: 8,
  },
  standingDrinks: {
    color: '#111111',
    fontFamily: 'dogicapixelbold',
    fontSize: 8,
    marginRight: 4,
  },
  standingScore: {
    color: '#111111',
    fontFamily: 'dogicapixelbold',
    fontSize: 8,
  },
  restartButton: {
    marginTop: 8,
    minHeight: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#111111',
    borderRadius: 7,
    backgroundColor: '#1BA39C',
  },
  restartText: {
    color: '#FFFFFF',
    fontFamily: 'dogicapixelbold',
    fontSize: 9,
    textTransform: 'uppercase',
  },
  hostRestartText: {
    marginTop: 7,
    color: '#2C3E50',
    fontFamily: 'dogicapixel',
    fontSize: 8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});

export default GameHud;
