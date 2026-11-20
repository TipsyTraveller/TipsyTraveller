import {
  BETA_TEAM_IDS, createBetaPreset, createBetaSnapshot, createBetaStopPlan, getBetaContentOptions,
} from '../../GameScreen/constants/betaScenario.js';
import { DEFAULT_COUNTRY_STOPS } from '../../GameScreen/constants/countryStops.js';

export const BETA_DRAFT_KEY = 'tipsytraveller_beta_draft_v1';
export const createBetaDraft = () => ({
  schemaVersion: 1, scenario: createBetaPreset(), hostName: '',
  guestNames: { team1: ['', ''], team2: ['', ''], team3: ['', ''] },
});

export const snapshotBetaDraft = (draft) => {
  if (draft?.schemaVersion !== 1 || typeof draft.hostName !== 'string'
    || BETA_TEAM_IDS.some((key) => !Array.isArray(draft.guestNames?.[key]) || draft.guestNames[key].length !== 2
      || draft.guestNames[key].some((name) => typeof name !== 'string'))) {
    throw new Error('Het opgeslagen bèta-concept heeft een ongeldige indeling.');
  }
  return {
    schemaVersion: 1, scenario: createBetaSnapshot(draft.scenario), hostName: draft.hostName,
    guestNames: Object.fromEntries(BETA_TEAM_IDS.map((key) => [key, [...draft.guestNames[key]]])),
  };
};

// Refresh editor pools only. Existing room snapshots and chosen team words stay fixed.
export const refreshBetaDraftWords = (draft) => {
  const snapshot = snapshotBetaDraft(draft);
  let changed = false;
  for (const stop of snapshot.scenario.routeStops) {
    const bundled = DEFAULT_COUNTRY_STOPS.find((item) => item.id === stop.id)
      ?.challenges.find((item) => item.type === 'countryWordGuess');
    if (!bundled) continue;
    const plan = snapshot.scenario.betaScenario.stops[stop.id];
    for (const challenge of stop.challenges) {
      if (challenge.type !== 'countryWordGuess' || challenge.id !== bundled.id) continue;
      const selected = plan?.challenge.id === challenge.id ? plan : null;
      const words = [...new Set([...bundled.words, ...challenge.words, ...(selected?.challenge.words || [])])];
      const version = Math.max(bundled.wordListVersion, challenge.wordListVersion, selected?.challenge.wordListVersion || 1);
      if (challenge.wordListVersion === version && challenge.words.length === words.length
        && challenge.words.every((word, index) => word === words[index])
        && (!selected || (selected.challenge.wordListVersion === version
          && selected.challenge.words.length === words.length
          && selected.challenge.words.every((word, index) => word === words[index])))) continue;
      challenge.words = words;
      challenge.wordListVersion = version;
      if (selected) {
        selected.challenge.words = [...words];
        selected.challenge.wordListVersion = version;
        BETA_TEAM_IDS.forEach((teamId) => { selected.contentByTeam[teamId].wordListVersion = version; });
      }
      changed = true;
    }
  }
  return changed ? snapshotBetaDraft(snapshot) : draft;
};

export const loadBetaDraft = async (storage) => {
  const saved = await storage.getItem(BETA_DRAFT_KEY);
  return saved ? refreshBetaDraftWords(snapshotBetaDraft(JSON.parse(saved))) : createBetaDraft();
};
export const saveBetaDraft = async (storage, draft) => {
  const snapshot = snapshotBetaDraft(draft);
  await storage.setItem(BETA_DRAFT_KEY, JSON.stringify(snapshot));
  return snapshot;
};

export const getBetaContentId = (content) => content?.word || content?.question?.id || content?.monument?.id || content?.round?.id;
export const getBetaContentLabel = (content) => content?.word || content?.question?.prompt
  || (content?.monument && `${content.monument.name} (${content.monument.countryName})`)
  || (content?.round && `${content.round.reference.label} / ${content.round.target.label}`) || 'Dezelfde opdracht';

const defaultPlan = (scenario, stop, challengeId) => {
  const used = new Set(Object.entries(scenario.betaScenario.stops).filter(([id]) => id !== stop.id)
    .flatMap(([, plan]) => Object.values(plan.contentByTeam).map((content) => `${content.type}:${getBetaContentId(content)}`)));
  const options = getBetaContentOptions(stop, challengeId);
  const contentIdsByTeam = {};
  if (options.length) BETA_TEAM_IDS.forEach((key) => {
    const choice = options.find((option) => !used.has(`${option.fixedContent.type}:${option.id}`));
    if (!choice) throw new Error('Er is onvoldoende unieke inhoud voor drie teams.');
    contentIdsByTeam[key] = choice.id;
    used.add(`${choice.fixedContent.type}:${choice.id}`);
  });
  return createBetaStopPlan({ stop, challengeId, contentIdsByTeam });
};

// Edits return a new validated envelope or throw; the editor keeps its prior draft on failure.
export const editBetaRoute = (scenario, countryIds) => {
  const next = createBetaSnapshot(scenario);
  const catalogue = new Map([...DEFAULT_COUNTRY_STOPS, ...next.routeStops].map((stop) => [stop.id, stop]));
  next.routeStops = countryIds.map((id, order) => {
    const stop = catalogue.get(id);
    if (!stop) throw new Error('Onbekend land.');
    return { ...stop, order };
  });
  const interior = countryIds.slice(1, -1);
  next.betaScenario.stops = Object.fromEntries(Object.entries(next.betaScenario.stops).filter(([id]) => interior.includes(id)));
  next.routeStops.slice(1, -1).forEach((stop) => {
    if (!next.betaScenario.stops[stop.id]) {
      const challenge = stop.challenges.find((item) => !item.type && item.minPlayers <= 3);
      if (!challenge) throw new Error('Dit land heeft geen geschikte startopdracht.');
      next.betaScenario.stops[stop.id] = defaultPlan(next, stop, challenge.id);
    }
  });
  return createBetaSnapshot(next);
};

export const editBetaChallenge = (scenario, stopId, challengeId) => {
  const next = createBetaSnapshot(scenario);
  const stop = next.routeStops.find((item) => item.id === stopId);
  if (!next.betaScenario.stops[stopId]) throw new Error('Start en finish krijgen geen opdracht.');
  if (next.betaScenario.stops[stopId].challenge.id === challengeId) return next;
  next.betaScenario.stops[stopId] = defaultPlan(next, stop, challengeId);
  return createBetaSnapshot(next);
};

export const editBetaTeamContent = (scenario, stopId, teamId, contentId) => {
  const next = createBetaSnapshot(scenario);
  const plan = next.betaScenario.stops[stopId];
  if (!plan || !BETA_TEAM_IDS.includes(teamId)) throw new Error('Onbekend land of team.');
  if (getBetaContentId(plan.contentByTeam[teamId]) === contentId) return next;
  const stop = next.routeStops.find((item) => item.id === stopId);
  const option = getBetaContentOptions(stop, plan.challenge.id).find((item) => item.id === contentId);
  if (!option) throw new Error('Kies geldige inhoud voor dit team.');
  plan.contentByTeam[teamId] = option.fixedContent;
  return createBetaSnapshot(next);
};

// Keep the selected plan and its country catalogue entry together in the snapshot.
export const editBetaChallengeDrinks = (scenario, stopId, penaltySips) => {
  if (!Number.isInteger(penaltySips) || penaltySips < 0 || penaltySips > 9) {
    throw new Error('Kies 0 tot 9 drankjes.');
  }
  const next = createBetaSnapshot(scenario);
  const plan = next.betaScenario.stops[stopId];
  if (!plan) throw new Error('Start en finish krijgen geen opdracht.');
  plan.challenge.penaltySips = penaltySips;
  const stop = next.routeStops.find((item) => item.id === stopId);
  stop.challenges = stop.challenges.map((item) => item.id === plan.challenge.id ? { ...plan.challenge } : item);
  return createBetaSnapshot(next);
};

export const saveBetaTextChallenge = (scenario, stopId, { id, title, prompt, penaltySips = 1 }) => {
  if (!title.trim() || !prompt.trim()) throw new Error('Vul een titel en opdrachttekst in.');
  const next = createBetaSnapshot(scenario);
  const stop = next.routeStops.find((item) => item.id === stopId);
  if (!next.betaScenario.stops[stopId]) throw new Error('Start en finish krijgen geen opdracht.');
  const existing = id && stop.challenges.find((item) => item.id === id);
  if (id && (!existing || (existing.type && existing.type !== 'ordinary'))) {
    throw new Error('Alleen gewone tekstopdrachten kunnen hier worden bewerkt.');
  }
  const challenge = existing ? { ...existing, title: title.trim(), prompt: prompt.trim() } : {
    id: `beta-text-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    title: title.trim(), prompt: prompt.trim(),
    penalty: 'If the team cannot do it, apply the sip penalty or choose water.',
    penaltySips: 1, minPlayers: 1, durationSeconds: 30, expectedDurationSeconds: 30,
    drinkRules: { success: 'none', failure: 'wholeTeam' },
  };
  stop.challenges = existing
    ? stop.challenges.map((item) => item.id === id ? challenge : item)
    : [...stop.challenges, challenge];
  const mustPlay = existing && next.betaScenario.stops[stopId].challenge.id === existing.id
    && next.betaScenario.stops[stopId].mustPlay === true;
  next.betaScenario.stops[stopId] = createBetaStopPlan({ stop, challengeId: challenge.id });
  if (mustPlay) next.betaScenario.stops[stopId].mustPlay = true;
  return editBetaChallengeDrinks(next, stopId, penaltySips);
};

export const editBetaMustPlay = (scenario, stopId, mustPlay) => {
  if (typeof mustPlay !== 'boolean') throw new Error('Kies aan of uit.');
  const next = createBetaSnapshot(scenario);
  const plan = next.betaScenario.stops[stopId];
  if (!plan) throw new Error('Start en finish krijgen geen opdracht.');
  plan.mustPlay = mustPlay;
  return createBetaSnapshot(next);
};
