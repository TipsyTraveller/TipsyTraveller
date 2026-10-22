import { get, onValue, ref, runTransaction, set } from 'firebase/database';
import { db } from '../../../firebaseConfig';
import {
  applyCurrentDefaultPositions,
  DEFAULT_COUNTRY_STOPS,
  getStopsForDuration,
  isLegacyCountryCatalogue,
  normalizeCountryStops,
} from '../constants/countryStops';

const CONTENT_PATH = 'gameContent/countryStops';
const resolveAuthoredStops = (value) => (
  isLegacyCountryCatalogue(value)
    ? normalizeCountryStops(DEFAULT_COUNTRY_STOPS)
    : applyCurrentDefaultPositions(value)
);
const serializeStops = (stops) => Object.fromEntries(
  normalizeCountryStops(stops).map((stop) => [stop.id, stop])
);

export const getCountryStops = async () => {
  try {
    const snapshot = await get(ref(db, CONTENT_PATH));
    return snapshot.exists() ? resolveAuthoredStops(snapshot.val()) : normalizeCountryStops(DEFAULT_COUNTRY_STOPS);
  } catch (error) {
    console.warn('Unable to load authored country stops; using bundled defaults.', error);
    return normalizeCountryStops(DEFAULT_COUNTRY_STOPS);
  }
};

export const subscribeCountryStops = (callback, onError) => onValue(
  ref(db, CONTENT_PATH),
  (snapshot) => callback(snapshot.exists() ? resolveAuthoredStops(snapshot.val()) : normalizeCountryStops(DEFAULT_COUNTRY_STOPS)),
  onError
);

export const saveCountryStops = async (stops) => {
  const normalized = normalizeCountryStops(stops);
  if (normalized.length < 2) throw new Error('A route needs at least two stops.');
  await set(ref(db, CONTENT_PATH), serializeStops(normalized));
  return normalized;
};

export const addCountryStop = async ({ accent, challenges, name, position }) => {
  const id = `stop-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const nextStop = { id, name, accent, challenges, position };
  await runTransaction(ref(db, CONTENT_PATH), (current) => {
    const stops = resolveAuthoredStops(current);
    return serializeStops([...stops, { ...nextStop, order: stops.length }]);
  });
  return nextStop;
};

export const updateCountryStop = async (stopId, changes) => {
  await runTransaction(ref(db, CONTENT_PATH), (current) => {
    const stops = resolveAuthoredStops(current);
    return serializeStops(stops.map((stop) => stop.id === stopId ? { ...stop, ...changes, id: stop.id } : stop));
  });
};

export const removeCountryStop = async (stopId) => {
  await runTransaction(ref(db, CONTENT_PATH), (current) => {
    const stops = resolveAuthoredStops(current);
    if (stops.length <= 2) return undefined;
    return serializeStops(stops.filter((stop) => stop.id !== stopId));
  });
};

export const reorderCountryStop = async (stopId, direction) => {
  await runTransaction(ref(db, CONTENT_PATH), (current) => {
    const stops = resolveAuthoredStops(current);
    const fromIndex = stops.findIndex((stop) => stop.id === stopId);
    const toIndex = fromIndex + direction;
    if (fromIndex < 0 || toIndex < 0 || toIndex >= stops.length) return undefined;
    const next = [...stops];
    [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
    return serializeStops(next.map((stop, index) => ({ ...stop, order: index })));
  });
};

export const getRouteSnapshotForDuration = async (duration) => getStopsForDuration(await getCountryStops(), duration);
