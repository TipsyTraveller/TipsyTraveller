import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DURATION_LABELS = {
  short: 'Short route',
  medium: 'Medium route',
  long: 'Long route',
};

const RoutePreview = ({ duration = 'long', onClose, stops, visible }) => {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <View style={styles.backdrop}>
      <View
        accessibilityViewIsModal
        style={[
          styles.card,
          {
            marginTop: insets.top + 12,
            marginRight: insets.right + 18,
            marginBottom: insets.bottom + 12,
            marginLeft: insets.left + 18,
          },
        ]}
      >
        <Text style={styles.eyebrow}>YOUR ROAD TO GREECE</Text>
        <Text style={styles.title}>{DURATION_LABELS[duration] || DURATION_LABELS.long}</Text>
        <Text style={styles.summary}>
          {stops.length} stops · rolls are 1–3 · stops and successful word guesses earn 10 points
        </Text>

        <ScrollView
          contentContainerStyle={styles.stopList}
          showsVerticalScrollIndicator={false}
        >
          {stops.map((stop, index) => (
            <View key={stop.id || index} style={styles.stopRow}>
              <View style={[styles.stopBadge, index === stops.length - 1 && styles.finishBadge]}>
                <Text style={styles.stopNumber}>{index + 1}</Text>
              </View>
              <View style={styles.stopCopy}>
                <Text numberOfLines={1} style={styles.stopName}>{stop.name}</Text>
                {stop.city ? <Text numberOfLines={1} style={styles.stopCity}>{stop.city}</Text> : null}
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.podium}>Word guess: +10 · Finish: 1st +30 · 2nd +15 · 3rd +5</Text>
          <TouchableOpacity
            accessibilityLabel="Start the route"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.button}
          >
            <Text style={styles.buttonText}>LET'S DRIVE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34, 49, 68, 0.76)',
  },
  card: {
    width: '86%',
    maxWidth: 900,
    maxHeight: '88%',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 4,
    borderColor: '#111111',
    borderRadius: 12,
    backgroundColor: '#FFF1CD',
  },
  eyebrow: {
    color: '#D71920',
    fontFamily: 'dogicapixelbold',
    fontSize: 9,
    textAlign: 'center',
  },
  title: {
    marginTop: 6,
    color: '#2C3E50',
    fontFamily: 'dogicapixelbold',
    fontSize: 20,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  summary: {
    marginTop: 7,
    color: '#2C3E50',
    fontFamily: 'dogicapixel',
    fontSize: 8,
    lineHeight: 13,
    textAlign: 'center',
  },
  stopList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  stopRow: {
    width: '25%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  stopBadge: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#111111',
    borderRadius: 14,
    backgroundColor: '#1BA39C',
  },
  finishBadge: {
    backgroundColor: '#D71920',
  },
  stopNumber: {
    color: '#FFFFFF',
    fontFamily: 'dogicapixelbold',
    fontSize: 8,
  },
  stopCopy: {
    flex: 1,
    marginLeft: 7,
  },
  stopName: {
    color: '#111111',
    fontFamily: 'dogicapixelbold',
    fontSize: 8,
  },
  stopCity: {
    marginTop: 3,
    color: '#2C3E50',
    fontFamily: 'dogicapixel',
    fontSize: 6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  podium: {
    flex: 1,
    color: '#2C3E50',
    fontFamily: 'dogicapixel',
    fontSize: 7,
    lineHeight: 12,
  },
  button: {
    minHeight: 38,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 3,
    borderColor: '#111111',
    borderRadius: 8,
    backgroundColor: '#1BA39C',
  },
  buttonText: {
    color: '#FFFFFF',
    fontFamily: 'dogicapixelbold',
    fontSize: 8,
  },
});

export default RoutePreview;
