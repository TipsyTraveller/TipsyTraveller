import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { Vector3 } from 'three';
import { COUNTRY_GEOGRAPHIC_CENTERS, DURATION_TARGET_MINUTES } from '../constants/countryStops';
import { EUROPE_MAP_OVERVIEW_PATH_DATA } from '../constants/europeMapOverviewPath';
import { geoToEuropeSvgCoords } from '../constants/europeMapPaths';
import { boardToSvgCoords } from '../constants/monumentPool';
import { TOURING_CREAM, TOURING_GOLD, TOURING_NAVY, TOURING_TEAL } from '../constants/touringPalette';
import { FINISH_BONUSES, POINTS_PER_STOP } from '../gameplayState';

const buildOverview = (routeModel) => {
  const projectedStops = routeModel.markers.map(boardToSvgCoords);
  const stops = routeModel.countryStops.map((stop, index) => {
    const center = COUNTRY_GEOGRAPHIC_CENTERS.get(stop.id);
    return center
      ? geoToEuropeSvgCoords(center.longitude, center.latitude)
      : projectedStops[index];
  });
  const point = new Vector3();
  const points = [stops[0]];
  // The map artwork and board use different projections. Keep the sampled
  // bends of the curve and blend the projection correction between city anchors.
  for (let leg = 1; leg < stops.length; leg += 1) {
    const from = routeModel.stopProgress[leg - 1];
    const to = routeModel.stopProgress[leg];
    const steps = Math.max(8, Math.ceil((to - from) * 220));
    for (let step = 1; step < steps; step += 1) {
      const t = step / steps;
      routeModel.curve.getPointAt(from + (to - from) * t, point);
      const { svgX, svgY } = boardToSvgCoords(point);
      points.push({
        svgX: svgX + (stops[leg - 1].svgX - projectedStops[leg - 1].svgX) * (1 - t)
          + (stops[leg].svgX - projectedStops[leg].svgX) * t,
        svgY: svgY + (stops[leg - 1].svgY - projectedStops[leg - 1].svgY) * (1 - t)
          + (stops[leg].svgY - projectedStops[leg].svgY) * t,
      });
    }
    points.push(stops[leg]);
  }

  const x = points.map(({ svgX }) => svgX);
  const y = points.map(({ svgY }) => svgY);
  const left = Math.min(...x);
  const right = Math.max(...x);
  const top = Math.min(...y);
  const bottom = Math.max(...y);
  return {
    path: points.map(({ svgX, svgY }, index) => (
      `${index ? 'L' : 'M'}${svgX.toFixed(1)} ${svgY.toFixed(1)}`
    )).join(''),
    stops,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
    spanX: right - left,
    spanY: bottom - top,
  };
};

const OverviewMap = ({ routeModel, stacked }) => {
  const [size, setSize] = useState(null);
  const overview = useMemo(() => buildOverview(routeModel), [routeModel]);
  const scale = size ? Math.max(
    (overview.spanX + 60) / size.width,
    (overview.spanY + 60) / size.height
  ) : 1;
  const mapWidth = (size?.width ?? 320) * scale;
  const mapHeight = (size?.height ?? 210) * scale;
  const minX = overview.centerX - mapWidth / 2;
  const minY = overview.centerY - mapHeight / 2;
  return (
    <View
      accessibilityElementsHidden
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      onLayout={({ nativeEvent: { layout: { width, height } } }) => {
        if (width > 0 && height > 0) setSize({ width, height });
      }}
      style={[styles.map, stacked && styles.mapStacked]}
    >
      <Svg width="100%" height="100%" viewBox={`${minX} ${minY} ${mapWidth} ${mapHeight}`}>
        <Path d={EUROPE_MAP_OVERVIEW_PATH_DATA} fill={TOURING_CREAM} fillRule="evenodd" stroke="#B7A98B" strokeWidth={scale * 0.6} />
        <Path d={overview.path} fill="none" stroke={TOURING_NAVY} strokeWidth={scale * 6} strokeLinecap="round" strokeLinejoin="round" />
        <Path d={overview.path} fill="none" stroke={TOURING_TEAL} strokeWidth={scale * 4} strokeLinecap="round" strokeLinejoin="round" />
        <Path d={overview.path} fill="none" stroke={TOURING_CREAM} strokeWidth={scale * 0.9} strokeDasharray={[scale * 3, scale * 4]} />
        {overview.stops.map(({ svgX, svgY }, index) => (
          <Circle
            key={index}
            cx={svgX}
            cy={svgY}
            r={scale * 7.5}
            fill={index === overview.stops.length - 1 ? TOURING_GOLD : TOURING_CREAM}
            stroke={TOURING_NAVY}
            strokeWidth={scale * 1.4}
          />
        ))}
        {overview.stops.map(({ svgX, svgY }, index) => (
          <SvgText
            key={index}
            x={svgX}
            y={svgY + scale * 2.2}
            fill={TOURING_NAVY}
            fontFamily="dogicapixelbold"
            fontSize={scale * 5.7}
            textAnchor="middle"
          >
            {index + 1}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
};

const Itinerary = ({ stops }) => (
  <>
    <Text accessibilityRole="header" style={styles.itineraryHeading}>ITINERARY</Text>
    {stops.map((stop, index) => (
      <View key={stop.id || index} style={styles.stopRow}>
        <View style={[styles.stopBadge, index === stops.length - 1 && styles.finishBadge]}>
          <Text style={styles.stopNumber}>{index + 1}</Text>
        </View>
        <View style={styles.stopCopy}>
          <Text style={styles.stopName}>{stop.name}</Text>
          {stop.city ? <Text style={styles.stopCity}>{stop.city}</Text> : null}
        </View>
      </View>
    ))}
  </>
);

const RoutePreview = ({ duration = 'long', onClose, routeModel, stops, visible }) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const stacked = width - insets.left - insets.right < 620;
  const routeDuration = DURATION_TARGET_MINUTES[duration] ? duration : 'long';

  if (!visible) return null;

  return (
    <Modal
      animationType="none"
      navigationBarTranslucent
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      supportedOrientations={['landscape', 'portrait']}
      transparent
      visible
    >
      <View
        style={[
          styles.backdrop,
          {
            paddingTop: insets.top + 10,
            paddingRight: insets.right + 12,
            paddingBottom: insets.bottom + 10,
            paddingLeft: insets.left + 12,
          },
        ]}
      >
        <View accessibilityViewIsModal style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>TIPSYTRAVELLER TOURING CLUB</Text>
            <Text accessibilityRole="header" style={styles.title}>THE ROAD TO GREECE</Text>
            <Text style={styles.summary}>
              {routeDuration} route · {stops.length} stops · about {DURATION_TARGET_MINUTES[routeDuration]} min
            </Text>
          </View>

          {stacked ? (
            <ScrollView style={styles.body} contentContainerStyle={styles.stackedBody}>
              <OverviewMap routeModel={routeModel} stacked />
              <Itinerary stops={stops} />
            </ScrollView>
          ) : (
            <View style={styles.splitBody}>
              <OverviewMap routeModel={routeModel} />
              <ScrollView style={styles.itinerary}>
                <Itinerary stops={stops} />
              </ScrollView>
            </View>
          )}

          <View style={[styles.footer, stacked && styles.footerStacked]}>
            <View style={styles.scoring}>
              <Text style={styles.rules}>Roll 1–3 · Stop +{POINTS_PER_STOP} · Word guess +10</Text>
              <Text style={styles.rules}>Finish · 1st +{FINISH_BONUSES[0]} · 2nd +{FINISH_BONUSES[1]} · 3rd +{FINISH_BONUSES[2]}</Text>
            </View>
            <Pressable
              accessibilityLabel="Let's drive"
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            >
              <Text style={styles.buttonText}>LET’S DRIVE</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20, 38, 56, 0.85)',
  },
  card: {
    flex: 1, width: '100%', maxWidth: 880, maxHeight: 570,
    borderWidth: 3, borderColor: TOURING_NAVY, borderRadius: 12,
    backgroundColor: TOURING_CREAM, overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 3, borderColor: TOURING_TEAL,
    backgroundColor: TOURING_NAVY, gap: 4,
  },
  eyebrow: { color: TOURING_GOLD, fontFamily: 'dogicapixelbold', fontSize: 7, lineHeight: 10 },
  title: { color: TOURING_CREAM, fontFamily: 'dogicapixelbold', fontSize: 13, lineHeight: 18 },
  summary: {
    color: TOURING_CREAM, fontFamily: 'dogicapixel', fontSize: 7, lineHeight: 10, textTransform: 'uppercase',
  },
  body: { flex: 1 },
  stackedBody: { padding: 10, gap: 3 },
  splitBody: { flex: 1, flexDirection: 'row', padding: 10, gap: 12, minHeight: 0 },
  map: { flex: 1, overflow: 'hidden', borderRadius: 6, backgroundColor: '#223144' },
  mapStacked: { flex: 0, height: 208, marginBottom: 7 },
  itinerary: { flexGrow: 0, width: '33%', minWidth: 175 },
  itineraryHeading: {
    color: TOURING_NAVY, fontFamily: 'dogicapixelbold', fontSize: 8, lineHeight: 12, marginBottom: 3,
  },
  stopRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#A6A793',
  },
  stopBadge: {
    width: 25, height: 25, borderRadius: 13, borderWidth: 1.5, borderColor: TOURING_NAVY,
    backgroundColor: TOURING_CREAM, alignItems: 'center', justifyContent: 'center',
  },
  finishBadge: { backgroundColor: TOURING_GOLD },
  stopNumber: { color: TOURING_NAVY, fontFamily: 'dogicapixelbold', fontSize: 7 },
  stopCopy: { flex: 1, gap: 2 },
  stopName: { color: TOURING_NAVY, fontFamily: 'dogicapixelbold', fontSize: 8, lineHeight: 12 },
  stopCity: { color: '#475963', fontFamily: 'dogicapixel', fontSize: 7, lineHeight: 10 },
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    paddingVertical: 7, paddingHorizontal: 12, borderTopWidth: 1, borderColor: TOURING_NAVY,
  },
  footerStacked: { flexWrap: 'wrap' },
  scoring: { gap: 3 },
  rules: { color: TOURING_NAVY, fontFamily: 'dogicapixel', fontSize: 7, lineHeight: 10 },
  button: {
    minHeight: 44, justifyContent: 'center', paddingHorizontal: 14,
    borderRadius: 6, borderWidth: 2, borderColor: TOURING_NAVY, backgroundColor: TOURING_TEAL,
  },
  pressed: { backgroundColor: TOURING_GOLD },
  buttonText: { color: TOURING_NAVY, fontFamily: 'dogicapixelbold', fontSize: 9 },
});

export default RoutePreview;
