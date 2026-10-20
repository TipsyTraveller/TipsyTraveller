import { svgPoint } from './mapCoordinates';

export const DURATION_STOP_COUNTS = { short: 4, medium: 6, long: Infinity };

const position = (x, y) => {
  const point = svgPoint(x, y);
  return { x: point.x, y: point.y };
};

export const DEFAULT_COUNTRY_STOPS = [
  { id: 'belgium-start', name: 'Belgium', order: 0, position: position(529, 301), accent: '#1ba39c', challenges: [] },
  { id: 'france', name: 'France', order: 1, position: position(523, 317), accent: '#d71920', challenges: [
      { id: "cafe-charades", title: "Cafe Charades", prompt: "Act out ordering the fanciest drink in Paris without using words.", penalty: "If your team cannot guess it in 20 seconds, take 1 at of bier." },
      { id: "build-the-eiffel-tower", title: "Build the Eiffel Tower", prompt: "Build an Eiffel Tower with your whole team using only your bodies. The player at the top must down their glass of bier in one go.", penalty: "Tower falls before the top player is done? Everybody takes 2 sips of bier." },
      { id: "moulin-rouge-cancan", title: "Moulin Rouge Cancan", prompt: "Form a cancan line, arms around each other, and kick for 10 seconds. The other team picks the worst kicker.", penalty: "Worst kicker downs their glass of bier in one go." },
      { id: "arc-de-triomphe", title: "Arc de Triomphe", prompt: "Two players make an arch with their arms. The rest crawl or walk through while the arch players chant. Whoever gets touched by the arch is caught.", penalty: "Caught players down their glass of bier in one go." },
      { id: "mona-lisa-stare-off", title: "Mona Lisa Stare-Off", prompt: "Everyone strikes the Mona Lisa pose with a mysterious smile. First to laugh or show teeth loses.", penalty: "Loser downs their glass of bier in one go." },
    ] },
  { id: 'spain-north', name: 'Spain', order: 2, position: position(511, 331), accent: '#f2c94c', challenges: [
      { id: "tapas-tempo", title: "Tapas Tempo", prompt: "Name three tapas dishes before the other team counts down from five.", penalty: "Miss one? Tell a travel story or take 1 sip of bier." },
      { id: "human-castell", title: "Human Castell", prompt: "Build a Catalan human tower. The smallest player climbs to the top and downs their glass of bier in one go.", penalty: "Tower falls first? Whole team takes 2 sips of bier." },
      { id: "running-of-the-bulls", title: "Running of the Bulls", prompt: "One player runs the length of the table while two bulls chase them with finger horns. Touched before the finish line means caught.", penalty: "Caught runner downs their glass of bier in one go." },
      { id: "sangria-pitcher-relay", title: "Sangria Pitcher Relay", prompt: "Pass a full cup along the team, each player spinning once before passing. Spilling is not allowed.", penalty: "Whoever spills downs the rest of their glass of bier." },
      { id: "la-tomatina-toss", title: "La Tomatina Toss", prompt: "Throw a scrunched napkin into a teammate's cup from 1 metre. Every miss is a squashed tomato.", penalty: "Team misses 3 of 5? The thrower downs their glass of bier in one go." },
    ] },
  { id: 'portugal', name: 'Portugal', order: 3, position: position(493, 342), accent: '#27ae60', challenges: [
      { id: "fado-face-off", title: "Fado Face-Off", prompt: "Give your most dramatic 5-second performance about missing the last train.", penalty: "No drama, no glory: take 1 sip of bier." },
      { id: "tram-28-squeeze", title: "Tram 28 Squeeze", prompt: "Everyone stands on one foot and squeezes into the smallest space you can find. Hold for 15 seconds.", penalty: "First foot to touch the ground downs their glass of bier in one go." },
      { id: "christ-the-redeemer", title: "Christ the Redeemer", prompt: "Stand with arms wide like Cristo Rei and hold for 20 seconds while the other team tries to make you laugh.", penalty: "First arm to drop downs their glass of bier in one go." },
      { id: "sardine-tin", title: "Sardine Tin", prompt: "Lie side by side like sardines on the floor or across chairs. The player in the middle must drink their bier while lying down.", penalty: "Spill a drop and everybody takes 1 sip of bier." },
      { id: "nazare-big-wave", title: "Nazare Big Wave", prompt: "Team stands on one line and wobbles like a big wave. The surfer on top (a teammate's back or shoulders) drinks a sip while balancing.", penalty: "Fall off and the surfer downs their glass of bier in one go." },
    ] },
  { id: 'spain-south', name: 'Spain', order: 4, position: position(520, 341), accent: '#eb5757', challenges: [
      { id: "flamenco-freeze", title: "Flamenco Freeze", prompt: "Strike a flamenco pose. Your team must copy it perfectly.", penalty: "Worst pose takes 1 sip of bier." },
      { id: "flamenco-line", title: "Flamenco Line", prompt: "Do a synchronized flamenco line dance for 10 seconds with claps and stomps. The other team votes for the worst dancer.", penalty: "Worst dancer downs their glass of bier in one go." },
      { id: "matador-showdown", title: "Matador Showdown", prompt: "One player is the matador with a napkin cape, another is the bull. Dodge 3 charges without moving your feet.", penalty: "Feet move? Matador downs their glass of bier in one go." },
      { id: "paella-pan", title: "Paella Pan", prompt: "Everyone holds hands in a circle as the pan. One player stands in the middle as the rice and must reach the edge without breaking the circle.", penalty: "Circle breaks? Both players down their glass of bier in one go." },
      { id: "ole-wave", title: "Olé Wave", prompt: "Start a stadium wave with a loud 'Olé!'. The wave must go around the team twice without mistakes.", penalty: "Break the wave and you down your glass of bier in one go." },
    ] },
  { id: 'italy', name: 'Italy', order: 5, position: position(551, 333), accent: '#2f80ed', challenges: [
      { id: "pasta-pitch", title: "Pasta Pitch", prompt: "Invent a pasta dish and sell it like a luxury commercial.", penalty: "If nobody would order it, take 1 sip of bier." },
      { id: "leaning-tower-of-pisa", title: "Leaning Tower of Pisa", prompt: "Hold hands and lean together as one big tilted tower for 15 seconds.", penalty: "First to fall or let go downs their glass of bier in one go." },
      { id: "colosseum-duel", title: "Colosseum Duel", prompt: "Two players duel in a gladiator showdown of rock paper scissors, best of 3, with dramatic Roman voices.", penalty: "Loser downs their glass of bier in one go." },
      { id: "trevi-fountain-toss", title: "Trevi Fountain Toss", prompt: "Toss a coin or small object over your shoulder into a cup. Land it and you pick someone to drink.", penalty: "Miss and you down your glass of bier in one go." },
      { id: "gondola-row", title: "Gondola Row", prompt: "Sit in a row and 'paddle' in sync. The front player is the gondolier and sings an Italian-sounding song.", penalty: "Out of sync? The gondolier downs their glass of bier in one go." },
    ] },
  { id: 'germany', name: 'Germany', order: 6, position: position(546, 298), accent: '#f2994a', challenges: [
      { id: "autobahn-answers", title: "Autobahn Answers", prompt: "Name two German cities and one German food before time runs out.", penalty: "If you stall, take 1 sip of bier." },
      { id: "brandenburg-gate", title: "Brandenburg Gate", prompt: "Build a gate with two players holding arms high while the rest march through in step like a parade.", penalty: "Anyone who breaks the formation downs their glass of bier in one go." },
      { id: "berlin-wall-breakthrough", title: "Berlin Wall Breakthrough", prompt: "Half the team links arms as a wall. One player has 15 seconds to get through without pushing hard.", penalty: "Wall holds? The runner downs their glass of bier in one go." },
      { id: "oktoberfest-stein-hold", title: "Oktoberfest Stein Hold", prompt: "Everyone holds their full cup at arm's length for 20 seconds while the other team sings an oompah song.", penalty: "First cup to drop or spill downs their glass of bier in one go." },
      { id: "oompah-band", title: "Oompah Band", prompt: "Each player mimes an instrument and plays along to a beat. The other team picks the worst musician.", penalty: "Worst musician downs their glass of bier in one go." },
    ] },
  { id: 'belgium-finish', name: 'Belgium', order: 7, position: position(529, 301), accent: '#1ba39c', challenges: [
      { id: "trappist-toast", title: "Trappist Toast", prompt: "Make a grand toast to the whole table in your best royal voice.", penalty: "If the toast gets no applause, take 1 sip of bier." },
      { id: "build-the-atomium", title: "Build the Atomium", prompt: "Make the Atomium with your team: one player in the middle, the rest holding hands in a ring around them, arms stretched.", penalty: "Ring breaks and the middle player downs their glass of bier in one go." },
      { id: "manneken-pis", title: "Manneken Pis", prompt: "One player stands on a chair or tiptoes and pours bier from a small cup into another player's cup, held lower, without spilling.", penalty: "Spill and the pourer downs their glass of bier in one go." },
      { id: "bierfiets-pedal", title: "Bierfiets Pedal", prompt: "Sit in a row and pedal in sync with a loud 'Santé!' on every 4th pedal. Keep the rhythm for 15 seconds.", penalty: "Out of rhythm? The last player downs their glass of bier in one go." },
      { id: "fries-relay", title: "Fries Relay", prompt: "Pass a 'cone of fries' (a napkin) down the line without hands. The last player eats it and drinks bier.", penalty: "Dropped fries? The dropper downs their glass of bier in one go." },
    ] },
];

const toList = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value && typeof value === 'object') return Object.values(value).filter(Boolean);
  return [];
};

export const normalizeCountryStops = (value) => {
  const source = toList(value);
  const stops = source.length >= 2 ? source : DEFAULT_COUNTRY_STOPS;
  return stops.map((stop, index) => ({
    id: String(stop.id || `stop-${index}`),
    name: String(stop.name || `Stop ${index + 1}`),
    order: Number.isFinite(Number(stop.order)) ? Number(stop.order) : index,
    position: { x: Number(stop.position?.x) || 0, y: Number(stop.position?.y) || 0 },
    accent: stop.accent || '#1ba39c',
    challenges: toList(stop.challenges).map((challenge, challengeIndex) => ({
      id: String(challenge.id || `challenge-${challengeIndex}`),
      title: String(challenge.title || 'Border Check'),
      prompt: String(challenge.prompt || 'Tell the table why your team stopped here.'),
      penalty: String(challenge.penalty || 'Take 1 sip if the table is not convinced.'),
    })),
  })).sort((left, right) => left.order - right.order)
    .map((stop, index) => ({ ...stop, order: index }));
};

export const getStopsForDuration = (stops, duration = 'long') => {
  const normalized = normalizeCountryStops(stops);
  const requestedCount = DURATION_STOP_COUNTS[duration] ?? DURATION_STOP_COUNTS.long;
  const count = Math.max(2, Math.min(normalized.length, requestedCount));
  return normalized.slice(0, count).map((stop, index) => ({ ...stop, order: index }));
};

export const resolveGameRouteStops = (gameData = {}) => (
  gameData.routeStops
    ? normalizeCountryStops(gameData.routeStops)
    : normalizeCountryStops(DEFAULT_COUNTRY_STOPS)
);

