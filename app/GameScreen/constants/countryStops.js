import { svgPoint } from './mapCoordinates';

export const DURATION_STOP_COUNTS = { short: 4, medium: 6, long: Infinity };

const position = (x, y) => {
  const point = svgPoint(x, y);
  return { x: point.x, y: point.y };
};

export const DEFAULT_COUNTRY_STOPS = [
  { id: 'belgium-start', name: 'Belgium', order: 0, position: position(529, 301), accent: '#1ba39c', challenges: [] },
  { id: 'france', name: 'France', order: 1, position: position(523, 317), accent: '#d71920', challenges: [{ id: 'cafe-charades', title: 'Cafe Charades', prompt: 'Act out ordering the fanciest drink in Paris without using words.', penalty: 'If your team cannot guess it in 20 seconds, take 1 sip.' }] },
  { id: 'spain-north', name: 'Spain', order: 2, position: position(511, 331), accent: '#f2c94c', challenges: [{ id: 'tapas-tempo', title: 'Tapas Tempo', prompt: 'Name three tapas dishes before the other team counts down from five.', penalty: 'Miss one? Tell a travel story or take 1 sip.' }] },
  { id: 'portugal', name: 'Portugal', order: 3, position: position(493, 342), accent: '#27ae60', challenges: [{ id: 'fado-face-off', title: 'Fado Face-Off', prompt: 'Give your most dramatic 5-second performance about missing the last train.', penalty: 'No drama, no glory: take 1 sip.' }] },
  { id: 'spain-south', name: 'Spain', order: 4, position: position(520, 341), accent: '#eb5757', challenges: [{ id: 'flamenco-freeze', title: 'Flamenco Freeze', prompt: 'Strike a flamenco pose. Your team must copy it perfectly.', penalty: 'Worst pose takes 1 sip.' }] },
  { id: 'italy', name: 'Italy', order: 5, position: position(551, 333), accent: '#2f80ed', challenges: [{ id: 'pasta-pitch', title: 'Pasta Pitch', prompt: 'Invent a pasta dish and sell it like a luxury commercial.', penalty: 'If nobody would order it, take 1 sip.' }] },
  { id: 'germany', name: 'Germany', order: 6, position: position(546, 298), accent: '#f2994a', challenges: [{ id: 'autobahn-answers', title: 'Autobahn Answers', prompt: 'Name two German cities and one German food before time runs out.', penalty: 'If you stall, take 1 sip.' }] },
  { id: 'belgium-finish', name: 'Belgium', order: 7, position: position(529, 301), accent: '#1ba39c', challenges: [{ id: 'trappist-toast', title: 'Trappist Toast', prompt: 'Make a grand toast to the whole table in your best royal voice.', penalty: 'If the toast gets no applause, take 1 sip.' }] },
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

