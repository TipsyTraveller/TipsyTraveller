import React, { useState, useEffect } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../shared/components/Header/Header';
import {
  BADGE_OPTIONS,
  DEFAULT_STATS,
  getProfile,
  getStats,
  incrementStat,
  resetAccountData,
  saveProfile,
  saveStats,
} from '../shared/storage/userSettings';
import { MODEL_OPTIONS } from '../GameScreen/constants/modelOptions';

export default function Account({ navigation }) {
  const [userName, setUserName] = useState('');
  const [selectedBadge, setSelectedBadge] = useState('legend');
  const [selectedVehicle, setSelectedVehicle] = useState('car1');
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [deviceId, setDeviceId] = useState('Loading...');
  const [saveBanner, setSaveBanner] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadAccountData();

    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (e.data.action.type === 'GO_BACK' || e.data.action.type === 'POP') {
        e.preventDefault();
        navigation.navigate('Home');
      }
    });

    return unsubscribe;
  }, [navigation]);

  const loadAccountData = async () => {
    try {
      const [profileData, statsData, currentDeviceId] = await Promise.all([
        getProfile(),
        getStats(),
        AsyncStorage.getItem('deviceID'),
      ]);

      setUserName(profileData.name || '');
      setSelectedBadge(profileData.badge || 'legend');
      setSelectedVehicle(profileData.preferredVehicle || 'car1');
      setStats(statsData || DEFAULT_STATS);
      setDeviceId(currentDeviceId || 'Not generated yet');
    } catch (error) {
      console.warn('Error loading account info:', error);
    }
  };

  const handleSaveProfile = async () => {
    Keyboard.dismiss();
    setIsSaving(true);
    try {
      await saveProfile({
        name: userName.trim(),
        badge: selectedBadge,
        preferredVehicle: selectedVehicle,
      });

      setSaveBanner('PROFILE SAVED!');
      setTimeout(() => setSaveBanner(''), 2500);
    } catch (error) {
      Alert.alert('Save Failed', 'Unable to save profile details.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleIncrementStat = async (key) => {
    const updated = await incrementStat(key, 1);
    if (updated) setStats(updated);
  };

  const handleResetStats = () => {
    Alert.alert(
      'Reset Career Stats',
      'Are you sure you want to reset your career tour statistics to zero?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await saveStats(DEFAULT_STATS);
            setStats(DEFAULT_STATS);
            setSaveBanner('STATS RESET');
            setTimeout(() => setSaveBanner(''), 2500);
          },
        },
      ]
    );
  };

  const handleRegenerateDeviceId = () => {
    Alert.alert(
      'Regenerate Device ID',
      'Generating a new device ID simulates a fresh install. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: async () => {
            const newId = Math.random().toString(36).substring(2) + Date.now().toString(36);
            await AsyncStorage.setItem('deviceID', newId);
            setDeviceId(newId);
            setSaveBanner('NEW DEVICE ID CREATED');
            setTimeout(() => setSaveBanner(''), 2500);
          },
        },
      ]
    );
  };

  const handleResetAll = () => {
    Alert.alert(
      'Reset Account Data',
      'This will erase your saved username, badge, preferred vehicle, and statistics.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await resetAccountData();
            await loadAccountData();
            setSaveBanner('ACCOUNT DATA CLEARED');
            setTimeout(() => setSaveBanner(''), 2500);
          },
        },
      ]
    );
  };

  const activeBadgeInfo = BADGE_OPTIONS.find((b) => b.id === selectedBadge) || BADGE_OPTIONS[0];

  return (
    <SafeAreaView style={styles.container}>
      <Header
        navigation={navigation}
        showBackButton
        title="PLAYER ACCOUNT"
        activeScreen="account"
        onBackPress={() => navigation.navigate('Home')}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
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

          {/* Identity Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>PLAYER IDENTITY</Text>
            </View>

            <View style={styles.avatarPreviewRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarEmoji}>{activeBadgeInfo.emoji}</Text>
              </View>
              <View style={styles.avatarTextCol}>
                <Text style={styles.avatarBadgeLabel}>{activeBadgeInfo.label}</Text>
                <Text style={styles.avatarSubtext}>{activeBadgeInfo.description}</Text>
              </View>
            </View>

            <Text style={styles.fieldLabel}>DEFAULT USERNAME</Text>
            <TextInput
              style={styles.textInput}
              value={userName}
              onChangeText={setUserName}
              placeholder="e.g. Captain Tipsy"
              placeholderTextColor="#999"
              maxLength={18}
              autoCapitalize="words"
            />
            <Text style={styles.fieldHint}>
              Auto-fills when creating or joining multiplayer game rooms.
            </Text>

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>CHOOSE YOUR PARTY TITLE</Text>
            <View style={styles.badgeGrid}>
              {BADGE_OPTIONS.map((badge) => {
                const isSelected = selectedBadge === badge.id;
                return (
                  <TouchableOpacity
                    key={badge.id}
                    style={[styles.badgeChip, isSelected && styles.badgeChipSelected]}
                    onPress={() => setSelectedBadge(badge.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.badgeChipEmoji}>{badge.emoji}</Text>
                    <Text style={[styles.badgeChipText, isSelected && styles.badgeChipTextSelected]}>
                      {badge.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>FAVORITE VEHICLE</Text>
            <ScrollView
              horizontal
              nestedScrollEnabled={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.vehicleScroll}
            >
              {MODEL_OPTIONS.map((model) => {
                const isSelected = selectedVehicle === model.id;
                return (
                  <TouchableOpacity
                    key={model.id}
                    style={[styles.vehicleChip, isSelected && styles.vehicleChipSelected]}
                    onPress={() => setSelectedVehicle(model.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.vehicleChipEmoji}>🚗</Text>
                    <Text style={[styles.vehicleChipLabel, isSelected && styles.vehicleChipLabelSelected]}>
                      {model.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
              onPress={handleSaveProfile}
              disabled={isSaving}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>
                {isSaving ? 'SAVING...' : 'SAVE PROFILE'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tour Career Statistics */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>TOUR CAREER STATS</Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statEmoji}>🏆</Text>
                <Text style={styles.statValue}>{stats.toursCompleted}</Text>
                <Text style={styles.statLabel}>TOURS COMPLETED</Text>
                <TouchableOpacity
                  style={styles.statAddBtn}
                  onPress={() => handleIncrementStat('toursCompleted')}
                >
                  <Text style={styles.statAddBtnText}>+1 Tour</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statEmoji}>🎯</Text>
                <Text style={styles.statValue}>{stats.challengesCompleted}</Text>
                <Text style={styles.statLabel}>CHALLENGES WON</Text>
                <TouchableOpacity
                  style={styles.statAddBtn}
                  onPress={() => handleIncrementStat('challengesCompleted')}
                >
                  <Text style={styles.statAddBtnText}>+1 Challenge</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statEmoji}>🍻</Text>
                <Text style={styles.statValue}>{stats.sipsLogged}</Text>
                <Text style={styles.statLabel}>SIPS LOGGED</Text>
                <TouchableOpacity
                  style={styles.statAddBtn}
                  onPress={() => handleIncrementStat('sipsLogged')}
                >
                  <Text style={styles.statAddBtnText}>+1 Sip</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statEmoji}>🎲</Text>
                <Text style={styles.statValue}>{stats.diceRolls}</Text>
                <Text style={styles.statLabel}>DICE ROLLED</Text>
                <TouchableOpacity
                  style={styles.statAddBtn}
                  onPress={() => handleIncrementStat('diceRolls')}
                >
                  <Text style={styles.statAddBtnText}>+1 Roll</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleResetStats}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>RESET CAREER STATS</Text>
            </TouchableOpacity>
          </View>

          {/* Device & Connection */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>DEVICE & MULTIPLAYER IDENTITY</Text>
            </View>
            <Text style={styles.fieldLabel}>ANONYMOUS DEVICE ID</Text>
            <View style={styles.deviceIdContainer}>
              <Text style={styles.deviceIdText} numberOfLines={1} selectable>
                {deviceId}
              </Text>
            </View>
            <Text style={styles.fieldHint}>
              Used by Firebase to recognize team leadership, room re-entry, and turn ownership.
            </Text>

            <View style={styles.deviceRow}>
              <TouchableOpacity
                style={[styles.smallActionButton, { marginTop: 12 }]}
                onPress={handleRegenerateDeviceId}
              >
                <Text style={styles.smallActionButtonText}>🔄 REGENERATE DEVICE ID</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Account Reset */}
          <View style={[styles.card, styles.dangerCard]}>
            <Text style={styles.dangerTitle}>DANGER ZONE</Text>
            <Text style={styles.dangerSubtext}>
              Erase all local profile preferences, player badges, and lifetime stats.
            </Text>
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={handleResetAll}
              activeOpacity={0.8}
            >
              <Text style={styles.dangerButtonText}>ERASE ACCOUNT DATA</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
    width: '100%',
    ...Platform.select({
      web: {
        height: '100%',
        maxHeight: '100%',
        minHeight: 0,
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
    fontSize: 13,
    color: '#2C3E50',
  },
  avatarPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1CD',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2C3E50',
    padding: 12,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: '#2C3E50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarEmoji: {
    fontSize: 26,
  },
  avatarTextCol: {
    flex: 1,
  },
  avatarBadgeLabel: {
    fontFamily: 'dogicapixelbold',
    fontSize: 12,
    color: '#2C3E50',
    marginBottom: 4,
  },
  avatarSubtext: {
    fontSize: 11,
    color: '#555',
  },
  fieldLabel: {
    fontFamily: 'dogicapixelbold',
    fontSize: 9.5,
    color: '#2C3E50',
    marginBottom: 8,
  },
  fieldHint: {
    fontSize: 10,
    color: '#777',
    marginTop: 6,
  },
  textInput: {
    width: '100%',
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2C3E50',
    backgroundColor: '#FAF3E0',
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF3E0',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CCC',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  badgeChipSelected: {
    backgroundColor: '#FFF1CD',
    borderColor: '#2C3E50',
    borderWidth: 2.5,
  },
  badgeChipEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  badgeChipText: {
    fontSize: 11,
    color: '#555',
    fontWeight: '600',
  },
  badgeChipTextSelected: {
    color: '#2C3E50',
    fontWeight: 'bold',
  },
  vehicleScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  vehicleChip: {
    backgroundColor: '#FAF3E0',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CCC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  vehicleChipSelected: {
    backgroundColor: '#1BA39C',
    borderColor: '#2C3E50',
    borderWidth: 2.5,
  },
  vehicleChipEmoji: {
    fontSize: 16,
    marginBottom: 2,
  },
  vehicleChipLabel: {
    fontSize: 10,
    color: '#555',
    fontWeight: '600',
  },
  vehicleChipLabelSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  primaryButton: {
    backgroundColor: '#1BA39C',
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: '#2C3E50',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    shadowColor: '#2C3E50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontFamily: 'dogicapixelbold',
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  statBox: {
    width: '48%',
    backgroundColor: '#FAF3E0',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2C3E50',
    padding: 10,
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: 'dogicapixelbold',
    fontSize: 18,
    color: '#2C3E50',
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: 'dogicapixelbold',
    fontSize: 8,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  statAddBtn: {
    backgroundColor: '#FFF1CD',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#2C3E50',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statAddBtnText: {
    fontFamily: 'dogicapixelbold',
    fontSize: 8,
    color: '#2C3E50',
  },
  secondaryButton: {
    backgroundColor: '#FFF1CD',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2C3E50',
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontFamily: 'dogicapixelbold',
    fontSize: 9.5,
    color: '#2C3E50',
  },
  deviceIdContainer: {
    backgroundColor: '#FAF3E0',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#2C3E50',
    padding: 10,
  },
  deviceIdText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#2C3E50',
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallActionButton: {
    backgroundColor: '#FFF1CD',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#2C3E50',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  smallActionButtonText: {
    fontFamily: 'dogicapixelbold',
    fontSize: 9,
    color: '#2C3E50',
  },
  dangerCard: {
    borderColor: '#D71920',
    backgroundColor: '#FFF5F5',
  },
  dangerTitle: {
    fontFamily: 'dogicapixelbold',
    fontSize: 11,
    color: '#D71920',
    marginBottom: 6,
  },
  dangerSubtext: {
    fontSize: 11,
    color: '#666',
    marginBottom: 12,
  },
  dangerButton: {
    backgroundColor: '#D71920',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2C3E50',
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonText: {
    fontFamily: 'dogicapixelbold',
    fontSize: 10,
    color: '#FFFFFF',
  },
});
