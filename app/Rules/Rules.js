import React, { useEffect } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { off, onValue, ref } from 'firebase/database';
import { db } from '../../firebaseConfig';
import BackButton from '../shared/components/BackButton/BackButton';
import LowerButtonContainer from '../shared/components/LowerButtonContainer/LowerButtonContainer';

const RULE_STEPS = [
  {
    step: '01',
    icon: '📱',
    title: 'ONE PHONE PER TEAM',
    badge: 'TEAM LEADER',
    body: 'Each team plays from its leader’s phone. Keep that phone with your crew and pass it only when a challenge card names a specific player.',
  },
  {
    step: '02',
    icon: '🎲',
    title: 'ROLL & HIT THE ROAD',
    badge: 'TURN FLOW',
    body: 'When your team is called, throw the 3D die or tap ROLL. Your vehicle drives to the next country stop while every other phone follows live.',
  },
  {
    step: '03',
    icon: '🎯',
    title: 'COUNTRY CHALLENGES',
    badge: 'POINTS & SIPS',
    body: 'Every stop triggers a timed country challenge. Complete it to earn points—or take the sip penalty if your team comes up short.',
  },
  {
    step: '04',
    icon: '🚧',
    title: 'ROADBLOCKS & DUELS',
    badge: 'CATCH-UP',
    body: 'A leading team can hit a roadblock and must beat a hard challenge or take a detour. Passing or landing near rivals starts a GeoGuessr duel.',
  },
  {
    step: '05',
    icon: '🏁',
    title: 'FINISH & RECONNECT',
    badge: 'SAFE STATE',
    body: 'Route progress, challenges, and finishing order decide the winner. If a phone disconnects, rejoin on the same device to restore the turn.',
  },
];

const QUICK_PILLS = [
  '1 PHONE / TEAM',
  '3D DIE & MAP',
  'TIMED CHALLENGES',
];

export default function Rules({ navigation, route }) {
  const gameID = route?.params?.gameID;

  useEffect(() => {
    if (!gameID || String(gameID).startsWith('DEV-')) return undefined;

    const statusRef = ref(db, `games/${gameID}/status`);
    onValue(statusRef, (snapshot) => {
      const status = snapshot.val();
      if (
        (status === 'characterSelection' || status === 'game')
        && navigation.canGoBack()
      ) {
        navigation.goBack();
      }
    });

    return () => off(statusRef);
  }, [gameID, navigation]);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Home');
  };

  return (
    <SafeAreaView style={styles.mainContainer}>
      <View style={styles.contentWrapper}>
        <View style={styles.upperContainer}>
          <BackButton navigation={navigation} onPress={handleBack} />
          {gameID ? (
            <View style={styles.gamePinPill}>
              <Text style={styles.gamePinLabel}>GAME ID</Text>
              <Text style={styles.gamePinValue}>{gameID}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>HOW TO PLAY</Text>
          <Text style={styles.subtitle}>
            SIMPLE RULES FOR YOUR ROAD TRIP ACROSS EUROPE
          </Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.summaryBanner}>
            <Text style={styles.summaryTitle}>THE GOAL</Text>
            <Text style={styles.summaryBody}>
              Race from stop to stop, clear country challenges, and rack up the highest score before every team crosses the finish line.
            </Text>
            <View style={styles.pillRow}>
              {QUICK_PILLS.map((pill) => (
                <View key={pill} style={styles.quickPill}>
                  <Text style={styles.quickPillText}>{pill}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.cardsList}>
            {RULE_STEPS.map((item) => (
              <View key={item.step} style={styles.ruleCard}>
                <View style={styles.ruleCardHeader}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>{item.step}</Text>
                  </View>
                  <Text style={styles.ruleIcon}>{item.icon}</Text>
                  <Text style={styles.ruleTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={styles.tagPill}>
                    <Text style={styles.tagPillText}>{item.badge}</Text>
                  </View>
                </View>
                <Text style={styles.ruleBody}>{item.body}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footerContainer}>
          <LowerButtonContainer
            LeftButtonVisible={false}
            RightButtonCopy={gameID ? 'BACK TO LOBBY' : 'GOT IT'}
            handleRightButton={handleBack}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FAF3E0',
    alignItems: 'center',
    paddingHorizontal: 20,
    ...Platform.select({
      web: {
        height: '100%',
        maxHeight: '100vh',
        overflow: 'hidden',
      },
    }),
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 620,
  },
  upperContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  gamePinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF1CD',
    borderWidth: 2,
    borderColor: '#2C3E50',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  gamePinLabel: {
    color: '#7A7468',
    fontFamily: 'dogicapixelbold',
    fontSize: 8,
  },
  gamePinValue: {
    color: '#2C3E50',
    fontFamily: 'dogicapixelbold',
    fontSize: 11,
  },
  titleContainer: {
    width: '100%',
    marginTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#2C3E50',
  },
  title: {
    color: '#2C3E50',
    fontFamily: 'dogicapixelbold',
    fontSize: 18,
    lineHeight: 24,
  },
  subtitle: {
    color: '#7A7468',
    fontFamily: 'dogicapixel',
    fontSize: 9,
    lineHeight: 14,
    marginTop: 6,
  },
  scroll: {
    flex: 1,
    width: '100%',
    ...Platform.select({
      web: {
        minHeight: 0,
        overflowY: 'auto',
      },
    }),
  },
  scrollContent: {
    paddingTop: 14,
    paddingBottom: 16,
    gap: 12,
  },
  summaryBanner: {
    width: '100%',
    backgroundColor: '#FFF1CD',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#2C3E50',
    padding: 14,
  },
  summaryTitle: {
    color: '#1BA39C',
    fontFamily: 'dogicapixelbold',
    fontSize: 10,
    marginBottom: 6,
  },
  summaryBody: {
    color: '#2C3E50',
    fontSize: 13,
    lineHeight: 19,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  quickPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#2C3E50',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  quickPillText: {
    color: '#2C3E50',
    fontFamily: 'dogicapixelbold',
    fontSize: 7.5,
  },
  cardsList: {
    gap: 10,
  },
  ruleCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#2C3E50',
    padding: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#2C3E50',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 3px 8px rgba(44, 62, 80, 0.1)',
      },
    }),
  },
  ruleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  stepBadge: {
    backgroundColor: '#1BA39C',
    borderWidth: 1.5,
    borderColor: '#2C3E50',
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  stepBadgeText: {
    color: '#FFFFFF',
    fontFamily: 'dogicapixelbold',
    fontSize: 8,
  },
  ruleIcon: {
    fontSize: 16,
  },
  ruleTitle: {
    flex: 1,
    color: '#2C3E50',
    fontFamily: 'dogicapixelbold',
    fontSize: 10,
  },
  tagPill: {
    backgroundColor: '#FAF3E0',
    borderWidth: 1,
    borderColor: '#D5CBB4',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagPillText: {
    color: '#7A7468',
    fontFamily: 'dogicapixelbold',
    fontSize: 6.5,
  },
  ruleBody: {
    color: '#393939',
    fontSize: 12.5,
    lineHeight: 18,
  },
  footerContainer: {
    width: '100%',
    paddingVertical: 10,
  },
});
