import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { get, ref, runTransaction, set } from 'firebase/database';
import { db, firestore } from '../../../firebaseConfig';
import {
  applyCurrentDefaultPositions,
  COUNTRY_POSITION_VERSION,
  DEFAULT_COUNTRY_STOPS,
  getStopsForDuration,
  isLegacyCountryCatalogue,
  normalizeCountryStops,
} from '../constants/countryStops';

const COUNTRIES_COLLECTION = 'countries';
const CHALLENGES_COLLECTION = 'challenges';
const LEGACY_RTDB_CONTENT_PATH = 'gameContent/countryStops';
const LOCAL_STORAGE_KEY = 'tipsy_authored_country_stops_v2';
const REMOVED_IDS_STORAGE_KEY = 'tipsy_removed_country_stop_ids_v1';

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

const readRemovedStopIds = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return new Set();
    const raw = window.localStorage.getItem(REMOVED_IDS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
};

const writeRemovedStopIds = (idSet) => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(REMOVED_IDS_STORAGE_KEY, JSON.stringify([...idSet]));
  } catch {
    // Ignore storage quota or private-mode errors
  }
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
    const removed = readRemovedStopIds();
    const filtered = parsed.filter((stop) => !removed.has(stop?.id));
    return filtered.length >= 2 ? applyCurrentDefaultPositions(filtered) : null;
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

let removedStopIds = readRemovedStopIds();
let cachedStops = readLocalCache();
let seedingPromise = null;
const subscribers = new Set();

const serializeStopDoc = (stop, touchTimestamp = null) => stripUndefined({
  ...stop,
  positionVersion: stop.positionVersion ?? COUNTRY_POSITION_VERSION,
  updatedAt: touchTimestamp ?? stop.updatedAt ?? Date.now(),
});

const serializeRtdbStops = (stops, touchTimestamp = null) => Object.fromEntries(
  normalizeCountryStops(stops).map((stop) => [
    stop.id,
    serializeStopDoc(stop, touchTimestamp),
  ])
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

/**
 * Merges remote Firestore stops with any newer local per-stop edits in `cachedStops`
 * so an in-flight single-document update is never reverted by an earlier snapshot.
 */
const mergeRemoteStopsWithCache = (remoteValue) => {
  if (!remoteValue || isLegacyCountryCatalogue(remoteValue)) {
    return cachedStops || normalizeCountryStops(DEFAULT_COUNTRY_STOPS);
  }
  const remoteStops = applyCurrentDefaultPositions(remoteValue).filter(
    (stop) => !removedStopIds.has(stop.id)
  );
  if (!cachedStops || cachedStops.length < 2) {
    return remoteStops;
  }

  const cachedById = new Map(cachedStops.map((stop) => [stop.id, stop]));
  const remoteIds = new Set(remoteStops.map((stop) => stop.id));

  const merged = remoteStops.map((remoteStop) => {
    const localStop = cachedById.get(remoteStop.id);
    if (!localStop) return remoteStop;
    const localTime = Number(localStop.updatedAt) || 0;
    const remoteTime = Number(remoteStop.updatedAt) || 0;
    return localTime > remoteTime ? localStop : remoteStop;
  });

  // Preserve newly created local stops whose Firestore write is still in flight
  cachedStops.forEach((localStop) => {
    if (!remoteIds.has(localStop.id) && !removedStopIds.has(localStop.id) && (Number(localStop.updatedAt) || 0) > 0) {
      merged.push(localStop);
    }
  });

  return normalizeCountryStops(merged);
};

const syncChallengesForStopInBatch = (batch, stop, updatedAt) => {
  const challenges = Array.isArray(stop.challenges) ? stop.challenges : [];
  challenges.forEach((challenge, index) => {
    const challengeDocId = `${stop.id}__${challenge.id || `challenge-${index}`}`;
    const challengeRef = doc(firestore, CHALLENGES_COLLECTION, challengeDocId);
    batch.set(
      challengeRef,
      stripUndefined({
        id: challenge.id || `challenge-${index}`,
        countryId: stop.id,
        countryName: stop.name,
        title: challenge.title,
        prompt: challenge.prompt,
        penalty: challenge.penalty,
        type: challenge.type,
        penaltyTag: challenge.penaltyTag,
        durationSeconds: challenge.durationSeconds,
        successPoints: challenge.successPoints,
        words: challenge.words,
        order: index,
        updatedAt,
      }),
      { merge: true }
    );
  });
};

const seedFirestoreCatalogueIfNeeded = async () => {
  if (seedingPromise) return seedingPromise;
  seedingPromise = (async () => {
    try {
      let initialStops = cachedStops;
      if (!initialStops || initialStops.length < 2) {
        try {
          const rtdbSnapshot = await get(ref(db, LEGACY_RTDB_CONTENT_PATH));
          if (rtdbSnapshot.exists() && !isLegacyCountryCatalogue(rtdbSnapshot.val())) {
            initialStops = applyCurrentDefaultPositions(rtdbSnapshot.val());
          }
        } catch {
          // Ignore legacy RTDB read failure during seed
        }
      }
      const rawSeedSource = (initialStops || DEFAULT_COUNTRY_STOPS).filter(
        (stop) => !removedStopIds.has(stop?.id)
      );
      const stopsToSeed = normalizeCountryStops(
        rawSeedSource.length >= 2 ? rawSeedSource : DEFAULT_COUNTRY_STOPS
      );
      const updatedAt = Date.now();
      const batch = writeBatch(firestore);

      stopsToSeed.forEach((stop) => {
        const countryRef = doc(firestore, COUNTRIES_COLLECTION, stop.id);
        batch.set(countryRef, serializeStopDoc(stop, stop.updatedAt || updatedAt));
        syncChallengesForStopInBatch(batch, stop, stop.updatedAt || updatedAt);
      });

      await batch.commit();
      return updateCachedStops(stopsToSeed);
    } catch (seedError) {
      console.warn('Unable to seed Firestore countries catalogue:', seedError);
      return cachedStops || normalizeCountryStops(DEFAULT_COUNTRY_STOPS);
    } finally {
      seedingPromise = null;
    }
  })();
  return seedingPromise;
};

const loadLegacyRtdbStops = async () => {
  try {
    const rtdbSnapshot = await get(ref(db, LEGACY_RTDB_CONTENT_PATH));
    if (rtdbSnapshot.exists() && !isLegacyCountryCatalogue(rtdbSnapshot.val())) {
      return mergeRemoteStopsWithCache(rtdbSnapshot.val());
    }
  } catch {
    // Ignore legacy RTDB read failure
  }
  return null;
};

export const getCountryStops = async () => {
  try {
    const countriesQuery = query(collection(firestore, COUNTRIES_COLLECTION), orderBy('order', 'asc'));
    const snapshot = await getDocs(countriesQuery);
    const docs = snapshot.docs.map((docSnap) => ({ ...docSnap.data(), id: docSnap.id }));

    if (docs.length >= 2 && !isLegacyCountryCatalogue(docs)) {
      return updateCachedStops(mergeRemoteStopsWithCache(docs));
    }

    return await seedFirestoreCatalogueIfNeeded();
  } catch (error) {
    console.warn('Unable to load Firestore country stops; falling back to RTDB/cache.', error);
    const rtdbStops = await loadLegacyRtdbStops();
    if (rtdbStops) {
      return updateCachedStops(rtdbStops);
    }
    return cachedStops || normalizeCountryStops(DEFAULT_COUNTRY_STOPS);
  }
};

export const subscribeCountryStops = (callback, onError) => {
  subscribers.add(callback);
  if (cachedStops) {
    callback(cachedStops);
  }

  const countriesQuery = query(collection(firestore, COUNTRIES_COLLECTION), orderBy('order', 'asc'));
  const unsubscribeFirestore = onSnapshot(
    countriesQuery,
    async (snapshot) => {
      const docs = snapshot.docs.map((docSnap) => ({ ...docSnap.data(), id: docSnap.id }));
      if (docs.length >= 2 && !isLegacyCountryCatalogue(docs)) {
        updateCachedStops(mergeRemoteStopsWithCache(docs));
        return;
      }
      const seeded = await seedFirestoreCatalogueIfNeeded();
      updateCachedStops(seeded);
    },
    async (error) => {
      const rtdbStops = await loadLegacyRtdbStops();
      if (rtdbStops) {
        updateCachedStops(rtdbStops);
      } else if (cachedStops) {
        callback(cachedStops);
      } else {
        callback(normalizeCountryStops(DEFAULT_COUNTRY_STOPS));
      }
      onError?.(error);
    }
  );

  return () => {
    subscribers.delete(callback);
    unsubscribeFirestore();
  };
};

export const getChallengesForCountry = async (countryId) => {
  try {
    const challengesQuery = query(
      collection(firestore, CHALLENGES_COLLECTION),
      where('countryId', '==', countryId)
    );
    const snapshot = await getDocs(challengesQuery);
    if (!snapshot.empty) {
      return snapshot.docs
        .map((docSnap) => docSnap.data())
        .sort((left, right) => (Number(left.order) || 0) - (Number(right.order) || 0));
    }
  } catch (error) {
    console.warn(`Unable to query Firestore challenges for ${countryId}:`, error);
  }
  const stop = (cachedStops || DEFAULT_COUNTRY_STOPS).find((item) => item.id === countryId);
  return stop?.challenges || [];
};

export const saveCountryStops = async (stops) => {
  const normalized = normalizeCountryStops(stops);
  if (normalized.length < 2) throw new Error('A route needs at least two stops.');
  const updatedAt = Date.now();
  const updated = updateCachedStops(normalized, updatedAt);

  try {
    const batch = writeBatch(firestore);
    updated.forEach((stop) => {
      const countryRef = doc(firestore, COUNTRIES_COLLECTION, stop.id);
      batch.set(countryRef, serializeStopDoc(stop, updatedAt));
      syncChallengesForStopInBatch(batch, stop, updatedAt);
    });
    await batch.commit();
  } catch (firestoreError) {
    console.warn('Firestore saveCountryStops failed; persisting to RTDB fallback:', firestoreError);
  }

  await set(ref(db, LEGACY_RTDB_CONTENT_PATH), serializeRtdbStops(updated, updatedAt)).catch(() => {});
  return updated;
};

export const addCountryStop = async ({ accent, challenges, name, position }) => {
  const id = `stop-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const updatedAt = Date.now();
  removedStopIds.delete(id);
  writeRemovedStopIds(removedStopIds);

  const baseStops = cachedStops || normalizeCountryStops(DEFAULT_COUNTRY_STOPS);
  const nextStop = {
    id,
    name,
    accent,
    challenges,
    position,
    order: baseStops.length,
    positionVersion: COUNTRY_POSITION_VERSION,
    updatedAt,
  };
  const nextCatalogue = updateCachedStops([...baseStops, nextStop]);
  const savedStop = nextCatalogue.find((stop) => stop.id === id) || nextStop;

  try {
    const batch = writeBatch(firestore);
    const countryRef = doc(firestore, COUNTRIES_COLLECTION, id);
    batch.set(countryRef, serializeStopDoc(savedStop, updatedAt));
    syncChallengesForStopInBatch(batch, savedStop, updatedAt);
    await batch.commit();
  } catch (firestoreError) {
    console.warn('Firestore addCountryStop failed; persisting to RTDB fallback:', firestoreError);
  }

  await runTransaction(ref(db, LEGACY_RTDB_CONTENT_PATH), () => serializeRtdbStops(nextCatalogue, updatedAt)).catch(() => {});
  return savedStop;
};

export const updateCountryStop = async (stopId, changes) => {
  const updatedAt = Date.now();
  const baseStops = cachedStops || normalizeCountryStops(DEFAULT_COUNTRY_STOPS);
  const optimistic = baseStops.map((stop) => (
    stop.id === stopId
      ? { ...stop, ...changes, id: stop.id, positionVersion: COUNTRY_POSITION_VERSION, updatedAt }
      : stop
  ));
  const updatedCatalogue = updateCachedStops(optimistic);
  const targetStop = updatedCatalogue.find((stop) => stop.id === stopId);

  if (targetStop) {
    try {
      const batch = writeBatch(firestore);
      const countryRef = doc(firestore, COUNTRIES_COLLECTION, stopId);
      batch.set(countryRef, serializeStopDoc(targetStop, updatedAt), { merge: true });
      if (changes.challenges) {
        syncChallengesForStopInBatch(batch, targetStop, updatedAt);
      }
      await batch.commit();
    } catch (firestoreError) {
      console.warn('Firestore updateCountryStop failed; persisting to RTDB fallback:', firestoreError);
    }
  }

  await runTransaction(ref(db, LEGACY_RTDB_CONTENT_PATH), () => serializeRtdbStops(updatedCatalogue, updatedAt)).catch(() => {});
};

export const removeCountryStop = async (stopId) => {
  const updatedAt = Date.now();
  const baseStops = cachedStops || normalizeCountryStops(DEFAULT_COUNTRY_STOPS);
  if (baseStops.length <= 2) return;

  removedStopIds.add(stopId);
  writeRemovedStopIds(removedStopIds);
  const removedStop = baseStops.find((stop) => stop.id === stopId);
  const remaining = baseStops
    .filter((stop) => stop.id !== stopId)
    .map((stop, index) => ({ ...stop, order: index, updatedAt }));
  const updatedCatalogue = updateCachedStops(remaining);

  try {
    const batch = writeBatch(firestore);
    batch.delete(doc(firestore, COUNTRIES_COLLECTION, stopId));
    (removedStop?.challenges || []).forEach((challenge, index) => {
      const challengeDocId = `${stopId}__${challenge.id || `challenge-${index}`}`;
      batch.delete(doc(firestore, CHALLENGES_COLLECTION, challengeDocId));
    });
    updatedCatalogue.forEach((stop) => {
      batch.set(doc(firestore, COUNTRIES_COLLECTION, stop.id), serializeStopDoc(stop, updatedAt), { merge: true });
    });
    await batch.commit();
  } catch (firestoreError) {
    console.warn('Firestore removeCountryStop failed; persisting to RTDB fallback:', firestoreError);
  }

  await runTransaction(ref(db, LEGACY_RTDB_CONTENT_PATH), () => serializeRtdbStops(updatedCatalogue, updatedAt)).catch(() => {});
};

export const reorderCountryStop = async (stopId, direction) => {
  const updatedAt = Date.now();
  const baseStops = cachedStops || normalizeCountryStops(DEFAULT_COUNTRY_STOPS);
  const fromIndex = baseStops.findIndex((stop) => stop.id === stopId);
  const toIndex = fromIndex + direction;
  if (fromIndex < 0 || toIndex < 0 || toIndex >= baseStops.length) return;

  const next = [...baseStops];
  [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
  const reordered = next.map((stop, index) => (
    index === fromIndex || index === toIndex
      ? { ...stop, order: index, updatedAt }
      : { ...stop, order: index }
  ));
  const updatedCatalogue = updateCachedStops(reordered);

  try {
    const movedA = updatedCatalogue[fromIndex];
    const movedB = updatedCatalogue[toIndex];
    const batch = writeBatch(firestore);
    if (movedA) {
      batch.set(doc(firestore, COUNTRIES_COLLECTION, movedA.id), serializeStopDoc(movedA, updatedAt), { merge: true });
    }
    if (movedB) {
      batch.set(doc(firestore, COUNTRIES_COLLECTION, movedB.id), serializeStopDoc(movedB, updatedAt), { merge: true });
    }
    await batch.commit();
  } catch (firestoreError) {
    console.warn('Firestore reorderCountryStop failed; persisting to RTDB fallback:', firestoreError);
  }

  await runTransaction(ref(db, LEGACY_RTDB_CONTENT_PATH), () => serializeRtdbStops(updatedCatalogue, updatedAt)).catch(() => {});
};

export const getRouteSnapshotForDuration = async (duration) => getStopsForDuration(await getCountryStops(), duration);
