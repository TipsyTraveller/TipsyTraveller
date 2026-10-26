import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import {
  EUROPE_MAP_FILL_PATH_DATA,
  EUROPE_SVG_VIEWBOX,
} from '../constants/europeMapPaths';
import { EUROPE_MAP_OVERVIEW_PATH_DATA } from '../constants/europeMapOverviewPath';
import {
  boardToSvgCoords,
  GEO_GUESSR_IMAGE_HEADERS,
  getCachedMonumentPhotoDataUri,
  loadMonumentPhotoDataUri,
  normalizeMonumentImageUrl,
  normalizedMapToBoard,
} from '../constants/monumentPool';

const TEAM_COLORS = {
  team1: '#E84855',
  team2: '#1BA39C',
  team3: '#F4B942',
};

const MIN_MAP_ZOOM = 1;
const MAX_MAP_ZOOM = 4;
const INITIAL_MAP_ZOOM = 2.4;
const RESULT_MAP_ZOOM = 1.8;
const RESULT_MAP_PADDING = 0.09;
const DETAILED_MAP_ZOOM_THRESHOLD = 2.25;
const MAP_GESTURE_MOVE_THRESHOLD = 5;
const MAP_ASPECT_RATIO = EUROPE_SVG_VIEWBOX.width / EUROPE_SVG_VIEWBOX.height;

const getTouchPoint = (touch) => ({
  localX: Number.isFinite(touch?.locationX) ? touch.locationX : 0,
  localY: Number.isFinite(touch?.locationY) ? touch.locationY : 0,
  pageX: Number.isFinite(touch?.pageX) ? touch.pageX : 0,
  pageY: Number.isFinite(touch?.pageY) ? touch.pageY : 0,
});

const getTouchMetrics = (nativeEvent) => {
  const touches = nativeEvent?.touches?.length
    ? Array.from(nativeEvent.touches)
    : [nativeEvent];
  const points = touches.map(getTouchPoint);
  const pointCount = Math.max(1, points.length);
  const centroid = points.reduce((result, point) => ({
    localX: result.localX + point.localX / pointCount,
    localY: result.localY + point.localY / pointCount,
    pageX: result.pageX + point.pageX / pointCount,
    pageY: result.pageY + point.pageY / pointCount,
  }), { localX: 0, localY: 0, pageX: 0, pageY: 0 });
  const distance = points.length >= 2
    ? Math.hypot(points[0].pageX - points[1].pageX, points[0].pageY - points[1].pageY)
    : 0;

  return { centroid, distance, touchCount: points.length };
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
  const [mapView, setMapView] = useState({
    centerX: 0.5,
    centerY: 0.5,
    zoom: revealTarget ? RESULT_MAP_ZOOM : INITIAL_MAP_ZOOM,
  });
  const mapViewRef = useRef(mapView);
  const mapSvgRef = useRef(null);
  const gesture = useRef(null);
  const pendingMapView = useRef(null);
  const mapUpdateFrame = useRef(null);
  const resultMapPoints = useMemo(() => (
    [targetPosition, ...Object.values(guesses || {})]
      .filter((position) => (
        Number.isFinite(Number(position?.x)) && Number.isFinite(Number(position?.y))
      ))
      .map((position) => {
        const { svgX, svgY } = boardToSvgCoords(position);
        return {
          x: (svgX - EUROPE_SVG_VIEWBOX.minX) / EUROPE_SVG_VIEWBOX.width,
          y: (svgY - EUROPE_SVG_VIEWBOX.minY) / EUROPE_SVG_VIEWBOX.height,
        };
      })
  ), [guesses, targetPosition]);

  const getViewportSize = (zoom) => {
    const layoutAspectRatio = mapLayout.width / Math.max(1, mapLayout.height);
    return {
      width: Math.max(1, layoutAspectRatio / MAP_ASPECT_RATIO) / zoom,
      height: Math.max(1, MAP_ASPECT_RATIO / layoutAspectRatio) / zoom,
    };
  };

  const clampCenter = (centerX, centerY, zoom) => {
    const viewport = getViewportSize(zoom);
    const halfWidth = Math.min(0.5, viewport.width / 2);
    const halfHeight = Math.min(0.5, viewport.height / 2);
    return {
      centerX: Math.max(halfWidth, Math.min(1 - halfWidth, centerX)),
      centerY: Math.max(halfHeight, Math.min(1 - halfHeight, centerY)),
      zoom,
    };
  };

  const getNativeViewBox = (view) => {
    const viewport = getViewportSize(view.zoom);
    const width = EUROPE_SVG_VIEWBOX.width * viewport.width;
    const height = EUROPE_SVG_VIEWBOX.height * viewport.height;
    return {
      minX: EUROPE_SVG_VIEWBOX.minX + view.centerX * EUROPE_SVG_VIEWBOX.width - width / 2,
      minY: EUROPE_SVG_VIEWBOX.minY + view.centerY * EUROPE_SVG_VIEWBOX.height - height / 2,
      vbWidth: width,
      vbHeight: height,
      align: 'none',
      meetOrSlice: 2,
    };
  };

  const getResultMapView = () => {
    if (!resultMapPoints.length) {
      return { centerX: 0.5, centerY: 0.5, zoom: RESULT_MAP_ZOOM };
    }

    const xValues = resultMapPoints.map((point) => point.x);
    const yValues = resultMapPoints.map((point) => point.y);
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    const baseViewport = getViewportSize(MIN_MAP_ZOOM);
    const requiredWidth = Math.max(0.2, maxX - minX + RESULT_MAP_PADDING * 2);
    const requiredHeight = Math.max(0.2, maxY - minY + RESULT_MAP_PADDING * 2);
    const zoom = Math.max(MIN_MAP_ZOOM, Math.min(
      RESULT_MAP_ZOOM,
      baseViewport.width / requiredWidth,
      baseViewport.height / requiredHeight
    ));

    return clampCenter((minX + maxX) / 2, (minY + maxY) / 2, zoom);
  };

  const commitMapView = (nextView) => {
    if (mapUpdateFrame.current !== null) {
      cancelAnimationFrame(mapUpdateFrame.current);
      mapUpdateFrame.current = null;
      pendingMapView.current = null;
    }
    mapViewRef.current = nextView;
    setMapView(nextView);
  };

  const scheduleMapView = (nextView) => {
    const crossedDetailThreshold = (
      mapViewRef.current.zoom >= DETAILED_MAP_ZOOM_THRESHOLD
    ) !== (nextView.zoom >= DETAILED_MAP_ZOOM_THRESHOLD);
    mapViewRef.current = nextView;
    pendingMapView.current = nextView;
    if (crossedDetailThreshold) setMapView(nextView);
    if (mapUpdateFrame.current !== null) return;
    mapUpdateFrame.current = requestAnimationFrame(() => {
      mapUpdateFrame.current = null;
      if (!pendingMapView.current) return;
      const pendingView = pendingMapView.current;
      pendingMapView.current = null;
      mapSvgRef.current?.setNativeProps(getNativeViewBox(pendingView));
    });
  };

  const setZoom = (nextZoom) => {
    const zoom = Math.max(MIN_MAP_ZOOM, Math.min(MAX_MAP_ZOOM, nextZoom));
    const current = mapViewRef.current;
    commitMapView(clampCenter(current.centerX, current.centerY, zoom));
  };

  useEffect(() => () => {
    if (mapUpdateFrame.current !== null) cancelAnimationFrame(mapUpdateFrame.current);
  }, []);

  useEffect(() => {
    if (!revealTarget) {
      commitMapView({ centerX: 0.5, centerY: 0.5, zoom: INITIAL_MAP_ZOOM });
    }
  }, [revealTarget]);

  useEffect(() => {
    if (revealTarget) commitMapView(getResultMapView());
  }, [mapLayout.height, mapLayout.width, resultMapPoints, revealTarget]);

  const startGesture = (nativeEvent, inheritedMultiTouch = false) => {
    const metrics = getTouchMetrics(nativeEvent);
    gesture.current = {
      startMetrics: metrics,
      startView: mapViewRef.current,
      moved: false,
      usedMultiTouch: inheritedMultiTouch || metrics.touchCount >= 2,
    };
  };

  const handleResponderGrant = (event) => {
    startGesture(event.nativeEvent);
  };

  const handleResponderMove = (event) => {
    if (!gesture.current) return;
    const metrics = getTouchMetrics(event.nativeEvent);
    const activeGesture = gesture.current;

    if (metrics.touchCount !== activeGesture.startMetrics.touchCount) {
      const usedMultiTouch = activeGesture.usedMultiTouch || metrics.touchCount >= 2;
      startGesture(event.nativeEvent, usedMultiTouch);
      return;
    }

    const deltaX = metrics.centroid.pageX - activeGesture.startMetrics.centroid.pageX;
    const deltaY = metrics.centroid.pageY - activeGesture.startMetrics.centroid.pageY;
    const distanceDelta = Math.abs(metrics.distance - activeGesture.startMetrics.distance);
    if (Math.hypot(deltaX, deltaY) > MAP_GESTURE_MOVE_THRESHOLD
      || distanceDelta > MAP_GESTURE_MOVE_THRESHOLD) {
      activeGesture.moved = true;
    }

    const width = Math.max(1, mapLayout.width);
    const height = Math.max(1, mapLayout.height);
    const { startMetrics, startView } = activeGesture;
    const startViewport = getViewportSize(startView.zoom);

    if (metrics.touchCount >= 2 && startMetrics.distance > 0) {
      const zoom = Math.max(
        MIN_MAP_ZOOM,
        Math.min(MAX_MAP_ZOOM, startView.zoom * (metrics.distance / startMetrics.distance))
      );
      const zoomViewport = getViewportSize(zoom);
      const startOffsetX = (startMetrics.centroid.localX / width) - 0.5;
      const startOffsetY = (startMetrics.centroid.localY / height) - 0.5;
      const currentOffsetX = (metrics.centroid.localX / width) - 0.5;
      const currentOffsetY = (metrics.centroid.localY / height) - 0.5;
      const anchorX = startView.centerX + startOffsetX * startViewport.width;
      const anchorY = startView.centerY + startOffsetY * startViewport.height;
      scheduleMapView(clampCenter(
        anchorX - currentOffsetX * zoomViewport.width,
        anchorY - currentOffsetY * zoomViewport.height,
        zoom
      ));
      return;
    }

    if (startView.zoom > MIN_MAP_ZOOM) {
      scheduleMapView(clampCenter(
        startView.centerX - (deltaX / width) * startViewport.width,
        startView.centerY - (deltaY / height) * startViewport.height,
        startView.zoom
      ));
    }
  };

  const handleResponderRelease = (event) => {
    const activeGesture = gesture.current;
    gesture.current = null;
    if (activeGesture?.moved || activeGesture?.usedMultiTouch) {
      commitMapView(mapViewRef.current);
      return;
    }
    if (!canPlacePin || !onSelectPosition) return;
    const { locationX, locationY } = event.nativeEvent;
    if (!Number.isFinite(locationX) || !Number.isFinite(locationY)) return;
    const width = Math.max(1, mapLayout.width);
    const height = Math.max(1, mapLayout.height);
    const currentView = mapViewRef.current;
    const viewport = getViewportSize(currentView.zoom);
    const normX = currentView.centerX + ((locationX / width) - 0.5) * viewport.width;
    const normY = currentView.centerY + ((locationY / height) - 0.5) * viewport.height;
    if (normX < 0 || normX > 1 || normY < 0 || normY > 1) return;
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

  const viewport = getViewportSize(mapView.zoom);
  const visibleWidth = EUROPE_SVG_VIEWBOX.width * viewport.width;
  const visibleHeight = EUROPE_SVG_VIEWBOX.height * viewport.height;
  const viewBoxX = EUROPE_SVG_VIEWBOX.minX + mapView.centerX * EUROPE_SVG_VIEWBOX.width - visibleWidth / 2;
  const viewBoxY = EUROPE_SVG_VIEWBOX.minY + mapView.centerY * EUROPE_SVG_VIEWBOX.height - visibleHeight / 2;
  const viewBoxString = `${viewBoxX} ${viewBoxY} ${visibleWidth} ${visibleHeight}`;
  // Marker dimensions were tuned against the original 290-unit-wide duel map.
  // Keep their screen size stable when the projected map viewBox changes.
  const markerScale = (EUROPE_SVG_VIEWBOX.width / 290) / mapView.zoom;

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
      onResponderTerminate={() => {
        gesture.current = null;
        commitMapView(mapViewRef.current);
      }}
    >
      <Svg
        ref={mapSvgRef}
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
          d={revealTarget || mapView.zoom >= DETAILED_MAP_ZOOM_THRESHOLD
            ? EUROPE_MAP_FILL_PATH_DATA
            : EUROPE_MAP_OVERVIEW_PATH_DATA}
          fill="#FFF1CD"
          fillRule="evenodd"
          stroke="#7C8791"
          strokeWidth={0.24 * (EUROPE_SVG_VIEWBOX.width / 290)}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
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
                strokeWidth={0.7 * markerScale}
                strokeDasharray={`${2 * markerScale},${1.5 * markerScale}`}
              />
              <Circle
                cx={guessSvg.svgX}
                cy={guessSvg.svgY}
                r={1.1 * markerScale}
                fill={color}
                stroke="#111111"
                strokeWidth={0.35 * markerScale}
              />
              <Circle
                cx={guessSvg.svgX}
                cy={guessSvg.svgY}
                r={0.32 * markerScale}
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
              r={2.2 * markerScale}
              fill="rgba(255, 215, 0, 0.28)"
              stroke="#FFD700"
              strokeWidth={0.35 * markerScale}
            />
            <Circle
              cx={targetSvg.svgX}
              cy={targetSvg.svgY}
              r={1.3 * markerScale}
              fill="#FFD700"
              stroke="#111111"
              strokeWidth={0.4 * markerScale}
            />
            <Circle
              cx={targetSvg.svgX}
              cy={targetSvg.svgY}
              r={0.36 * markerScale}
              fill="#D71920"
            />
          </G>
        )}

        {!revealTarget && draftSvg && (
          <G>
            <Circle
              cx={draftSvg.svgX}
              cy={draftSvg.svgY}
              r={1.8 * markerScale}
              fill="rgba(27, 163, 156, 0.25)"
              stroke="#1BA39C"
              strokeWidth={0.3 * markerScale}
            />
            <Circle
              cx={draftSvg.svgX}
              cy={draftSvg.svgY}
              r={1.1 * markerScale}
              fill="#D71920"
              stroke="#111111"
              strokeWidth={0.35 * markerScale}
            />
            <Circle
              cx={draftSvg.svgX}
              cy={draftSvg.svgY}
              r={0.3 * markerScale}
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
            disabled={mapView.zoom >= MAX_MAP_ZOOM}
            style={({ pressed }) => [styles.mapControlButton, mapView.zoom >= MAX_MAP_ZOOM && styles.buttonDisabled, pressed && styles.buttonPressed]}
            onPress={() => setZoom(mapView.zoom + 1)}
          >
            <Text style={styles.mapControlText}>+</Text>
          </Pressable>
          <View style={styles.zoomReadout}>
            <Text style={styles.zoomReadoutText}>{`${Number(mapView.zoom.toFixed(1))}×`}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zoom out on Europe map"
            disabled={mapView.zoom <= MIN_MAP_ZOOM}
            style={({ pressed }) => [styles.mapControlButton, mapView.zoom <= MIN_MAP_ZOOM && styles.buttonDisabled, pressed && styles.buttonPressed]}
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
              ? (draftPosition ? 'PINCH TO ZOOM · DRAG TO MOVE · TAP TO ADJUST' : 'PINCH TO ZOOM · DRAG, THEN TAP TO DROP YOUR PIN')
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
  const [retryKey, setRetryKey] = useState(0);
  const monumentImageUrl = normalizeMonumentImageUrl(challenge?.monumentImageUrl);
  const [dataUri, setDataUri] = useState(() => (
    monumentImageUrl ? getCachedMonumentPhotoDataUri(monumentImageUrl) : null
  ));
  const [isFetchingPhoto, setIsFetchingPhoto] = useState(false);

  // Reset draft pin whenever the active pinning team or challenge changes
  useEffect(() => {
    setDraftPin(null);
  }, [activeLocalPinTeamId, challenge?.monumentId, stage]);

  useEffect(() => {
    setImageFailed(false);
    setImageLoaded(false);
    const cached = getCachedMonumentPhotoDataUri(monumentImageUrl);
    setDataUri(cached);
  }, [challenge?.monumentId, monumentImageUrl]);

  useEffect(() => {
    let isCancelled = false;
    if (!monumentImageUrl) return undefined;

    const cached = getCachedMonumentPhotoDataUri(monumentImageUrl);
    if (cached) {
      setDataUri(cached);
      return undefined;
    }

    // Android's New Architecture (Fabric) drops custom Image headers, leading to Wikimedia 403 blocks.
    // We download via fetch() with standard headers and pass a local base64 data URI to <Image>.
    if (Platform.OS === 'android') {
      setIsFetchingPhoto(true);
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = setTimeout(() => controller?.abort(), 12000);

      loadMonumentPhotoDataUri(monumentImageUrl, { signal: controller?.signal })
        .then((uri) => {
          if (!isCancelled) {
            setDataUri(uri);
            setIsFetchingPhoto(false);
          }
        })
        .catch((error) => {
          if (!isCancelled) {
            console.warn('GeoGuessrDuelView photo fetch failed:', monumentImageUrl, error?.message || error);
            setImageFailed(true);
            setIsFetchingPhoto(false);
          }
        })
        .finally(() => {
          clearTimeout(timeoutId);
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [monumentImageUrl, retryKey]);

  const activeImageUri = Platform.OS === 'android' ? dataUri : (dataUri || monumentImageUrl);

  const handleImageError = (error) => {
    console.warn('GeoGuessrDuelView failed to load photo:', monumentImageUrl, error?.nativeEvent);
    if (!dataUri && monumentImageUrl && Platform.OS !== 'android') {
      setIsFetchingPhoto(true);
      loadMonumentPhotoDataUri(monumentImageUrl)
        .then((uri) => {
          setDataUri(uri);
          setIsFetchingPhoto(false);
        })
        .catch((err) => {
          console.warn('GeoGuessr fallback fetch also failed:', monumentImageUrl, err?.message);
          setImageFailed(true);
          setIsFetchingPhoto(false);
        });
    } else {
      setImageFailed(true);
    }
  };

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
          {(!imageLoaded || isFetchingPhoto || !activeImageUri) && !imageFailed ? (
            <View style={styles.photoStatus}>
              <Text style={styles.photoStatusTitle}>LOADING REAL PHOTO...</Text>
            </View>
          ) : null}
          {activeImageUri && !imageFailed ? (
            <Image
              key={`${activeImageUri.slice(0, 48)}-${retryKey}`}
              source={{ uri: activeImageUri, cache: 'force-cache' }}
              style={styles.postcardImage}
              resizeMode="cover"
              onError={handleImageError}
              onLoad={() => setImageLoaded(true)}
            />
          ) : null}
          {imageFailed || !monumentImageUrl ? (
            <View style={styles.photoStatus}>
              <Text style={styles.photoStatusTitle}>PHOTO UNAVAILABLE</Text>
              <Text style={styles.photoStatusText}>Check the connection and try this round again.</Text>
              {monumentImageUrl ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading photo"
                  style={({ pressed }) => [styles.photoRetryButton, pressed && styles.buttonPressed]}
                  onPress={() => {
                    setDataUri(null);
                    setImageFailed(false);
                    setImageLoaded(false);
                    setRetryKey((k) => k + 1);
                  }}
                >
                  <Text style={styles.photoRetryButtonText}>RETRY PHOTO ↻</Text>
                </Pressable>
              ) : null}
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
  photoRetryButton: {
    marginTop: 8,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 6,
    borderWidth: 2,
    borderBottomWidth: 3,
    borderColor: '#111111',
    backgroundColor: '#1BA39C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRetryButtonText: {
    color: '#111111',
    fontFamily: 'dogicapixelbold',
    fontSize: 7,
    textTransform: 'uppercase',
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
