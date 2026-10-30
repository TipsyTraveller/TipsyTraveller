import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PAGES = [
  {
    eyebrow: 'ONE PHONE PER TEAM',
    title: 'Pick a team leader',
    body: 'Each team plays from its leader’s phone. Keep that phone with the team and pass it only when a challenge names a specific player.',
    icon: '📱',
  },
  {
    eyebrow: 'TAKE YOUR TURN',
    title: 'Roll, travel, challenge',
    body: 'When your team is called, the leader rolls the die. Your vehicle moves, then your team completes the country challenge. Other teams can follow the live board while they wait.',
    icon: '🎲',
  },
  {
    eyebrow: 'ROADBLOCKS & POINTS',
    title: 'Race smart',
    body: 'Route progress, challenges, and finishing position earn points. A leading team may hit a roadblock: beat the hard challenge or take the marked detour.',
    icon: '🚧',
  },
  {
    eyebrow: 'STAY IN THE GAME',
    title: 'Reconnect safely',
    body: 'If a phone loses connection, reopen the room with the same device. The current turn, challenge, selected player, scores, and drinks are restored automatically.',
    icon: '↻',
  },
];

export default function GameOnboarding({ onDismiss, visible }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    if (visible) setPageIndex(0);
  }, [visible]);

  const page = PAGES[pageIndex];
  const isLast = pageIndex === PAGES.length - 1;
  const cardWidth = Math.min(590, Math.max(280, width - insets.left - insets.right - 48));

  return (
    <Modal
      animationType="fade"
      navigationBarTranslucent
      onRequestClose={onDismiss}
      presentationStyle="fullScreen"
      statusBarTranslucent
      visible={visible}
    >
      <View
        accessibilityViewIsModal
        style={[
          styles.overlay,
          {
            paddingTop: Math.max(16, insets.top + 12),
            paddingBottom: Math.max(16, insets.bottom + 12),
            paddingLeft: Math.max(24, insets.left + 16),
            paddingRight: Math.max(24, insets.right + 16),
          },
        ]}
      >
        <View style={[styles.card, { width: cardWidth }]}>
          <Pressable accessibilityLabel="Skip game introduction" onPress={onDismiss} style={styles.skipButton}>
            <Text style={styles.skipText}>SKIP</Text>
          </Pressable>
          <Text style={styles.icon}>{page.icon}</Text>
          <Text style={styles.eyebrow}>{page.eyebrow}</Text>
          <Text style={styles.title}>{page.title}</Text>
          <Text style={styles.body}>{page.body}</Text>
          <View style={styles.footer}>
            <View style={styles.dots}>
              {PAGES.map((item, index) => (
                <View key={item.eyebrow} style={[styles.dot, index === pageIndex && styles.dotActive]} />
              ))}
            </View>
            <Pressable
              accessibilityLabel={isLast ? 'Start playing' : 'Next introduction page'}
              onPress={() => (isLast ? onDismiss() : setPageIndex((index) => index + 1))}
              style={({ pressed }) => [styles.nextButton, pressed && styles.pressed]}
            >
              <Text style={styles.nextText}>{isLast ? 'LET’S PLAY' : 'NEXT'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#24747A',
  },
  card: {
    minHeight: 250,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF1CD',
    borderWidth: 3,
    borderColor: '#111111',
    borderRadius: 18,
    paddingHorizontal: 34,
    paddingVertical: 20,
  },
  skipButton: { position: 'absolute', right: 14, top: 12, padding: 8 },
  skipText: { fontFamily: 'dogicapixelbold', fontSize: 9, color: '#59636A' },
  icon: { fontSize: 38, marginBottom: 8 },
  eyebrow: { fontFamily: 'dogicapixelbold', fontSize: 9, color: '#E8412F', marginBottom: 8 },
  title: { fontFamily: 'dogicapixelbold', fontSize: 20, color: '#15222E', textAlign: 'center', marginBottom: 12 },
  body: { maxWidth: 500, fontSize: 14, lineHeight: 21, color: '#2C3E50', textAlign: 'center' },
  footer: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22 },
  dots: { flexDirection: 'row', gap: 7 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#C8BFA6' },
  dotActive: { width: 22, backgroundColor: '#1BA39C' },
  nextButton: { minWidth: 116, alignItems: 'center', backgroundColor: '#E8412F', borderWidth: 2, borderColor: '#111111', borderRadius: 9, paddingHorizontal: 16, paddingVertical: 12 },
  nextText: { fontFamily: 'dogicapixelbold', fontSize: 10, color: '#FFFFFF' },
  pressed: { opacity: 0.82, transform: [{ translateY: 1 }] },
});
