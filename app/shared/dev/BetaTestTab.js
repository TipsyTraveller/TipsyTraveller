import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, Path, Polyline, Text as SvgText } from 'react-native-svg';
import { BETA_TEAM_IDS, createBetaPreset, createBetaSnapshot, getBetaContentOptions } from '../../GameScreen/constants/betaScenario';
import { COUNTRY_CITY_COORDINATES, DEFAULT_COUNTRY_STOPS } from '../../GameScreen/constants/countryStops';
import { geoToEuropeSvgCoords } from '../../GameScreen/constants/europeMapPaths';
import { EUROPE_MAP_OVERVIEW_PATH_DATA } from '../../GameScreen/constants/europeMapOverviewPath';
import {
  createBetaDraft, editBetaChallenge, editBetaMustPlay, editBetaChallengeDrinks, editBetaRoute, editBetaTeamContent, saveBetaTextChallenge,
  getBetaContentId, getBetaContentLabel, loadBetaDraft, refreshBetaDraftWords, saveBetaDraft,
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
  const [search, setSearch] = useState('');
  return <View style={styles.choice}>
    <Text style={styles.label}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded: open, disabled }}
      disabled={disabled} onPress={() => setOpen(!open)} style={styles.input}>
      <Text style={styles.copy}>{options.find((option) => option.id === value)?.label || value || 'Kies…'} ▾</Text>
    </Pressable>
    {open && options.length > 8 && <TextInput accessibilityLabel={`Zoek ${label}`} placeholder="Zoeken…" placeholderTextColor="#a9b8c4" style={styles.input} value={search} onChangeText={setSearch} />}
    {open && options.filter((option) => option.label.toLowerCase().includes(search.toLowerCase())).map((option) => <Pressable key={option.id} accessibilityRole="button" accessibilityLabel={`${label}: ${option.label}`}
      onPress={() => { onChange(option.id); setOpen(false); setSearch(''); }} style={[styles.option, option.id === value && styles.selected]}>
      <Text style={styles.copy}>{option.label}</Text>
    </Pressable>)}
  </View>;
};

function TextChallengeEditor({ challenge, pending, onSave, onCancel }) {
  const [title, setTitle] = useState(challenge?.title || '');
  const [prompt, setPrompt] = useState(challenge?.prompt || '');
  return <View style={styles.editor}>
    <Text style={styles.label}>{challenge ? 'Tekst bewerken' : 'Nieuwe tekstopdracht'}</Text>
    <Text style={styles.copy}>Dezelfde opdracht voor alle drie teams. Nieuwe opdrachten duren 30 seconden; bij mislukken geldt het ingestelde aantal slokken voor het hele team.</Text>
    <Text style={styles.label}>Titel</Text>
    <TextInput accessibilityLabel="Titel tekstopdracht" placeholder="Bijvoorbeeld: Breng een toast uit" placeholderTextColor="#a9b8c4" style={styles.input} value={title} onChangeText={setTitle} editable={!pending} />
    <Text style={styles.label}>Wat moeten de spelers doen?</Text>
    <TextInput accessibilityLabel="Opdrachttekst" placeholder="Schrijf hier de volledige opdracht…" placeholderTextColor="#a9b8c4" style={[styles.input, styles.multiline]} value={prompt} onChangeText={setPrompt} multiline editable={!pending} />
    <View style={styles.row}>
      <Action label="Gebruik deze opdracht" disabled={pending || !title.trim() || !prompt.trim()} onPress={() => onSave({ id: challenge?.id, title, prompt })} />
      <Action label="Annuleren" secondary disabled={pending} onPress={onCancel} />
    </View>
  </View>;
}

function Preview({ snapshot, onClose }) {
  const [teamId, setTeamId] = useState('team1');
  const [photoError, setPhotoError] = useState({});
  const points = snapshot.routeStops.map((stop) => {
    const center = COUNTRY_CITY_COORDINATES.get(stop.id);
    return center ? geoToEuropeSvgCoords(center.longitude, center.latitude) : null;
  });
  return <View style={styles.card}>
    <Text style={styles.heading}>Preview · {snapshot.routeStops.length} landen</Text>
    <Text style={styles.copy}>De geplande route en opdrachten. Met “Altijd spelen” krijgt elk team de opdracht in dat land. Slaat de worp het land over, dan verhuist de opdracht naar het volgende land waar dat team landt.</Text>
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
        <Text style={styles.label}>{index + 1}. {stop.name} · {plan?.challenge.title || (index === 0 ? 'Start' : 'Finish')}{plan?.mustPlay ? ' · Altijd spelen' : ''}</Text>
        {plan && <><Text style={styles.copy}>{plan.challenge.prompt}</Text><Text style={styles.accent}>{plan.challenge.penaltySips} drankjes · basisstraf</Text></>}
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
  const [step, setStep] = useState('route');
  const [countrySearch, setCountrySearch] = useState('');
  const [textEditor, setTextEditor] = useState(null);
  const actionLock = useRef(false);
  const createdRoom = useRef(null);

  useEffect(() => {
    if (draft) {
      try {
        const refreshed = refreshBetaDraftWords(draft);
        if (refreshed !== draft) setDraft(refreshed);
      } catch (failure) { setError(failure.message); }
      return undefined;
    }
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
    <View style={styles.row}>{[['route', '1 · Route & opdrachten'], ['preview', '2 · Controleren'], ['players', '3 · Spelers & starten']].map(([id, label]) => <Action key={id} label={label} secondary={step !== id} disabled={pending} onPress={() => { setStep(id); if (id === 'preview') setPreview(createBetaSnapshot(scenario)); }} />)}</View>
    <Text style={styles.copy}>Drie telefoons, drie teams van drie. Richttijd: 60–90 minuten. De host en zes spelers zonder telefoon worden meteen geregistreerd; de twee andere leiders joinen via de PIN.</Text>
    <Text style={styles.accent}>{scenario.routeStops.length} landen · België + Italië verplicht · Easy</Text>
    {Boolean(error) && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {Boolean(message) && <Text accessibilityLiveRegion="polite" style={styles.accent}>{message}</Text>}
    <View style={styles.row}>
      <Action label="Bewaar concept" disabled={pending} onPress={() => run(async () => { await saveBetaDraft(AsyncStorage, draft); setMessage('Concept bewaard op dit toestel.'); })} />
      <Action label="Herstel preset" disabled={pending} secondary onPress={() => { edit(() => createBetaPreset()); setExpanded(null); }} />
      <Action label="Preview" disabled={pending} secondary onPress={() => run(() => { setPreview(createBetaSnapshot(scenario)); setStep('preview'); })} />
    </View>
    {step === 'preview' && <><Preview snapshot={preview || createBetaSnapshot(scenario)} onClose={() => setStep('route')} /><Action label="Verder naar spelers" onPress={() => setStep('players')} /></>}
    {step === 'players' && <View style={styles.card}>
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
      {!namesReady && <Text style={styles.copy}>Vul de hostnaam en zes spelersnamen in om de lobby te maken. De twee andere teamleiders vullen hun naam in bij het joinen.</Text>}
    </View>}
    {step === 'route' && <>
    <Text style={styles.heading}>Route en opdrachten</Text>
    <TextInput accessibilityLabel="Zoek land in route" placeholder="Zoek een land…" placeholderTextColor="#a9b8c4" style={styles.input} value={countrySearch} onChangeText={setCountrySearch} />
    <Text style={styles.copy}>Ongeldige afstanden, bochten, kruisingen en dubbele inhoud worden geweigerd. Tik op een land om de opdracht en Team 1/2/3 te kiezen.</Text>
    {!scenario.routeStops.some((stop) => stop.name.toLowerCase().includes(countrySearch.toLowerCase())) && <Text style={styles.copy}>Geen landen gevonden.</Text>}
    {scenario.routeStops.map((stop, index) => {
      if (!stop.name.toLowerCase().includes(countrySearch.toLowerCase())) return null;
      const plan = scenario.betaScenario.stops[stop.id];
      const isOpen = expanded === stop.id;
      const move = (offset) => edit((value) => { const next = [...ids]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; return editBetaRoute(value, next); });
      return <View key={stop.id} style={styles.card}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Bewerk ${stop.name}`} accessibilityState={{ expanded: isOpen }} onPress={() => { setExpanded(isOpen ? null : stop.id); setTextEditor(null); }}>
          <Text style={styles.label}>{index + 1}. {stop.name}{['belgium', 'italy'].includes(stop.id) ? ' ★' : ''}</Text>
          <Text style={styles.copy}>{plan?.challenge.title || (index === 0 ? 'Start · geen opdracht' : 'Finish · geen opdracht')}{plan?.mustPlay ? ' · Altijd spelen' : ''}{plan ? ` · ${plan.challenge.penaltySips} drankjes` : ''} {isOpen ? '▴' : '▾'}</Text>
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
              onChange={(id) => { if (edit((value) => editBetaChallenge(value, stop.id, id))) setTextEditor(null); }} />
            <Text style={styles.copy}>{plan.challenge.prompt}</Text>
            <View style={styles.row}>
              <Switch accessibilityLabel={`Altijd spelen: ${stop.name}`} value={plan.mustPlay === true} disabled={pending}
                trackColor={{ false: '#405567', true: '#157d77' }}
                onValueChange={(enabled) => edit((value) => editBetaMustPlay(value, stop.id, enabled))} />
              <Text style={styles.label}>Altijd spelen</Text>
            </View>
            <Text style={styles.copy}>Elk team speelt deze opdracht hier. Wordt dit land overgeslagen, dan schuift de opdracht door naar het volgende land waar het team landt. De worp blijft hetzelfde. Meerdere doorgeschoven opdrachten komen na elkaar, ook bij de finish. Een andere opdracht kiezen zet dit uit.</Text>

            <Choice label={`Drankjes ${stop.name}`} value={String(plan.challenge.penaltySips)} disabled={pending}
              options={Array.from({ length: 10 }, (_, count) => ({ id: String(count), label: `${count} ${count === 1 ? 'drankje' : 'drankjes'}` }))}
              onChange={(count) => edit((value) => editBetaChallengeDrinks(value, stop.id, Number(count)))} />
            <Text style={styles.copy}>Aantal slokken per betrokken speler. De spelregels van de opdracht bepalen wie drinkt en bij welk resultaat.</Text>
            <View style={styles.row}>
              <Action label="＋ Tekstopdracht" secondary disabled={pending} onPress={() => setTextEditor('new')} />
              {(!plan.challenge.type || plan.challenge.type === 'ordinary') && <Action label="Bewerk tekst" secondary disabled={pending} onPress={() => setTextEditor(plan.challenge.id)} />}
            </View>
            {textEditor && <TextChallengeEditor key={`${stop.id}-${textEditor}`} challenge={textEditor === 'new' ? null : plan.challenge} pending={pending}
              onCancel={() => setTextEditor(null)} onSave={(fields) => {
                if (edit((value) => saveBetaTextChallenge(value, stop.id, { ...fields, penaltySips: plan.challenge.penaltySips }))) setTextEditor(null);
              }} />}
            {!plan.challenge.type && <Text style={styles.accent}>Tekstopdracht · dezelfde tekst voor alle teams</Text>}
            {plan.challenge.type && plan.challenge.type !== 'ordinary' && BETA_TEAM_IDS.map((key, teamIndex) => {
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
    <Action label="Verder naar preview" disabled={pending} onPress={() => { setPreview(createBetaSnapshot(scenario)); setStep('preview'); }} />
    </>}
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
  editor: { borderTopWidth: 1, borderTopColor: '#526b7e', marginTop: 10, paddingTop: 8 },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
  choice: { marginVertical: 4 },
  option: { backgroundColor: '#26394a', padding: 12, minHeight: 44, borderBottomColor: '#526b7e', borderBottomWidth: 1 },
  selected: { backgroundColor: '#15534f' },
  previewStop: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#405567' },
  photo: { height: 180, width: '100%', marginVertical: 8 },
});
