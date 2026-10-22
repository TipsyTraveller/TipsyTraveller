import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  removeCountryStop,
  reorderCountryStop,
  subscribeCountryStops,
  updateCountryStop,
} from '../../GameScreen/services/countryStopsService';
import { devEventBus } from './devEventBus';
import { getCurrentRouteInfo, startInstantGameScreen } from './devNavigation';

export default function CountryStopsTab({ onClose }) {
  const [stops, setStops] = useState([]);
  const [editingChallengeFor, setEditingChallengeFor] = useState(null);
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [penalty, setPenalty] = useState('');
  const [error, setError] = useState('');

  useEffect(() => subscribeCountryStops(
    (nextStops) => {
      setStops(nextStops);
      setError('');
    },
    (nextError) => setError(nextError.message)
  ), []);

  const beginPlacement = async (request) => {
    const latestStop = request.stop
      ? stops.find((item) => item.id === request.stop.id) || request.stop
      : null;
    const nextRequest = latestStop ? { ...request, stop: latestStop } : request;
    onClose();

    const routeInfo = getCurrentRouteInfo();
    const activeGameId = routeInfo?.params?.gameID;
    const isAlreadyInDevGame = routeInfo?.name === 'GameScreen'
      && (routeInfo?.params?.isDevGame || !activeGameId || activeGameId === 'DEV-INSTANT' || activeGameId === 'DEV-MOCK');

    if (!isAlreadyInDevGame) {
      await startInstantGameScreen({ duration: 'long', routeStops: stops });
      setTimeout(() => {
        devEventBus.emit('dev:beginCountryPlacement', { ...nextRequest, countryStops: stops });
      }, 250);
      return;
    }

    devEventBus.emit('dev:beginCountryPlacement', { ...nextRequest, countryStops: stops });
  };

  const confirmRemove = async (stop) => {
    try {
      await removeCountryStop(stop.id);
    } catch (removeError) {
      setError(removeError?.message || 'Unable to remove country stop.');
    }
  };

  const addChallenge = async (stop) => {
    if (!title.trim() || !prompt.trim()) return;
    const challenges = [...(stop.challenges || []), {
      id: `challenge-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      title: title.trim(),
      prompt: prompt.trim(),
      penalty: penalty.trim() || 'Take 1 sip.',
    }];
    await updateCountryStop(stop.id, { challenges });
    setEditingChallengeFor(null);
    setTitle('');
    setPrompt('');
    setPenalty('');
  };

  const removeChallenge = async (stop, challengeId) => {
    await updateCountryStop(stop.id, {
      challenges: stop.challenges.filter((challenge) => challenge.id !== challengeId),
    });
  };

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Country Route Authoring</Text>
      <Text style={styles.description}>Web only. The list order is the driving order. Short uses 4 points, medium 6, and long uses every point.</Text>
      {Boolean(error) && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={styles.addStop} onPress={() => beginPlacement({ mode: 'create' })}>
        <Text style={styles.buttonText}>＋ ADD COUNTRY STOP ON MAP</Text>
      </TouchableOpacity>

      {stops.map((stop, index) => (
        <View key={stop.id} style={styles.stopCard}>
          <View style={styles.stopHeader}>
            <View style={styles.stopCopy}>
              <Text style={styles.stopTitle}>{index + 1}. {stop.name.toUpperCase()}</Text>
              <Text style={styles.coordinates}>{stop.position.x.toFixed(2)}, {stop.position.y.toFixed(2)} · {stop.challenges.length} challenge(s)</Text>
            </View>
            <TouchableOpacity disabled={index === 0} style={styles.iconButton} onPress={() => reorderCountryStop(stop.id, -1)}><Text style={styles.iconText}>↑</Text></TouchableOpacity>
            <TouchableOpacity disabled={index === stops.length - 1} style={styles.iconButton} onPress={() => reorderCountryStop(stop.id, 1)}><Text style={styles.iconText}>↓</Text></TouchableOpacity>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.secondary} onPress={() => beginPlacement({ mode: 'move', stop })}><Text style={styles.buttonText}>MOVE POINT</Text></TouchableOpacity>
            <TouchableOpacity style={styles.secondary} onPress={() => setEditingChallengeFor(editingChallengeFor === stop.id ? null : stop.id)}><Text style={styles.buttonText}>＋ CHALLENGE</Text></TouchableOpacity>
            <TouchableOpacity disabled={stops.length <= 2} style={styles.remove} onPress={() => confirmRemove(stop)}><Text style={styles.buttonText}>REMOVE</Text></TouchableOpacity>
          </View>
          {stop.challenges.map((challenge) => (
            <View key={challenge.id} style={styles.challengeRow}>
              <View style={styles.challengeCopy}><Text style={styles.challengeTitle}>{challenge.title}</Text><Text style={styles.challengePrompt}>{challenge.prompt}</Text></View>
              <TouchableOpacity onPress={() => removeChallenge(stop, challenge.id)}><Text style={styles.deleteChallenge}>✕</Text></TouchableOpacity>
            </View>
          ))}
          {editingChallengeFor === stop.id && (
            <View style={styles.editor}>
              <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Challenge title" placeholderTextColor="#718096" />
              <TextInput style={[styles.input, styles.multiline]} value={prompt} onChangeText={setPrompt} placeholder="Challenge prompt" placeholderTextColor="#718096" multiline />
              <TextInput style={styles.input} value={penalty} onChangeText={setPenalty} placeholder="Penalty (optional)" placeholderTextColor="#718096" />
              <TouchableOpacity style={styles.save} onPress={() => addChallenge(stop)}><Text style={styles.buttonText}>SAVE CHALLENGE</Text></TouchableOpacity>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 8 },
  heading: { fontSize: 10, color: '#ffd700', fontFamily: 'dogicapixelbold', marginTop: 12, marginBottom: 6 },
  description: { fontSize: 8, color: '#a0aec0', fontFamily: 'dogicapixel', marginBottom: 10, lineHeight: 12 },
  error: { color: '#ff7b72', fontFamily: 'dogicapixel', fontSize: 8, marginBottom: 8 },
  addStop: { backgroundColor: '#1ba39c', borderRadius: 7, padding: 11, alignItems: 'center', marginBottom: 10 },
  stopCard: { backgroundColor: '#202d3a', borderWidth: 1, borderColor: '#405064', borderRadius: 8, padding: 10, marginBottom: 9 },
  stopHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stopCopy: { flex: 1 },
  stopTitle: { color: '#ffd700', fontFamily: 'dogicapixelbold', fontSize: 8.5 },
  coordinates: { color: '#8892b0', fontFamily: 'dogicapixel', fontSize: 7, marginTop: 4 },
  iconButton: { width: 28, height: 28, backgroundColor: '#314255', borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: '#fff', fontSize: 14 },
  actionRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  secondary: { flex: 1, backgroundColor: '#2f80ed', borderRadius: 5, padding: 8, alignItems: 'center' },
  remove: { backgroundColor: '#c0392b', borderRadius: 5, padding: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontFamily: 'dogicapixelbold', fontSize: 7.5, textAlign: 'center' },
  challengeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 7, backgroundColor: '#16202a', padding: 8, borderRadius: 5 },
  challengeCopy: { flex: 1 },
  challengeTitle: { color: '#fff', fontFamily: 'dogicapixelbold', fontSize: 7.5 },
  challengePrompt: { color: '#a0aec0', fontFamily: 'dogicapixel', fontSize: 7, marginTop: 3, lineHeight: 10 },
  deleteChallenge: { color: '#ff7b72', fontSize: 12, padding: 5 },
  editor: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#405064', paddingTop: 8 },
  input: { backgroundColor: '#131c24', borderWidth: 1, borderColor: '#526173', borderRadius: 5, color: '#fff', fontFamily: 'dogicapixel', fontSize: 8, padding: 8, marginBottom: 6 },
  multiline: { minHeight: 54, textAlignVertical: 'top' },
  save: { backgroundColor: '#27ae60', borderRadius: 5, padding: 9, alignItems: 'center' },
});
