import React, { useState, useEffect } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../shared/components/Header/Header';
import {
  DEFAULT_SETTINGS,
  getSettings,
  resetSettings,
  saveSettings,
} from '../shared/storage/userSettings';

export default function Settings({ navigation }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saveBanner, setSaveBanner] = useState('');
  const [expandedSection, setExpandedSection] = useState(null);

  useEffect(() => {
    loadCurrentSettings();

    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (e.data.action.type === 'GO_BACK' || e.data.action.type === 'POP') {
        e.preventDefault();
        navigation.navigate('Home');
      }
    });

    return unsubscribe;
  }, [navigation]);

  const loadCurrentSettings = async () => {
    const loaded = await getSettings();
    setSettings(loaded);
  };

  const handleUpdateToggle = async (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await saveSettings({ [key]: value });
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Restore Default Settings',
      'Reset all presentation and room rule preferences to their default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore Defaults',
          style: 'destructive',
          onPress: async () => {
            const defaults = await resetSettings();
            setSettings(defaults);
            setSaveBanner('SETTINGS RESTORED TO DEFAULT');
            setTimeout(() => setSaveBanner(''), 2500);
          },
        },
      ]
    );
  };

  const toggleAccordion = (sectionKey) => {
    setExpandedSection((prev) => (prev === sectionKey ? null : sectionKey));
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        navigation={navigation}
        showBackButton
        title="GAME SETTINGS"
        activeScreen="settings"
        onBackPress={() => navigation.navigate('Home')}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
        bounces={true}
        alwaysBounceVertical={true}
      >
        {/* Banner notification */}
        {Boolean(saveBanner) && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>✓ {saveBanner}</Text>
          </View>
        )}

        {/* Section 1: Audio & Haptics */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>AUDIO & HAPTICS</Text>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingName}>Ambient Music</Text>
              <Text style={styles.settingSubtext}>Road trip background melodies</Text>
            </View>
            <Switch
              value={settings.ambientMusic}
              onValueChange={(val) => handleUpdateToggle('ambientMusic', val)}
              trackColor={{ false: '#CCC', true: '#1BA39C' }}
              thumbColor={settings.ambientMusic ? '#FFF1CD' : '#FFF'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingName}>Haptic Feedback</Text>
              <Text style={styles.settingSubtext}>Vibrate on dice throw, stop landings, and turns</Text>
            </View>
            <Switch
              value={settings.hapticFeedback}
              onValueChange={(val) => handleUpdateToggle('hapticFeedback', val)}
              trackColor={{ false: '#CCC', true: '#1BA39C' }}
              thumbColor={settings.hapticFeedback ? '#FFF1CD' : '#FFF'}
            />
          </View>
        </View>

        {/* Section 2: Room Rules */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>HOST ROOM RULES</Text>
          </View>
          <Text style={styles.fieldHint}>
            These choices are copied into new rooms you host, so every player uses the same timing rules.
          </Text>

          <Text style={styles.fieldLabel}>CHALLENGE TIMER PACE</Text>
          <View style={styles.modeButtonGroup}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                settings.challengeTimer === 'relaxed' && styles.modeButtonActive,
              ]}
              onPress={() => handleUpdateToggle('challengeTimer', 'relaxed')}
              activeOpacity={0.8}
            >
              <Text style={styles.modeButtonEmoji}>🏖️</Text>
              <Text
                style={[
                  styles.modeButtonText,
                  settings.challengeTimer === 'relaxed' && styles.modeButtonTextActive,
                ]}
              >
                RELAXED
              </Text>
              <Text style={styles.modeButtonDescription}>Take your time</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeButton,
                settings.challengeTimer === 'speed' && styles.modeButtonActive,
              ]}
              onPress={() => handleUpdateToggle('challengeTimer', 'speed')}
              activeOpacity={0.8}
            >
              <Text style={styles.modeButtonEmoji}>⚡</Text>
              <Text
                style={[
                  styles.modeButtonText,
                  settings.challengeTimer === 'speed' && styles.modeButtonTextActive,
                ]}
              >
                SPEED RUN
              </Text>
              <Text style={styles.modeButtonDescription}>25% shorter timers</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 3: Gameplay & 3D Board */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>GAMEPLAY & 3D BOARD</Text>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingName}>Fast Dice Animations</Text>
              <Text style={styles.settingSubtext}>Host preference copied into new rooms for every device</Text>
            </View>
            <Switch
              value={settings.fastDice}
              onValueChange={(val) => handleUpdateToggle('fastDice', val)}
              trackColor={{ false: '#CCC', true: '#1BA39C' }}
              thumbColor={settings.fastDice ? '#FFF1CD' : '#FFF'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingName}>Camera Follow Vehicle</Text>
              <Text style={styles.settingSubtext}>Automatically track moving team vehicles along route legs</Text>
            </View>
            <Switch
              value={settings.cameraFollow}
              onValueChange={(val) => handleUpdateToggle('cameraFollow', val)}
              trackColor={{ false: '#CCC', true: '#1BA39C' }}
              thumbColor={settings.cameraFollow ? '#FFF1CD' : '#FFF'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingName}>Auto-Advance Turn</Text>
              <Text style={styles.settingSubtext}>Start a cancellable countdown after results and drinks are recorded</Text>
            </View>
            <Switch
              value={settings.autoAdvanceTurn}
              onValueChange={(val) => handleUpdateToggle('autoAdvanceTurn', val)}
              trackColor={{ false: '#CCC', true: '#1BA39C' }}
              thumbColor={settings.autoAdvanceTurn ? '#FFF1CD' : '#FFF'}
            />
          </View>
        </View>

        {/* Section 4: How To Play Quick Guide */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>HOW TO PLAY: GAME GUIDE</Text>
          </View>

          <View style={styles.accordionContainer}>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => toggleAccordion('rules_overview')}
              activeOpacity={0.8}
            >
              <Text style={styles.accordionTitle}>🎲 1. Dice & Turn Rotation</Text>
              <Text style={styles.accordionArrow}>
                {expandedSection === 'rules_overview' ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>
            {expandedSection === 'rules_overview' && (
              <View style={styles.accordionBody}>
                <Text style={styles.guideText}>
                  Each team uses its leader’s phone. A handoff banner announces the active team. That leader can drag and throw the 3D die or tap ROLL; every other phone follows the synchronized turn.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => toggleAccordion('rules_challenges')}
              activeOpacity={0.8}
            >
              <Text style={styles.accordionTitle}>🎯 2. Destination Challenges</Text>
              <Text style={styles.accordionArrow}>
                {expandedSection === 'rules_challenges' ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>
            {expandedSection === 'rules_challenges' && (
              <View style={styles.accordionBody}>
                <Text style={styles.guideText}>
                  Country stops trigger themed challenges. When a card names a describer, performer, judge, or captain, pass the leader’s phone to that player. Complete or fail the card explicitly so points and drinks are recorded before the next turn.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => toggleAccordion('rules_kickflip')}
              activeOpacity={0.8}
            >
              <Text style={styles.accordionTitle}>🚧 3. Roadblocks & Scoring</Text>
              <Text style={styles.accordionArrow}>
                {expandedSection === 'rules_kickflip' ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>
            {expandedSection === 'rules_kickflip' && (
              <View style={styles.accordionBody}>
                <Text style={styles.guideText}>
                  Route progress, challenges, and finishing position earn points. A leading team may hit a roadblock: beat its timed hard challenge or take the marked detour. Passing or landing near opponents can also start a GeoGuessr duel.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => toggleAccordion('rules_finish')}
              activeOpacity={0.8}
            >
              <Text style={styles.accordionTitle}>🏁 4. Tour Completion</Text>
              <Text style={styles.accordionArrow}>
                {expandedSection === 'rules_finish' ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>
            {expandedSection === 'rules_finish' && (
              <View style={styles.accordionBody}>
                <Text style={styles.guideText}>
                  Finished teams are skipped while the others catch up. If a phone disconnects, reopen the room on the same device: the active turn, challenge, selected player, scores, and drinks are restored. The game ends once every team finishes.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Section 5: App Information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>ABOUT TIPSYTRAVELLER</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Version</Text>
            <Text style={styles.aboutValue}>1.0.0 (Expo SDK 58)</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>3D Engine</Text>
            <Text style={styles.aboutValue}>React Three Fiber / Three.js</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Backend</Text>
            <Text style={styles.aboutValue}>Firebase Realtime Database</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Visual Typography</Text>
            <Text style={styles.aboutValue}>Dogica Pixel</Text>
          </View>
        </View>

        {/* Section 6: Restore Defaults */}
        <View style={[styles.card, styles.resetCard]}>
          <Text style={styles.resetTitle}>RESET SETTINGS</Text>
          <Text style={styles.resetSubtext}>
            Revert all presentation preferences and room rules to their original defaults.
          </Text>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleResetSettings}
            activeOpacity={0.8}
          >
            <Text style={styles.resetButtonText}>RESTORE DEFAULT SETTINGS</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF3E0',
    ...Platform.select({
      web: {
        height: '100%',
        maxHeight: '100vh',
        overflow: 'hidden',
      },
    }),
  },
  scroll: {
    flex: 1,
    width: '100%',
    ...Platform.select({
      web: {
        height: '100%',
        maxHeight: '100%',
        minHeight: 0,
        overflowY: 'auto',
      },
    }),
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: 40,
    alignItems: 'center',
    ...Platform.select({
      web: {
        minHeight: '100%',
      },
    }),
  },
  banner: {
    backgroundColor: '#1BA39C',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
    maxWidth: 520,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2C3E50',
  },
  bannerText: {
    color: '#FFFFFF',
    fontFamily: 'dogicapixelbold',
    fontSize: 11,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#2C3E50',
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#2C3E50',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 4px 10px rgba(44, 62, 80, 0.15)',
      },
    }),
  },
  cardHeader: {
    borderBottomWidth: 2,
    borderBottomColor: '#FAF3E0',
    paddingBottom: 10,
    marginBottom: 14,
  },
  cardTitle: {
    fontFamily: 'dogicapixelbold',
    fontSize: 12.5,
    color: '#2C3E50',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  settingInfo: {
    flex: 1,
    paddingRight: 16,
  },
  settingName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 3,
  },
  settingSubtext: {
    fontSize: 11,
    color: '#666',
    lineHeight: 15,
  },
  divider: {
    height: 1,
    backgroundColor: '#EAEAEA',
    marginVertical: 10,
  },
  fieldLabel: {
    fontFamily: 'dogicapixelbold',
    fontSize: 9.5,
    color: '#2C3E50',
    marginBottom: 8,
  },
  fieldHint: {
    fontSize: 10.5,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  modeButtonGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  modeButton: {
    flex: 1,
    backgroundColor: '#FAF3E0',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CCC',
    padding: 12,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#FFF1CD',
    borderColor: '#2C3E50',
    borderWidth: 2.5,
  },
  modeButtonEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  modeButtonText: {
    fontFamily: 'dogicapixelbold',
    fontSize: 9.5,
    color: '#555',
    marginBottom: 4,
    textAlign: 'center',
  },
  modeButtonTextActive: {
    color: '#2C3E50',
  },
  modeButtonDescription: {
    fontSize: 9.5,
    color: '#777',
    textAlign: 'center',
  },
  accordionContainer: {
    gap: 8,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF3E0',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#2C3E50',
    padding: 12,
  },
  accordionTitle: {
    fontFamily: 'dogicapixelbold',
    fontSize: 10,
    color: '#2C3E50',
    flex: 1,
  },
  accordionArrow: {
    fontSize: 12,
    color: '#2C3E50',
    marginLeft: 8,
  },
  accordionBody: {
    backgroundColor: '#FFFDF6',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E0D8C0',
    padding: 12,
    marginTop: 2,
  },
  guideText: {
    fontSize: 11.5,
    color: '#444',
    lineHeight: 18,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  aboutLabel: {
    fontSize: 12,
    color: '#666',
  },
  aboutValue: {
    fontFamily: 'dogicapixelbold',
    fontSize: 9.5,
    color: '#2C3E50',
  },
  resetCard: {
    borderColor: '#D71920',
    backgroundColor: '#FFF8F8',
  },
  resetTitle: {
    fontFamily: 'dogicapixelbold',
    fontSize: 11,
    color: '#D71920',
    marginBottom: 6,
  },
  resetSubtext: {
    fontSize: 11,
    color: '#666',
    marginBottom: 12,
  },
  resetButton: {
    backgroundColor: '#D71920',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2C3E50',
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    fontFamily: 'dogicapixelbold',
    fontSize: 9.5,
    color: '#FFFFFF',
  },
});
