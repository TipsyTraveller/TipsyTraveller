import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, Path, Polyline, Text as SvgText } from 'react-native-svg';
import { BETA_TEAM_IDS, createBetaPreset, createBetaSnapshot, getBetaContentOptions } from '../../GameScreen/constants/betaScenario';
import { COUNTRY_CITY_COORDINATES, DEFAULT_COUNTRY_STOPS } from '../../GameScreen/constants/countryStops';
import { geoToEuropeSvgCoords } from '../../GameScreen/constants/europeMapPaths';
import { EUROPE_MAP_OVERVIEW_PATH_DATA } from '../../GameScreen/constants/europeMapOverviewPath';
import {
  createBetaDraft, editBetaChallenge, editBetaRoute, editBetaTeamContent,
  getBetaContentId, getBetaContentLabel, loadBetaDraft, saveBetaDraft,
} from './betaDraft';
import { createBetaLobby } from './betaRoomService';
import { resetRoot } from './devNavigation';

const Action = ({ label, onPress, disabled, secondary = false }) => (
  <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
    style={[styles.button, secondary && styles.secondary, disabled && styles.disabled]}>
    <Text style={styles.buttonText}>{label}</Text>
  </Pressable>
);

const Choice = ({ label, value, options, disabled, onChange }) => {
  const [open, setOpen] = useState(false);
  return <View style={styles.choice}>
    <Text style={styles.label}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded: open, disabled }}
      disabled={disabled} onPress={() => setOpen(!open)} style={styles.input}>
      <Text style={styles.copy}>{options.find((option) => option.id === value)?.label || value || 'Kies…'} ▾</Text>
    </Pressable>
    {open && options.map((option) => <Pressable key={option.id} accessibilityRole="button" accessibilityLabel={`${label}: ${option.label}`}
      onPress={() => { onChange(option.id); setOpen(false); }} style={[styles.option, option.id === value && styles.selected]}>
      <Text style={styles.copy}>{option.label}</Text>
    </Pressable>)}
  </View>;
};

function Preview({ snapshot, onClose }) {
  const [teamId, setTeamId] = useState('team1');
  const [photoError, setPhotoError] = useState({});
  const points = snapshot.routeStops.map((stop) => {
    const center = COUNTRY_CITY_COORDINATES.get(stop.id);
    return center ? geoToEuropeSvgCoords(center.longitude, center.latitude) : null;
  });
  return <View style={styles.card}>
    <Text style={styles.heading}>Preview · {snapshot.routeStops.length} landen</Text>
    <Text style={styles.copy}>De geplande route en opdrachten. Dobbelworpen kunnen landen overslaan; speciale gebeurtenissen kunnen een opdracht vervangen.</Text>
    <Svg viewBox="0 0 1000 700" width="100%" height={240} accessibilityLabel="Bèta-routekaart">
      <Path d={EUROPE_MAP_OVERVIEW_PATH_DATA} fill="#304c55" stroke="#76929a" strokeWidth={1} />
      <Polyline points={points.filter(Boolean).map((point) => `${point.svgX},${point.svgY}`).join(' ')} fill="none" stroke="#ffd700" strokeWidth={3} />
      {points.map((point, index) => point && <Circle key={`dot-${index}`} cx={point.svgX} cy={point.svgY} r={6} fill="#70d9d2" />)}
      {points.map((point, index) => point && <SvgText key={`label-${index}`} x={point.svgX + 8} y={point.svgY - 6} fill="#fff1cd" fontSize={14}>{index + 1}</SvgText>)}
    </Svg>
    <Text style={styles.notice}>Hostpreview: hieronder staan de geheime woorden en fotolocaties. Bekijk dit vooraf, buiten het zicht van de teams.</Text>
    <View style={styles.row}>{BETA_TEAM_IDS.map((key, index) => <Action key={key} label={`Team ${index + 1}`} secondary={teamId !== key} onPress={() => setTeamId(key)} />)}</View>
    {snapshot.routeStops.map((stop, index) => {
      const plan = snapshot.betaScenario.stops[stop.id];
      const content = plan?.contentByTeam[teamId];
      return <View key={stop.id} style={styles.previewStop}>
        <Text style={styles.label}>{index + 1}. {stop.name} · {plan?.challenge.title || (index === 0 ? 'Start' : 'Finish')}</Text>
        {plan && <Text style={styles.copy}>{plan.challenge.prompt}</Text>}
        {content?.type !== 'ordinary' && content && <Text style={styles.accent}>{getBetaContentLabel(content)}</Text>}
        {content?.question && <Text style={styles.copy}>{content.question.options.join(' · ')}</Text>}
        {content?.round && <Text style={styles.copy}>{content.round.reference.metres} m ({content.round.reference.axis}) / {content.round.target.metres} m ({content.round.target.axis})</Text>}
        {content?.monument && <>
          {photoError[content.monument.id] ? <Text style={styles.error}>Foto niet beschikbaar. Controleer deze foto op de telefoons.</Text>
            : <Image source={{ uri: content.monument.imageUrl }} style={styles.photo} resizeMode="contain"
              accessibilityLabel={content.monument.name} onError={() => setPhotoError((errors) => ({ ...errors, [content.monument.id]: true }))} />}
          <Text style={styles.copy}>{content.monument.imageAuthor} · {content.monument.imageLicense}</Text>
        </>}
      </View>;
    })}
    <Action label="Sluit preview" onPress={onClose} />
  </View>;
}

export default function BetaTestTab({ onClose, draft, setDraft }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [addCountry, setAddCountry] = useState('');
  const [insertBefore, setInsertBefore] = useState('greece');
  const [preview, setPreview] = useState(null);
  const actionLock = useRef(false);
  const createdRoom = useRef(null);

  useEffect(() => {
    if (draft) return undefined;
    let active = true;
    loadBetaDraft(AsyncStorage).then((saved) => { if (active) setDraft(saved); }).catch(() => {
      if (active) { setDraft(createBetaDraft()); setError('Het concept kon niet worden geladen. De preset staat klaar; het opgeslagen concept is niet overschreven.'); }
    });
    return () => { active = false; };
  }, [draft, setDraft]);

  const edit = (change) => {
    try {
      setDraft({ ...draft, scenario: change(draft.scenario) });
      setError(''); setMessage('Niet-opgeslagen wijzigingen'); setPreview(null);
      return true;
    } catch (failure) {
      setError(failure.errors?.[0]?.message || failure.message);
      return false;
    }
  };
  const run = async (work) => {
    if (actionLock.current) return;
    actionLock.current = true; setPending(true); setError(''); setMessage('');
    try { await work(); } catch (failure) { setError(failure.errors?.[0]?.message || failure.message || 'Actie mislukt. Probeer opnieuw.'); }
    finally { actionLock.current = false; setPending(false); }
  };
  const updateNames = (patch) => { setDraft({ ...draft, ...patch }); setMessage('Niet-opgeslagen wijzigingen'); };

  if (!draft) return <Text style={styles.copy}>Bèta-concept laden…</Text>;
  const { scenario } = draft;
  const ids = scenario.routeStops.map((stop) => stop.id);
  const namesReady = draft.hostName.trim() && BETA_TEAM_IDS.every((key) => draft.guestNames[key].every((name) => name.trim()));

  return <View>
    <Text style={styles.heading}>Beta Test · negen vrienden</Text>
    <Text style={styles.copy}>Drie telefoons, drie teams van drie. Richttijd: 60–90 minuten. De host en zes spelers zonder telefoon worden meteen geregistreerd; de twee andere leiders joinen via de PIN.</Text>
    <Text style={styles.accent}>{scenario.routeStops.length} landen · België + Italië verplicht · Easy</Text>
    {Boolean(error) && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {Boolean(message) && <Text accessibilityLiveRegion="polite" style={styles.accent}>{message}</Text>}
    <View style={styles.row}>
      <Action label="Bewaar concept" disabled={pending} onPress={() => run(async () => { await saveBetaDraft(AsyncStorage, draft); setMessage('Concept bewaard op dit toestel.'); })} />
      <Action label="Herstel preset" disabled={pending} secondary onPress={() => { edit(() => createBetaPreset()); setExpanded(null); }} />
      <Action label="Preview" disabled={pending} secondary onPress={() => run(() => setPreview(createBetaSnapshot(scenario)))} />
    </View>
    {preview && <Preview snapshot={preview} onClose={() => setPreview(null)} />}
    <View style={styles.card}>
      <Text style={styles.label}>Host · leider Team 1</Text>
      <TextInput accessibilityLabel="Hostnaam" placeholder="Hostnaam" placeholderTextColor="#a9b8c4" style={styles.input} value={draft.hostName} editable={!pending}
        onChangeText={(hostName) => updateNames({ hostName })} maxLength={40} />
      {BETA_TEAM_IDS.map((key, index) => <View key={key}>
        <Text style={styles.label}>Team {index + 1} · twee spelers zonder telefoon</Text>
        {draft.guestNames[key].map((name, guestIndex) => <TextInput key={guestIndex} style={styles.input} value={name} editable={!pending} maxLength={40}
          accessibilityLabel={`Team ${index + 1} speler ${guestIndex + 1}`} placeholder={`Speler ${guestIndex + 1}`} placeholderTextColor="#a9b8c4"
          onChangeText={(value) => updateNames({ guestNames: { ...draft.guestNames, [key]: draft.guestNames[key].map((old, i) => i === guestIndex ? value : old) } })} />)}
      </View>)}
      <Action label={pending ? 'Even wachten…' : 'Maak bèta-lobby'} disabled={pending || !namesReady} onPress={() => run(async () => {
        const room = createdRoom.current || await createBetaLobby(draft);
        createdRoom.current = room;
        resetRoot([{ name: 'Home' }, { name: 'LobbyScreen', params: { gameID: room.gameID, isHost: true, hostName: room.gameData.HostName, gameSettings: room.gameData } }]);
        onClose();
      })} />
    </View>
    <Text style={styles.heading}>Route en opdrachten</Text>
    <Text style={styles.copy}>Ongeldige afstanden, bochten, kruisingen en dubbele inhoud worden geweigerd. Tik op een land om de opdracht en Team 1/2/3 te kiezen.</Text>
    {scenario.routeStops.map((stop, index) => {
      const plan = scenario.betaScenario.stops[stop.id];
      const isOpen = expanded === stop.id;
      const move = (offset) => edit((value) => { const next = [...ids]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; return editBetaRoute(value, next); });
      return <View key={stop.id} style={styles.card}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Bewerk ${stop.name}`} onPress={() => setExpanded(isOpen ? null : stop.id)}>
          <Text style={styles.label}>{index + 1}. {stop.name}{['belgium', 'italy'].includes(stop.id) ? ' ★' : ''}</Text>
          <Text style={styles.copy}>{plan?.challenge.title || (index === 0 ? 'Start · geen opdracht' : 'Finish · geen opdracht')}</Text>
        </Pressable>
        {isOpen && <>
          <View style={styles.row}>
            <Action label={`${stop.name} omhoog`} secondary disabled={pending || index === 0 || index === ids.length - 1} onPress={() => move(-1)} />
            <Action label={`${stop.name} omlaag`} secondary disabled={pending || index >= ids.length - 2} onPress={() => move(1)} />
            <Action label={`Verwijder ${stop.name}`} secondary disabled={pending || ['belgium', 'italy', 'greece'].includes(stop.id) || index === 0}
              onPress={() => edit((value) => editBetaRoute(value, ids.filter((id) => id !== stop.id)))} />
          </View>
          {plan && <>
            <Choice label={`Challenge ${stop.name}`} value={plan.challenge.id} disabled={pending}
              options={stop.challenges.filter((challenge) => challenge.minPlayers <= 3).map((challenge) => ({ id: challenge.id, label: challenge.title }))}
              onChange={(id) => edit((value) => editBetaChallenge(value, stop.id, id))} />
            <Text style={styles.copy}>{plan.challenge.prompt}</Text>
            {plan.challenge.type && BETA_TEAM_IDS.map((key, teamIndex) => {
              const options = getBetaContentOptions(stop, plan.challenge.id);
              const selected = plan.contentByTeam[key];
              const selectedId = getBetaContentId(selected);
              if (!options.some((option) => option.id === selectedId)) options.unshift({ id: selectedId, label: getBetaContentLabel(selected) });
              return <Choice key={key} label={`${stop.name} Team ${teamIndex + 1}`} value={selectedId} options={options} disabled={pending}
                onChange={(id) => edit((value) => editBetaTeamContent(value, stop.id, key, id))} />;
            })}
          </>}
        </>}
      </View>;
    })}
    <View style={styles.card}>
      <Choice label="Land toevoegen" value={addCountry} disabled={pending} options={DEFAULT_COUNTRY_STOPS.filter((stop) => !ids.includes(stop.id)).map((stop) => ({ id: stop.id, label: stop.name }))} onChange={setAddCountry} />
      <Choice label="Invoegen vóór" value={insertBefore} disabled={pending} options={scenario.routeStops.map((stop) => ({ id: stop.id, label: stop.name }))} onChange={setInsertBefore} />
      <Action label="Voeg land toe" disabled={pending || !addCountry || ids.includes(addCountry) || !ids.includes(insertBefore)} onPress={() => {
        const added = edit((value) => {
          const next = [...ids]; next.splice(ids.indexOf(insertBefore), 0, addCountry); return editBetaRoute(value, next);
        });
        if (added) setAddCountry('');
      }} />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  heading: { color: '#fff1cd', fontFamily: 'dogicapixelbold', fontSize: 12, marginVertical: 12 },
  copy: { color: '#c3ced7', fontSize: 13, lineHeight: 20 },
  label: { color: '#fff1cd', fontSize: 14, fontWeight: '700', marginVertical: 7 },
  accent: { color: '#70d9d2', fontSize: 13, marginVertical: 8 },
  error: { color: '#ff9d97', fontSize: 14, lineHeight: 20, marginVertical: 10 },
  notice: { color: '#ffd700', fontSize: 13, lineHeight: 20, marginVertical: 10 },
  card: { backgroundColor: '#1c2c39', borderWidth: 1, borderColor: '#405567', borderRadius: 10, padding: 12, marginVertical: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  button: { minHeight: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: '#157d77', borderRadius: 8, padding: 12 },
  secondary: { backgroundColor: '#31485a' },
  buttonText: { color: '#fff', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  disabled: { opacity: 0.4 },
  input: { minHeight: 44, color: '#fff', backgroundColor: '#101b25', borderWidth: 1, borderColor: '#526b7e', borderRadius: 8, fontSize: 14, padding: 10, marginVertical: 5 },
  choice: { marginVertical: 4 },
  option: { backgroundColor: '#26394a', padding: 12, minHeight: 44, borderBottomColor: '#526b7e', borderBottomWidth: 1 },
  selected: { backgroundColor: '#15534f' },
  previewStop: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#405567' },
  photo: { height: 180, width: '100%', marginVertical: 8 },
});
