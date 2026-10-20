import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { addCountryStop } from '../services/countryStopsService';

export default function CountryStopPlacementForm({ mode, onCancel, onSaved, position, stop }) {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [penalty, setPenalty] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode === 'create') {
      setName('');
      setTitle('');
      setPrompt('');
      setPenalty('');
    }
  }, [mode, position]);

  if (!position) {
    return (
      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          {mode === 'move' ? `CLICK THE MAP TO MOVE ${stop?.name?.toUpperCase()}` : 'CLICK THE MAP TO PLACE THE NEW STOP'}
        </Text>
        <TouchableOpacity onPress={onCancel} style={styles.cancelCompact}>
          <Text style={styles.buttonText}>CANCEL</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const save = async () => {
    if (!name.trim() || !title.trim() || !prompt.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      const created = await addCountryStop({
        name: name.trim(),
        position,
        accent: '#1ba39c',
        challenges: [{
          id: `challenge-${Date.now().toString(36)}`,
          title: title.trim(),
          prompt: prompt.trim(),
          penalty: penalty.trim() || 'Take 1 sip.',
        }],
      });
      onSaved(created);
    } catch (saveError) {
      setError(saveError.message || 'Could not save the country stop.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <Text style={styles.heading}>NEW COUNTRY STOP</Text>
        <Text style={styles.coordinates}>MAP POSITION {position.x.toFixed(2)}, {position.y.toFixed(2)}</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Country name" placeholderTextColor="#718096" />
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Challenge title" placeholderTextColor="#718096" />
        <TextInput style={[styles.input, styles.multiline]} value={prompt} onChangeText={setPrompt} placeholder="Challenge prompt" placeholderTextColor="#718096" multiline />
        <TextInput style={styles.input} value={penalty} onChangeText={setPenalty} placeholder="Penalty (optional)" placeholderTextColor="#718096" />
        {Boolean(error) && <Text style={styles.error}>{error}</Text>}
        <View style={styles.actions}>
          <TouchableOpacity onPress={onCancel} style={[styles.button, styles.cancel]}><Text style={styles.buttonText}>CANCEL</Text></TouchableOpacity>
          <TouchableOpacity disabled={!name.trim() || !title.trim() || !prompt.trim() || saving} onPress={save} style={[styles.button, styles.save]}>
            <Text style={styles.buttonText}>{saving ? 'SAVING...' : 'SAVE STOP'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { position: 'absolute', top: 18, alignSelf: 'center', zIndex: 100000, backgroundColor: '#131c24', borderColor: '#ffd700', borderWidth: 2, borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 16 },
  bannerText: { color: '#ffd700', fontFamily: 'dogicapixelbold', fontSize: 10 },
  cancelCompact: { backgroundColor: '#c0392b', borderRadius: 5, padding: 8 },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 100000, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center' },
  card: { width: '92%', maxWidth: 520, backgroundColor: '#1a2530', borderWidth: 2, borderColor: '#ffd700', borderRadius: 12, padding: 18 },
  heading: { color: '#ffd700', fontFamily: 'dogicapixelbold', fontSize: 13, marginBottom: 6 },
  coordinates: { color: '#1ba39c', fontFamily: 'dogicapixel', fontSize: 8, marginBottom: 12 },
  input: { backgroundColor: '#131c24', borderWidth: 1, borderColor: '#526173', borderRadius: 6, color: '#fff', fontFamily: 'dogicapixel', fontSize: 9, paddingHorizontal: 10, paddingVertical: 9, marginBottom: 8 },
  multiline: { minHeight: 64, textAlignVertical: 'top' },
  error: { color: '#ff7b72', fontFamily: 'dogicapixel', fontSize: 8, marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  button: { flex: 1, padding: 11, borderRadius: 6, alignItems: 'center' },
  cancel: { backgroundColor: '#526173' },
  save: { backgroundColor: '#1ba39c' },
  buttonText: { color: '#fff', fontFamily: 'dogicapixelbold', fontSize: 8 },
});
