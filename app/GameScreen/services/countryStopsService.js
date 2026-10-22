import { get, onValue, ref, runTransaction, set } from 'firebase/database';
import { db } from '../../../firebaseConfig';
import {
  applyCurrentDefaultPositions,
  COUNTRY_POSITION_VERSION,
  DEFAULT_COUNTRY_STOPS,
  getStopsForDuration,
  isLegacyCountryCatalogue,
  normalizeCountryStops,
} from '../constants/countryStops';

const CONTENT_PATH = 'gameContent/countryStops';
const LOCAL_STORAGE_KEY = 'tipsy_authored_country_stops_v2';

const stripUndefined = (value) => {
  if (Array.isArray(value)) {
    return value.map(stripUndefined);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, stripUndefined(entryValue)])
    );
  }
  return value;
};

const readLocalCache = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length < 2 || isLegacyCountryCatalogue(parsed)) {
      return null;
    }
    return applyCurrentDefaultPositions(parsed);
  } catch {
    return null;
  }
};

const writeLocalCache = (stops) => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stops));
  } catch {
    // Ignore storage quota or private-mode errors
  }
};

let cachedStops = readLocalCache();
const subscribers = new Set();

const getCatalogueTimestamp = (stops) => (
  Math.max(0, ...normalizeCountryStops(stops).map((stop) => Number(stop.updatedAt) || 0))
);

const updateCachedStops = (stops, touchTimestamp = null) => {
  const normalized = normalizeCountryStops(stops).map((stop) => ({
    ...stop,
    positionVersion: stop.positionVersion ?? COUNTRY_POSITION_VERSION,
    ...(touchTimestamp ? { updatedAt: touchTimestamp } : {}),
  }));
  cachedStops = normalized;
  writeLocalCache(normalized);
  subscribers.forEach((callback) => {
    try {
      callback(normalized);
    } catch (err) {
      console.warn('Error in countryStops subscriber:', err);
    }
  });
  return normalized;
};

const resolveAuthoredStops = (value) => {
  if (!value || isLegacyCountryCatalogue(value)) {
    return cachedStops || normalizeCountryStops(DEFAULT_COUNTRY_STOPS);
  }
  const remoteStops = applyCurrentDefaultPositions(value);
  if (cachedStops && getCatalogueTimestamp(cachedStops) > getCatalogueTimestamp(remoteStops)) {
    return cachedStops;
  }
  return remoteStops;
};

const serializeStops = (stops, touchTimestamp = null) => Object.fromEntries(
  normalizeCountryStops(stops).map((stop) => [
    stop.id,
    stripUndefined({
      ...stop,
      positionVersion: stop.positionVersion ?? COUNTRY_POSITION_VERSION,
      ...(touchTimestamp ? { updatedAt: touchTimestamp } : {}),
    }),
  ])
);

export const getCountryStops = async () => {
  try {
    const snapshot = await get(ref(db, CONTENT_PATH));
    const resolved = snapshot.exists()
      ? resolveAuthoredStops(snapshot.val())
      : (cachedStops || normalizeCountryStops(DEFAULT_COUNTRY_STOPS));
    return updateCachedStops(resolved);
  } catch (error) {
    console.warn('Unable to load authored country stops; using cached or bundled defaults.', error);
    return cachedStops || normalizeCountryStops(DEFAULT_COUNTRY_STOPS);
  }
};

export const subscribeCountryStops = (callback, onError) => {
  subscribers.add(callback);
  if (cachedStops) {
    callback(cachedStops);
  }

  const unsubscribeFirebase = onValue(
    ref(db, CONTENT_PATH),
    (snapshot) => {
      const resolved = snapshot.exists()
        ? resolveAuthoredStops(snapshot.val())
        : (cachedStops || normalizeCountryStops(DEFAULT_COUNTRY_STOPS));
      updateCachedStops(resolved);
    },
    (error) => {
      if (cachedStops) {
        callback(cachedStops);
      }
      onError?.(error);
    }
  );

  return () => {
    subscribers.delete(callback);
    unsubscribeFirebase();
  };
};

export const saveCountryStops = async (stops) => {
  const normalized = normalizeCountryStops(stops);
  if (normalized.length < 2) throw new Error('A route needs at least two stops.');
  const updatedAt = Date.now();
  const updated = updateCachedStops(normalized, updatedAt);
  await set(ref(db, CONTENT_PATH), serializeStops(updated, updatedAt));
  return updated;
};

export const addCountryStop = async ({ accent, challenges, name, position }) => {
  const id = `stop-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const updatedAt = Date.now();
  const nextStop = {
    id,
    name,
    accent,
    challenges,
    position,
    positionVersion: COUNTRY_POSITION_VERSION,
    updatedAt,
  };
  const baseStops = cachedStops || normalizeCountryStops(DEFAULT_COUNTRY_STOPS);
  updateCachedStops([...baseStops, { ...nextStop, order: baseStops.length }], updatedAt);

  await runTransaction(ref(db, CONTENT_PATH), (current) => {
    const stops = resolveAuthoredStops(current);
    const withoutDuplicate = stops.filter((stop) => stop.id !== id);
    return serializeStops([...withoutDuplicate, { ...nextStop, order: withoutDuplicate.length }], updatedAt);
  });
  return nextStop;
};

export const updateCountryStop = async (stopId, changes) => {
  const updatedAt = Date.now();
  const baseStops = cachedStops || normalizeCountryStops(DEFAULT_COUNTRY_STOPS);
  const optimistic = baseStops.map((stop) => (
    stop.id === stopId
      ? { ...stop, ...changes, id: stop.id, positionVersion: COUNTRY_POSITION_VERSION, updatedAt }
      : stop
  ));
  updateCachedStops(optimistic, updatedAt);

  await runTransaction(ref(db, CONTENT_PATH), (current) => {
    const stops = resolveAuthoredStops(current);
    return serializeStops(
      stops.map((stop) => (
        stop.id === stopId
          ? { ...stop, ...changes, id: stop.id, positionVersion: COUNTRY_POSITION_VERSION, updatedAt }
          : stop
      )),
      updatedAt
    );
  });
};

export const removeCountryStop = async (stopId) => {
  const updatedAt = Date.now();
  const baseStops = cachedStops || normalizeCountryStops(DEFAULT_COUNTRY_STOPS);
  if (baseStops.length > 2) {
    updateCachedStops(baseStops.filter((stop) => stop.id !== stopId), updatedAt);
  }

  await runTransaction(ref(db, CONTENT_PATH), (current) => {
    const stops = resolveAuthoredStops(current);
    if (stops.length <= 2) return undefined;
    return serializeStops(stops.filter((stop) => stop.id !== stopId), updatedAt);
  });
};

export const reorderCountryStop = async (stopId, direction) => {
  const updatedAt = Date.now();
  const baseStops = cachedStops || normalizeCountryStops(DEFAULT_COUNTRY_STOPS);
  const baseFromIndex = baseStops.findIndex((stop) => stop.id === stopId);
  const baseToIndex = baseFromIndex + direction;
  if (baseFromIndex >= 0 && baseToIndex >= 0 && baseToIndex < baseStops.length) {
    const optimistic = [...baseStops];
    [optimistic[baseFromIndex], optimistic[baseToIndex]] = [optimistic[baseToIndex], optimistic[baseFromIndex]];
    updateCachedStops(optimistic.map((stop, index) => ({ ...stop, order: index })), updatedAt);
  }

  await runTransaction(ref(db, CONTENT_PATH), (current) => {
    const stops = resolveAuthoredStops(current);
    const fromIndex = stops.findIndex((stop) => stop.id === stopId);
    const toIndex = fromIndex + direction;
    if (fromIndex < 0 || toIndex < 0 || toIndex >= stops.length) return undefined;
    const next = [...stops];
    [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
    return serializeStops(next.map((stop, index) => ({ ...stop, order: index })), updatedAt);
  });
};

export const getRouteSnapshotForDuration = async (duration) => getStopsForDuration(await getCountryStops(), duration);
