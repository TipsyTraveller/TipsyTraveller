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
  const [penaltySips, setPenaltySips] = useState('1');
  const [error, setError] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [removalCandidate, setRemovalCandidate] = useState(null);

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

  const removeStop = async (stop) => {
    setPendingAction(`remove-${stop.id}`);
    try {
      await removeCountryStop(stop.id);
    } catch (removeError) {
      setError(removeError?.message || 'Unable to remove country stop.');
    } finally {
      setPendingAction(null);
      setRemovalCandidate(null);
    }
  };

  const confirmRemove = (stop) => {
    setRemovalCandidate(stop.id);
  };

  const addChallenge = async (stop) => {
    if (!title.trim() || !prompt.trim()) return;
    setPendingAction(`challenge-${stop.id}`);
    const challenges = [...(stop.challenges || []), {
      id: `challenge-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      title: title.trim(),
      prompt: prompt.trim(),
      penalty: penalty.trim() || 'Take 1 sip.',
      penaltySips: Math.max(0, Math.round(Number(penaltySips) || 1)),
    }];
    try {
      await updateCountryStop(stop.id, { challenges });
      setEditingChallengeFor(null);
      setTitle('');
      setPrompt('');
      setPenalty('');
      setPenaltySips('1');
    } catch (updateError) {
      setError(updateError?.message || 'Unable to save challenge.');
    } finally {
      setPendingAction(null);
    }
  };

  const removeChallenge = async (stop, challengeId) => {
    await updateCountryStop(stop.id, {
      challenges: stop.challenges.filter((challenge) => challenge.id !== challengeId),
    });
  };

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Country Route Authoring</Text>
      <Text style={styles.description}>Manage the master stop catalogue used when new routes are generated. Existing rooms keep their saved route.</Text>
      <View style={styles.routeLegend}>
        <Text style={styles.legendItem}>SHORT · 6 STOPS</Text>
        <Text style={styles.legendItem}>MEDIUM · 9 STOPS</Text>
        <Text style={styles.legendItem}>LONG · 12 STOPS</Text>
      </View>
      {Boolean(error) && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={styles.addStop} onPress={() => beginPlacement({ mode: 'create' })}>
        <Text style={styles.buttonText}>＋ ADD COUNTRY STOP ON MAP</Text>
      </TouchableOpacity>

      {stops.map((stop, index) => (
        <View key={stop.id} style={styles.stopCard}>
          <View style={styles.stopHeader}>
            <View style={styles.stopCopy}>
              <Text style={styles.stopTitle}>{index + 1}. {stop.name.toUpperCase()}</Text>
              <Text style={styles.coordinates}>X {stop.position.x.toFixed(2)}  ·  Y {stop.position.y.toFixed(2)}  ·  {stop.challenges.length} challenge(s)</Text>
            </View>
            <TouchableOpacity disabled={index === 0} style={styles.iconButton} onPress={() => reorderCountryStop(stop.id, -1)}><Text style={styles.iconText}>↑</Text></TouchableOpacity>
            <TouchableOpacity disabled={index === stops.length - 1} style={styles.iconButton} onPress={() => reorderCountryStop(stop.id, 1)}><Text style={styles.iconText}>↓</Text></TouchableOpacity>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.secondary} onPress={() => beginPlacement({ mode: 'move', stop })}><Text style={styles.buttonText}>MOVE POINT</Text></TouchableOpacity>
            <TouchableOpacity style={styles.secondary} onPress={() => setEditingChallengeFor(editingChallengeFor === stop.id ? null : stop.id)}><Text style={styles.buttonText}>＋ CHALLENGE</Text></TouchableOpacity>
            <TouchableOpacity
              disabled={stops.length <= 2 || Boolean(pendingAction)}
              style={[styles.remove, (stops.length <= 2 || Boolean(pendingAction)) && styles.disabled]}
              onPress={() => confirmRemove(stop)}
            >
              <Text style={styles.buttonText}>{pendingAction === `remove-${stop.id}` ? 'REMOVING...' : 'REMOVE'}</Text>
            </TouchableOpacity>
          </View>
          {removalCandidate === stop.id && (
            <View style={styles.confirmationPanel}>
              <Text style={styles.confirmationTitle}>Remove {stop.name}?</Text>
              <Text style={styles.confirmationCopy}>Future routes will no longer use this stop. Existing room snapshots stay unchanged.</Text>
              <View style={styles.confirmationActions}>
                <TouchableOpacity style={styles.cancel} onPress={() => setRemovalCandidate(null)}>
                  <Text style={styles.buttonText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.remove} onPress={() => removeStop(stop)}>
                  <Text style={styles.buttonText}>REMOVE STOP</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {stop.challenges.map((challenge) => (
            <View key={challenge.id} style={styles.challengeRow}>
              <View style={styles.challengeCopy}>
                <Text style={styles.challengeTitle}>{challenge.title}</Text>
                <Text style={styles.challengePrompt}>{challenge.prompt}</Text>
                {challenge.type === 'countryWordGuess' ? (
                  <Text style={styles.coordinates}>
                    {`${challenge.words?.length || 0} words · list v${challenge.wordListVersion || 1}`}
                  </Text>
                ) : null}
                {challenge.type === 'geoGuessr' ? (
                  <Text style={styles.coordinates}>
                    {`${challenge.countryMonumentIds?.length || 1} monument(s) · pool v${challenge.monumentPoolVersion || 1}`}
                  </Text>
                ) : null}
              </View>
              {challenge.type === 'countryWordGuess' || challenge.type === 'geoGuessr' ? null : (
                <TouchableOpacity onPress={() => removeChallenge(stop, challenge.id)}><Text style={styles.deleteChallenge}>✕</Text></TouchableOpacity>
              )}
            </View>
          ))}
          {editingChallengeFor === stop.id && (
            <View style={styles.editor}>
              <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Challenge title" placeholderTextColor="#718096" />
              <TextInput style={[styles.input, styles.multiline]} value={prompt} onChangeText={setPrompt} placeholder="Challenge prompt" placeholderTextColor="#718096" multiline />
              <TextInput style={styles.input} value={penalty} onChangeText={setPenalty} placeholder="Penalty (optional)" placeholderTextColor="#718096" />
              <TextInput style={styles.input} value={penaltySips} onChangeText={setPenaltySips} placeholder="Base penalty sips" placeholderTextColor="#718096" keyboardType="number-pad" />
              <TouchableOpacity
                disabled={!title.trim() || !prompt.trim() || Boolean(pendingAction)}
                style={[styles.save, (!title.trim() || !prompt.trim() || Boolean(pendingAction)) && styles.disabled]}
                onPress={() => addChallenge(stop)}
              >
                <Text style={styles.buttonText}>{pendingAction === `challenge-${stop.id}` ? 'SAVING...' : 'SAVE CHALLENGE'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 8 },
  heading: { fontSize: 11, color: '#fff1cd', fontFamily: 'dogicapixelbold', marginTop: 8, marginBottom: 7 },
  description: { fontSize: 8.5, color: '#a9b8c4', fontFamily: 'dogicapixel', marginBottom: 10, lineHeight: 14 },
  routeLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  legendItem: { color: '#70d9d2', backgroundColor: '#123d3b', borderRadius: 999, paddingVertical: 5, paddingHorizontal: 8, fontFamily: 'dogicapixelbold', fontSize: 6.5 },
  error: { color: '#ff7b72', fontFamily: 'dogicapixel', fontSize: 8, marginBottom: 8 },
  addStop: { backgroundColor: '#1ba39c', borderRadius: 10, padding: 13, alignItems: 'center', marginBottom: 12 },
  stopCard: { backgroundColor: '#1c2c39', borderWidth: 1, borderColor: '#405567', borderRadius: 11, padding: 12, marginBottom: 10 },
  stopHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stopCopy: { flex: 1 },
  stopTitle: { color: '#ffd700', fontFamily: 'dogicapixelbold', fontSize: 8.5 },
  coordinates: { color: '#8892b0', fontFamily: 'dogicapixel', fontSize: 7, marginTop: 4 },
  iconButton: { width: 36, height: 36, backgroundColor: '#31485a', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: '#fff', fontSize: 14 },
  actionRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  secondary: { flex: 1, minHeight: 38, backgroundColor: '#2f80ed', borderRadius: 8, padding: 9, alignItems: 'center', justifyContent: 'center' },
  remove: { minHeight: 38, backgroundColor: '#a83a31', borderRadius: 8, padding: 9, alignItems: 'center', justifyContent: 'center' },
  confirmationPanel: { marginTop: 8, padding: 10, backgroundColor: '#3b2425', borderWidth: 1, borderColor: '#a83a31', borderRadius: 8 },
  confirmationTitle: { color: '#fff1cd', fontFamily: 'dogicapixelbold', fontSize: 8, marginBottom: 5 },
  confirmationCopy: { color: '#e5bdba', fontFamily: 'dogicapixel', fontSize: 7, lineHeight: 11 },
  confirmationActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6, marginTop: 9 },
  cancel: { minHeight: 38, backgroundColor: '#405064', borderRadius: 8, padding: 9, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontFamily: 'dogicapixelbold', fontSize: 7.5, textAlign: 'center' },
  challengeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 7, backgroundColor: '#16202a', padding: 8, borderRadius: 5 },
  challengeCopy: { flex: 1 },
  challengeTitle: { color: '#fff', fontFamily: 'dogicapixelbold', fontSize: 7.5 },
  challengePrompt: { color: '#a0aec0', fontFamily: 'dogicapixel', fontSize: 7, marginTop: 3, lineHeight: 10 },
  deleteChallenge: { color: '#ff7b72', fontSize: 12, padding: 5 },
  editor: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#405064', paddingTop: 8 },
  input: { minHeight: 42, backgroundColor: '#101b25', borderWidth: 1, borderColor: '#526b7e', borderRadius: 8, color: '#fff', fontFamily: 'dogicapixel', fontSize: 8, padding: 10, marginBottom: 7 },
  multiline: { minHeight: 54, textAlignVertical: 'top' },
  save: { minHeight: 42, backgroundColor: '#239b56', borderRadius: 8, padding: 10, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.45 },
});
