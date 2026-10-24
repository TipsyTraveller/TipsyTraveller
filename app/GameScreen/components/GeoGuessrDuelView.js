import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import { EUROPE_MAP_PATH_DATA, EUROPE_SVG_VIEWBOX } from '../constants/europeMapPaths';
import {
  boardToSvgCoords,
  normalizedMapToBoard,
} from '../constants/monumentPool';

const TEAM_COLORS = {
  team1: '#E84855',
  team2: '#1BA39C',
  team3: '#F4B942',
};

const GeoGuessrEuropeMap = ({
  canPlacePin,
  compact,
  draftPosition,
  gamePieces = [],
  guesses = {},
  onSelectPosition,
  revealTarget = false,
  targetPosition,
}) => {
  const [mapLayout, setMapLayout] = useState({ width: 1, height: 1 });
  const [mapView, setMapView] = useState({ centerX: 0.5, centerY: 0.5, zoom: 1 });
  const gesture = useRef(null);

  const clampCenter = (centerX, centerY, zoom) => {
    const halfWidth = 0.5 / zoom;
    const halfHeight = 0.5 / zoom;
    return {
      centerX: Math.max(halfWidth, Math.min(1 - halfWidth, centerX)),
      centerY: Math.max(halfHeight, Math.min(1 - halfHeight, centerY)),
      zoom,
    };
  };

  const setZoom = (nextZoom) => {
    const zoom = Math.max(1, Math.min(4, nextZoom));
    setMapView((current) => clampCenter(current.centerX, current.centerY, zoom));
  };

  const handleResponderGrant = (event) => {
    const { locationX, locationY } = event.nativeEvent;
    gesture.current = {
      startX: locationX,
      startY: locationY,
      startView: mapView,
      moved: false,
    };
  };

  const handleResponderMove = (event) => {
    if (!gesture.current) return;
    const { locationX, locationY } = event.nativeEvent;
    const deltaX = locationX - gesture.current.startX;
    const deltaY = locationY - gesture.current.startY;
    if (Math.hypot(deltaX, deltaY) > 5) gesture.current.moved = true;
    if (mapView.zoom <= 1) return;
    const width = Math.max(1, mapLayout.width);
    const height = Math.max(1, mapLayout.height);
    const { startView } = gesture.current;
    setMapView(clampCenter(
      startView.centerX - deltaX / (width * startView.zoom),
      startView.centerY - deltaY / (height * startView.zoom),
      startView.zoom
    ));
  };

  const handleResponderRelease = (event) => {
    const activeGesture = gesture.current;
    gesture.current = null;
    if (!canPlacePin || !onSelectPosition || activeGesture?.moved) return;
    const { locationX, locationY } = event.nativeEvent;
    if (!Number.isFinite(locationX) || !Number.isFinite(locationY)) return;
    const width = Math.max(1, mapLayout.width);
    const height = Math.max(1, mapLayout.height);
    const normX = mapView.centerX + ((locationX / width) - 0.5) / mapView.zoom;
    const normY = mapView.centerY + ((locationY / height) - 0.5) / mapView.zoom;
    onSelectPosition(normalizedMapToBoard(normX, normY));
  };

  const targetSvg = useMemo(
    () => (targetPosition ? boardToSvgCoords(targetPosition) : null),
    [targetPosition]
  );

  const draftSvg = useMemo(
    () => (draftPosition ? boardToSvgCoords(draftPosition) : null),
    [draftPosition]
  );

  const teamById = useMemo(
    () => Object.fromEntries((gamePieces || []).map((piece) => [piece.id, piece])),
    [gamePieces]
  );

  const visibleWidth = EUROPE_SVG_VIEWBOX.width / mapView.zoom;
  const visibleHeight = EUROPE_SVG_VIEWBOX.height / mapView.zoom;
  const viewBoxX = EUROPE_SVG_VIEWBOX.minX + mapView.centerX * EUROPE_SVG_VIEWBOX.width - visibleWidth / 2;
  const viewBoxY = EUROPE_SVG_VIEWBOX.minY + mapView.centerY * EUROPE_SVG_VIEWBOX.height - visibleHeight / 2;
  const viewBoxString = `${viewBoxX} ${viewBoxY} ${visibleWidth} ${visibleHeight}`;
  const markerScale = 1 / mapView.zoom;

  return (
    <View
      style={[styles.mapFrame, compact && styles.mapFrameCompact]}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        if (width > 0 && height > 0) {
          setMapLayout({ width, height });
        }
      }}
      onStartShouldSetResponder={() => Boolean(canPlacePin)}
      onMoveShouldSetResponder={() => Boolean(canPlacePin)}
      onResponderGrant={handleResponderGrant}
      onResponderMove={handleResponderMove}
      onResponderRelease={handleResponderRelease}
      onResponderTerminate={() => { gesture.current = null; }}
    >
      <Svg
        viewBox={viewBoxString}
        width="100%"
        height="100%"
        preserveAspectRatio="none"
      >
        <Rect
          x={EUROPE_SVG_VIEWBOX.minX}
          y={EUROPE_SVG_VIEWBOX.minY}
          width={EUROPE_SVG_VIEWBOX.width}
          height={EUROPE_SVG_VIEWBOX.height}
          fill="#223144"
        />
        <Path
          d={EUROPE_MAP_PATH_DATA}
          fill="#FFF1CD"
          stroke="#718091"
          strokeWidth={0.35 * markerScale}
          strokeLinejoin="round"
        />

        {revealTarget && targetSvg && Object.entries(guesses || {}).map(([teamId, guess]) => {
          const guessSvg = boardToSvgCoords(guess);
          const color = teamById[teamId]?.color || TEAM_COLORS[teamId] || '#1BA39C';
          return (
            <G key={`result-pin-${teamId}`}>
              <Line
                x1={guessSvg.svgX}
                y1={guessSvg.svgY}
                x2={targetSvg.svgX}
                y2={targetSvg.svgY}
                stroke={color}
                strokeWidth="2.2"
                strokeDasharray="4,3"
              />
              <Circle
                cx={guessSvg.svgX}
                cy={guessSvg.svgY}
                r={3.8 * markerScale}
                fill={color}
                stroke="#111111"
                strokeWidth={1.5 * markerScale}
              />
              <Circle
                cx={guessSvg.svgX}
                cy={guessSvg.svgY}
                r={1.25 * markerScale}
                fill="#FFFFFF"
              />
            </G>
          );
        })}

        {revealTarget && targetSvg && (
          <G>
            <Circle
              cx={targetSvg.svgX}
              cy={targetSvg.svgY}
              r={7 * markerScale}
              fill="rgba(255, 215, 0, 0.28)"
              stroke="#FFD700"
              strokeWidth={1.3 * markerScale}
            />
            <Circle
              cx={targetSvg.svgX}
              cy={targetSvg.svgY}
              r={4.2 * markerScale}
              fill="#FFD700"
              stroke="#111111"
              strokeWidth={1.6 * markerScale}
            />
            <Circle
              cx={targetSvg.svgX}
              cy={targetSvg.svgY}
              r={1.4 * markerScale}
              fill="#D71920"
            />
          </G>
        )}

        {!revealTarget && draftSvg && (
          <G>
            <Circle
              cx={draftSvg.svgX}
              cy={draftSvg.svgY}
              r={6.4 * markerScale}
              fill="rgba(27, 163, 156, 0.25)"
              stroke="#1BA39C"
              strokeWidth={1.2 * markerScale}
            />
            <Circle
              cx={draftSvg.svgX}
              cy={draftSvg.svgY}
              r={3.7 * markerScale}
              fill="#D71920"
              stroke="#111111"
              strokeWidth={1.5 * markerScale}
            />
            <Circle
              cx={draftSvg.svgX}
              cy={draftSvg.svgY}
              r={1.2 * markerScale}
              fill="#FFF1CD"
            />
          </G>
        )}
      </Svg>

      {canPlacePin && (
        <View style={styles.mapControls} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zoom in on Europe map"
            disabled={mapView.zoom >= 4}
            style={({ pressed }) => [styles.mapControlButton, mapView.zoom >= 4 && styles.buttonDisabled, pressed && styles.buttonPressed]}
            onPress={() => setZoom(mapView.zoom + 1)}
          >
            <Text style={styles.mapControlText}>+</Text>
          </Pressable>
          <View style={styles.zoomReadout}>
            <Text style={styles.zoomReadoutText}>{`${mapView.zoom}×`}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zoom out on Europe map"
            disabled={mapView.zoom <= 1}
            style={({ pressed }) => [styles.mapControlButton, mapView.zoom <= 1 && styles.buttonDisabled, pressed && styles.buttonPressed]}
            onPress={() => setZoom(mapView.zoom - 1)}
          >
            <Text style={styles.mapControlText}>−</Text>
          </Pressable>
        </View>
      )}

      {!revealTarget && (
        <View style={styles.mapHintPill} pointerEvents="none">
          <Text style={styles.mapHintText}>
            {canPlacePin
              ? (draftPosition ? 'DRAG TO MOVE · ZOOM FOR PRECISION · TAP TO ADJUST' : 'ZOOM, DRAG, THEN TAP TO DROP YOUR PIN')
              : 'WAITING FOR TEAMS TO LOCK IN'}
          </Text>
        </View>
      )}
    </View>
  );
};

export default function GeoGuessrDuelView({
  canComplete = true,
  challenge,
  compact = false,
  gamePieces = [],
  isTeamLeader = true,
  localTeamId = 'team1',
  multiplayerEnabled = false,
  onChallengeAction,
  remainingSeconds = 18,
}) {
  const stage = challenge?.stage || 'photo';
  const requiredTeamIds = useMemo(
    () => (
      Array.isArray(challenge?.requiredTeamIds) && challenge.requiredTeamIds.length
        ? challenge.requiredTeamIds
        : gamePieces.map((piece) => piece.id)
    ),
    [challenge?.requiredTeamIds, gamePieces]
  );

  const activeLocalPinTeamId = !multiplayerEnabled
    ? (requiredTeamIds[Number(challenge?.activePinTeamIndex) || 0] || requiredTeamIds[0] || 'team1')
    : (localTeamId || 'team1');

  const [draftPin, setDraftPin] = useState(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Reset draft pin whenever the active pinning team or challenge changes
  useEffect(() => {
    setDraftPin(null);
  }, [activeLocalPinTeamId, challenge?.monumentId, stage]);

  useEffect(() => {
    setImageFailed(false);
    setImageLoaded(false);
  }, [challenge?.monumentId]);

  const teamById = useMemo(
    () => Object.fromEntries((gamePieces || []).map((piece) => [piece.id, piece])),
    [gamePieces]
  );

  const guesses = challenge?.guesses || {};
  const hasLockedMultiplayerPin = Boolean(multiplayerEnabled && localTeamId && guesses[localTeamId]);
  const canCurrentDevicePin = stage === 'pinning' && (
    multiplayerEnabled
      ? (isTeamLeader && Boolean(localTeamId) && !hasLockedMultiplayerPin)
      : true
  );

  if (stage === 'photo') {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={[styles.duelBadge, challenge?.isRoadsideDuel && styles.roadsideBadge]}>
            <Text style={styles.duelBadgeText}>
              {challenge?.isRoadsideDuel ? '⚔ ROADSIDE DUEL · ALL TEAMS' : '🌍 PLACE DUEL · ALL TEAMS'}
            </Text>
          </View>
          <Text style={styles.timerReadout}>{`${remainingSeconds}S LEFT`}</Text>
        </View>

        <View style={[styles.postcardFrame, compact && styles.postcardFrameCompact]}>
          {!imageLoaded && !imageFailed ? (
            <View style={styles.photoStatus}>
              <Text style={styles.photoStatusTitle}>LOADING REAL PHOTO...</Text>
            </View>
          ) : null}
          {challenge?.monumentImageUrl && !imageFailed ? (
            <Image
              source={{ uri: challenge.monumentImageUrl }}
              style={styles.postcardImage}
              resizeMode="cover"
              onError={() => setImageFailed(true)}
              onLoad={() => setImageLoaded(true)}
            />
          ) : null}
          {imageFailed || !challenge?.monumentImageUrl ? (
            <View style={styles.photoStatus}>
              <Text style={styles.photoStatusTitle}>PHOTO UNAVAILABLE</Text>
              <Text style={styles.photoStatusText}>Check the connection and try this round again.</Text>
            </View>
          ) : null}
          <View style={styles.postcardClueBar}>
            <Text numberOfLines={2} style={styles.postcardClueText}>
              {challenge?.monumentClue || 'Memorize the place and its surroundings before the map opens!'}
            </Text>
            {challenge?.monumentImageAuthor || challenge?.monumentImageLicense ? (
              <Text numberOfLines={1} style={styles.photoCreditText}>
                {`PHOTO: ${challenge?.monumentImageAuthor || 'WIKIMEDIA COMMONS'}${challenge?.monumentImageLicense ? ` · ${challenge.monumentImageLicense}` : ''}`}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerInstruction}>
            Memorize this spot! In {remainingSeconds}s every team drops a pin on Europe.
          </Text>
          {canComplete ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open Europe map now"
              style={({ pressed }) => [styles.actionButton, pressed && styles.buttonPressed]}
              onPress={() => onChallengeAction?.({ type: 'startPinning' })}
            >
              <Text style={styles.actionButtonText}>OPEN MAP →</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  if (stage === 'pinning') {
    const activePinTeam = teamById[activeLocalPinTeamId];
    const activePinLabel = activePinTeam?.label || activeLocalPinTeamId.toUpperCase();
    const activePinColor = activePinTeam?.color || TEAM_COLORS[activeLocalPinTeamId] || '#1BA39C';

    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          {!multiplayerEnabled ? (
            <View style={[styles.teamTurnPill, { backgroundColor: activePinColor }]}>
              <Text style={styles.teamTurnPillText}>
                {`${activePinLabel}: DROP YOUR PIN (${(Number(challenge?.activePinTeamIndex) || 0) + 1}/${requiredTeamIds.length})`}
              </Text>
            </View>
          ) : (
            <View style={styles.statusChipRow}>
              {requiredTeamIds.map((teamId) => {
                const locked = Boolean(guesses[teamId]);
                const piece = teamById[teamId];
                return (
                  <View
                    key={`status-${teamId}`}
                    style={[
                      styles.statusChip,
                      locked && { backgroundColor: piece?.color || TEAM_COLORS[teamId] || '#1BA39C' },
                    ]}
                  >
                    <Text style={[styles.statusChipText, locked && styles.statusChipTextLocked]}>
                      {`${piece?.label || teamId.toUpperCase()} ${locked ? '✓' : '...'}`}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
          <Text style={styles.timerReadout}>{`${remainingSeconds}S`}</Text>
        </View>

        <GeoGuessrEuropeMap
          key={`${challenge?.monumentId || 'monument'}:${activeLocalPinTeamId}`}
          canPlacePin={canCurrentDevicePin}
          compact={compact}
          draftPosition={draftPin}
          gamePieces={gamePieces}
          guesses={guesses}
          onSelectPosition={setDraftPin}
          revealTarget={false}
          targetPosition={challenge?.targetPosition}
        />

        <View style={styles.footerRow}>
          {canCurrentDevicePin ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Lock in pin for ${activePinLabel}`}
              disabled={!draftPin}
              style={({ pressed }) => [
                styles.actionButton,
                styles.fullWidthButton,
                !draftPin && styles.buttonDisabled,
                pressed && draftPin && styles.buttonPressed,
              ]}
              onPress={() => {
                if (!draftPin) return;
                onChallengeAction?.({
                  type: 'submitPin',
                  teamId: activeLocalPinTeamId,
                  position: draftPin,
                });
              }}
            >
              <Text style={styles.actionButtonText}>
                {draftPin ? `LOCK IN ${activePinLabel.toUpperCase()} PIN` : 'TAP THE EUROPE MAP FIRST'}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.waitingRow}>
              <Text style={styles.footerInstruction}>
                {hasLockedMultiplayerPin
                  ? 'Pin locked! Waiting for other teams...'
                  : 'Team leaders are placing their pins on the map...'}
              </Text>
              {canComplete ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Reveal GeoGuessr results now"
                  style={({ pressed }) => [styles.actionButton, pressed && styles.buttonPressed]}
                  onPress={() => onChallengeAction?.({ type: 'finalizePinning' })}
                >
                  <Text style={styles.actionButtonText}>REVEAL</Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </View>
      </View>
    );
  }

  // stage === 'result'
  const winnerIds = Array.isArray(challenge?.winnerTeamIds) ? challenge.winnerTeamIds : [];
  const rankedTeams = requiredTeamIds
    .map((teamId) => ({
      teamId,
      label: teamById[teamId]?.label || teamId.toUpperCase(),
      color: teamById[teamId]?.color || TEAM_COLORS[teamId] || '#1BA39C',
      distanceKm: guesses?.[teamId]?.distanceKm ?? 9999,
      isWinner: winnerIds.includes(teamId),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const winnerNames = rankedTeams
    .filter((item) => item.isWinner)
    .map((item) => item.label)
    .join(' & ');

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.revealTitleWrap}>
          <Text numberOfLines={1} style={styles.revealMonumentName}>
            {`★ ${challenge?.monumentName || 'Mystery Place'}`}
          </Text>
          <Text numberOfLines={1} style={styles.revealMonumentLocation}>
            {`${challenge?.monumentCity ? `${challenge.monumentCity}, ` : ''}${challenge?.monumentCountryName || ''}`}
          </Text>
        </View>
        <View style={styles.winnerPointsPill}>
          <Text style={styles.winnerPointsText}>
            {`${winnerNames || 'WINNER'} +${challenge?.pointsAwarded || challenge?.successPoints || 15} PTS`}
          </Text>
        </View>
      </View>

      <GeoGuessrEuropeMap
        canPlacePin={false}
        compact={compact}
        draftPosition={null}
        gamePieces={gamePieces}
        guesses={guesses}
        revealTarget
        targetPosition={challenge?.targetPosition}
      />

      <View style={styles.leaderboardRow}>
        {rankedTeams.map((entry) => (
          <View
            key={`rank-${entry.teamId}`}
            style={[
              styles.rankCard,
              entry.isWinner && styles.rankCardWinner,
            ]}
          >
            <View style={[styles.teamDot, { backgroundColor: entry.color }]} />
            <View style={styles.rankCopy}>
              <Text numberOfLines={1} style={styles.rankTeamText}>
                {entry.label}
              </Text>
              <Text numberOfLines={1} style={styles.rankSubText}>
                {entry.isWinner
                  ? `${entry.distanceKm} KM · WINNER!`
                  : `${entry.distanceKm} KM · TAKE 2 SIPS`}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 6,
    justifyContent: 'space-between',
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  duelBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#111111',
    backgroundColor: '#1BA39C',
  },
  roadsideBadge: {
    backgroundColor: '#FFD700',
  },
  duelBadgeText: {
    color: '#111111',
    fontFamily: 'dogicapixelbold',
    fontSize: 7.5,
    textTransform: 'uppercase',
  },
  timerReadout: {
    color: '#D71920',
    fontFamily: 'dogicapixelbold',
    fontSize: 11,
  },
  postcardFrame: {
    flex: 1,
    minHeight: 110,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#111111',
    backgroundColor: '#223144',
    overflow: 'hidden',
    position: 'relative',
  },
  postcardFrameCompact: {
    minHeight: 88,
  },
  postcardImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  photoStatus: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    backgroundColor: '#223144',
  },
  photoStatusTitle: {
    color: '#FFF1CD',
    fontFamily: 'dogicapixelbold',
    fontSize: 10,
    textAlign: 'center',
  },
  photoStatusText: {
    marginTop: 7,
    color: '#9FB3C8',
    fontFamily: 'dogicapixel',
    fontSize: 7,
    lineHeight: 11,
    textAlign: 'center',
  },
  postcardClueBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(17, 17, 17, 0.82)',
    borderTopWidth: 2,
    borderTopColor: '#111111',
  },
  postcardClueText: {
    color: '#FFF1CD',
    fontFamily: 'dogicapixel',
    fontSize: 7.5,
    lineHeight: 12,
  },
  photoCreditText: {
    marginTop: 3,
    color: '#9FB3C8',
    fontFamily: 'dogicapixel',
    fontSize: 5.5,
    lineHeight: 8,
    textTransform: 'uppercase',
  },
  mapFrame: {
    flex: 1,
    minHeight: 112,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#111111',
    backgroundColor: '#223144',
    overflow: 'hidden',
    position: 'relative',
  },
  mapFrameCompact: {
    minHeight: 90,
  },
  mapControls: {
    position: 'absolute',
    top: 8,
    right: 8,
    alignItems: 'center',
    gap: 4,
  },
  mapControlButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: '#111111',
    backgroundColor: '#FFF1CD',
  },
  mapControlText: {
    color: '#111111',
    fontFamily: 'dogicapixelbold',
    fontSize: 18,
    lineHeight: 20,
  },
  zoomReadout: {
    minWidth: 34,
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FFF1CD',
    backgroundColor: 'rgba(17, 17, 17, 0.82)',
  },
  zoomReadoutText: {
    color: '#FFF1CD',
    fontFamily: 'dogicapixelbold',
    fontSize: 7,
    textAlign: 'center',
  },
  mapHintPill: {
    position: 'absolute',
    bottom: 5,
    alignSelf: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(17, 17, 17, 0.82)',
    borderWidth: 1.5,
    borderColor: '#FFF1CD',
  },
  mapHintText: {
    color: '#FFF1CD',
    fontFamily: 'dogicapixelbold',
    fontSize: 6.5,
  },
  teamTurnPill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#111111',
  },
  teamTurnPillText: {
    color: '#FFFFFF',
    fontFamily: 'dogicapixelbold',
    fontSize: 7.5,
    textTransform: 'uppercase',
  },
  statusChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    flex: 1,
  },
  statusChip: {
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#111111',
    backgroundColor: '#FAF3E0',
  },
  statusChipText: {
    color: '#111111',
    fontFamily: 'dogicapixelbold',
    fontSize: 7,
  },
  statusChipTextLocked: {
    color: '#FFFFFF',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  waitingRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  footerInstruction: {
    flex: 1,
    color: '#2C3E50',
    fontFamily: 'dogicapixel',
    fontSize: 7.5,
    lineHeight: 12,
  },
  actionButton: {
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 7,
    borderWidth: 2.5,
    borderBottomWidth: 5,
    borderColor: '#111111',
    backgroundColor: '#1BA39C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidthButton: {
    flex: 1,
  },
  buttonPressed: {
    transform: [{ translateY: 1 }],
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: '#111111',
    fontFamily: 'dogicapixelbold',
    fontSize: 8.5,
    textTransform: 'uppercase',
  },
  revealTitleWrap: {
    flex: 1,
  },
  revealMonumentName: {
    color: '#2C3E50',
    fontFamily: 'dogicapixelbold',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  revealMonumentLocation: {
    marginTop: 2,
    color: '#D71920',
    fontFamily: 'dogicapixelbold',
    fontSize: 7.5,
    textTransform: 'uppercase',
  },
  winnerPointsPill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#111111',
    backgroundColor: '#FFD700',
  },
  winnerPointsText: {
    color: '#111111',
    fontFamily: 'dogicapixelbold',
    fontSize: 7.5,
    textTransform: 'uppercase',
  },
  leaderboardRow: {
    flexDirection: 'row',
    gap: 6,
  },
  rankCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#111111',
    backgroundColor: '#FAF3E0',
  },
  rankCardWinner: {
    backgroundColor: '#E6F9F5',
    borderColor: '#111111',
  },
  teamDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#111111',
  },
  rankCopy: {
    flex: 1,
  },
  rankTeamText: {
    color: '#111111',
    fontFamily: 'dogicapixelbold',
    fontSize: 7.5,
    textTransform: 'uppercase',
  },
  rankSubText: {
    marginTop: 2,
    color: '#2C3E50',
    fontFamily: 'dogicapixel',
    fontSize: 6.5,
  },
});
