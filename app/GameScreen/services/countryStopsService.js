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
  getRouteCandidatesForDuration,
  getStopsForDuration,
  isLegacyCountryCatalogue,
  normalizeCountryStops,
} from '../constants/countryStops';
import {
  DEFAULT_MONUMENT_POOL,
  MONUMENT_POOL_DOC_ID,
  MONUMENT_POOL_VERSION,
  normalizeMonumentPool,
} from '../constants/monumentPool';

const COUNTRIES_COLLECTION = 'countries';
const CHALLENGES_COLLECTION = 'challenges';
const GEO_GUESSR_CHALLENGES_COLLECTION = 'geoGuessrChallenges';
const LEGACY_RTDB_CONTENT_PATH = 'gameContent/countryStops';
const LOCAL_STORAGE_KEY = 'tipsy_authored_country_stops_v2';
const MONUMENT_POOL_STORAGE_KEY = 'tipsy_monument_pool_v2';
const REMOVED_IDS_STORAGE_KEY = 'tipsy_removed_country_stop_ids_v1';
const COMMONS_PHOTO_SOURCE = 'wikimedia-commons-curated-v2';

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

const readLocalMonumentPool = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(MONUMENT_POOL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Number(parsed?.version) !== MONUMENT_POOL_VERSION) return null;
    return normalizeMonumentPool(parsed?.monuments);
  } catch {
    return null;
  }
};

const writeLocalMonumentPool = (monuments) => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(
      MONUMENT_POOL_STORAGE_KEY,
      JSON.stringify({
        id: MONUMENT_POOL_DOC_ID,
        version: MONUMENT_POOL_VERSION,
        monuments,
      })
    );
  } catch {
    // Ignore storage quota or private-mode errors
  }
};

let removedStopIds = readRemovedStopIds();
let cachedStops = readLocalCache();
let cachedMonumentPool = readLocalMonumentPool() || DEFAULT_MONUMENT_POOL;
let seedingPromise = null;
let countryWordMigrationPromise = null;
let countryWordMigrationVerified = false;
let monumentPoolSyncPromise = null;
let monumentPoolSyncVerified = false;
const subscribers = new Set();

export const getCachedMonumentPool = () => cachedMonumentPool || DEFAULT_MONUMENT_POOL;

const hasCurrentMonumentPhotos = (monuments) => {
  if (!Array.isArray(monuments)) return false;
  const monumentsById = new Map(monuments.map((monument) => [monument?.id, monument]));
  return DEFAULT_MONUMENT_POOL.every(({ id }) => {
    const monument = monumentsById.get(id);
    return Number(monument?.monumentPoolVersion) === MONUMENT_POOL_VERSION
      && monument?.photoSource === COMMONS_PHOTO_SOURCE
      && typeof monument?.imageUrl === 'string'
      && monument.imageUrl.startsWith('https://upload.wikimedia.org/');
  });
};

const readFirestoreMonumentPool = async () => {
  const snapshot = await getDocs(collection(firestore, GEO_GUESSR_CHALLENGES_COLLECTION));
  return snapshot.docs.map((docSnap) => ({ ...docSnap.data(), id: docSnap.id }));
};

export const ensureMonumentPoolSeeded = async () => {
  if (monumentPoolSyncVerified) return cachedMonumentPool;
  if (monumentPoolSyncPromise) return monumentPoolSyncPromise;

  monumentPoolSyncPromise = (async () => {
    try {
      const storedMonuments = await readFirestoreMonumentPool();
      if (hasCurrentMonumentPhotos(storedMonuments)) {
        cachedMonumentPool = normalizeMonumentPool(storedMonuments);
        writeLocalMonumentPool(cachedMonumentPool);
        monumentPoolSyncVerified = true;
        return cachedMonumentPool;
      }

      const normalizedPool = normalizeMonumentPool(DEFAULT_MONUMENT_POOL);
      console.warn('Firestore GeoGuessr challenges are incomplete; using the bundled read-only fallback.');
      cachedMonumentPool = normalizedPool;
      writeLocalMonumentPool(normalizedPool);
      monumentPoolSyncVerified = true;
      return cachedMonumentPool;
    } catch (error) {
      console.warn('Unable to sync Firestore GeoGuessr challenges; using bundled fallback:', error);
      return cachedMonumentPool || DEFAULT_MONUMENT_POOL;
    } finally {
      monumentPoolSyncPromise = null;
    }
  })();

  return monumentPoolSyncPromise;
};

export const getMonumentPool = async () => ensureMonumentPoolSeeded();

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
        instructions: challenge.instructions,
        penalty: challenge.penalty,
        penaltySips: challenge.penaltySips,
        minPlayers: challenge.minPlayers,
        expectedDurationSeconds: challenge.expectedDurationSeconds,
        category: challenge.category,
        targeting: challenge.targeting,
        drinkRules: challenge.drinkRules,
        type: challenge.type,
        penaltyTag: challenge.penaltyTag,
        durationSeconds: challenge.durationSeconds,
        pinDurationSeconds: challenge.pinDurationSeconds,
        successPoints: challenge.successPoints,
        wordListVersion: challenge.wordListVersion,
        words: challenge.words,
        monumentPoolId: challenge.monumentPoolId,
        monumentPoolVersion: challenge.monumentPoolVersion,
        countryMonumentIds: challenge.countryMonumentIds,
        sizePoolVersion: challenge.sizePoolVersion,
        accuracyThresholdPercent: challenge.accuracyThresholdPercent,
        targeting: challenge.targeting,
        drinkRules: challenge.drinkRules,
        order: index,
        updatedAt,
      }),
      { merge: true }
    );
  });
};

const toChallengeList = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value && typeof value === 'object') return Object.values(value).filter(Boolean);
  return [];
};

const getCountryWordChallenge = (stop) => (
  toChallengeList(stop?.challenges).find((challenge) => challenge?.type === 'countryWordGuess')
);

const getGeoGuessrChallenge = (stop) => (
  toChallengeList(stop?.challenges).find((challenge) => challenge?.type === 'geoGuessr')
);

const getSizeItUpChallenge = (stop) => (
  toChallengeList(stop?.challenges).find((challenge) => challenge?.type === 'sizeItUp')
);

const hasCurrentCountryWordContent = (challenge, expected) => (
  challenge?.id === expected?.id
  && Number(challenge?.penaltySips) === Number(expected?.penaltySips)
  && Number(challenge?.wordListVersion) === Number(expected?.wordListVersion)
  && JSON.stringify(challenge?.targeting || null) === JSON.stringify(expected?.targeting || null)
  && JSON.stringify(challenge?.drinkRules || null) === JSON.stringify(expected?.drinkRules || null)
  && Array.isArray(challenge?.words)
  && JSON.stringify(challenge.words) === JSON.stringify(expected.words)
);

const hasCurrentGeoGuessrContent = (challenge, expected) => (
  challenge?.id === expected?.id
  && Number(challenge?.penaltySips) === Number(expected?.penaltySips)
  && Number(challenge?.monumentPoolVersion) === Number(expected?.monumentPoolVersion)
  && Array.isArray(challenge?.countryMonumentIds)
  && JSON.stringify(challenge.countryMonumentIds) === JSON.stringify(expected.countryMonumentIds)
);

const hasCurrentSizeItUpContent = (challenge, expected) => (
  challenge?.id === expected?.id
  && Number(challenge?.penaltySips) === Number(expected?.penaltySips)
  && Number(challenge?.durationSeconds) === Number(expected?.durationSeconds)
  && Number(challenge?.sizePoolVersion) === Number(expected?.sizePoolVersion)
  && Number(challenge?.accuracyThresholdPercent) === Number(expected?.accuracyThresholdPercent)
  && JSON.stringify(challenge?.drinkRules || null) === JSON.stringify(expected?.drinkRules || null)
);

const hasCurrentChallengeCatalogue = (value, expectedChallenges) => {
  const challengesById = new Map(toChallengeList(value).map((challenge) => [challenge.id, challenge]));
  return toChallengeList(expectedChallenges).every((expected) => {
    const challenge = challengesById.get(expected.id);
    return challenge
      && Number(challenge.penaltySips) === Number(expected.penaltySips)
      && Number(challenge.minPlayers || 1) === Number(expected.minPlayers || 1)
      && Number(challenge.expectedDurationSeconds || challenge.durationSeconds)
        === Number(expected.expectedDurationSeconds || expected.durationSeconds)
      && JSON.stringify(challenge.targeting || null) === JSON.stringify(expected.targeting || null)
      && JSON.stringify(challenge.drinkRules || null) === JSON.stringify(expected.drinkRules || null);
  });
};

const migrateCountryWordChallengesIfNeeded = async (rawCountryDocs) => {
  if (countryWordMigrationPromise) return countryWordMigrationPromise;

  countryWordMigrationPromise = (async () => {
    try {
      await ensureMonumentPoolSeeded();
      const normalizedStops = applyCurrentDefaultPositions(rawCountryDocs);
      const rawStopsById = new Map(rawCountryDocs.map((stop) => [stop.id, stop]));
      const embeddedContentIsCurrent = normalizedStops.every((stop) => {
        const expectedWord = getCountryWordChallenge(stop);
        const expectedGeo = getGeoGuessrChallenge(stop);
        const expectedSize = getSizeItUpChallenge(stop);
        const rawStop = rawStopsById.get(stop.id);
        const wordCurrent = !expectedWord || hasCurrentCountryWordContent(
          getCountryWordChallenge(rawStop),
          expectedWord
        );
        const geoCurrent = !expectedGeo || hasCurrentGeoGuessrContent(
          getGeoGuessrChallenge(rawStop),
          expectedGeo
        );
        const sizeCurrent = !expectedSize || hasCurrentSizeItUpContent(
          getSizeItUpChallenge(rawStop),
          expectedSize
        );
        return wordCurrent
          && geoCurrent
          && sizeCurrent
          && hasCurrentChallengeCatalogue(rawStop?.challenges, stop.challenges);
      });
      if (countryWordMigrationVerified && embeddedContentIsCurrent) return 0;

      const challengeSnapshot = await getDocs(collection(firestore, CHALLENGES_COLLECTION));
      const challengeDocsById = new Map(challengeSnapshot.docs.map((docSnap) => [
        docSnap.id,
        docSnap.data(),
      ]));
      const targets = normalizedStops.filter((stop) => {
        const rawStop = rawStopsById.get(stop.id);
        const expectedWord = getCountryWordChallenge(stop);
        const expectedGeo = getGeoGuessrChallenge(stop);
        const expectedSize = getSizeItUpChallenge(stop);

        const wordMismatch = expectedWord && (
          !hasCurrentCountryWordContent(getCountryWordChallenge(rawStop), expectedWord)
          || !hasCurrentCountryWordContent(challengeDocsById.get(`${stop.id}__${expectedWord.id}`), expectedWord)
        );
        const geoMismatch = expectedGeo && (
          !hasCurrentGeoGuessrContent(getGeoGuessrChallenge(rawStop), expectedGeo)
          || !hasCurrentGeoGuessrContent(challengeDocsById.get(`${stop.id}__${expectedGeo.id}`), expectedGeo)
        );
        const sizeMismatch = expectedSize && (
          !hasCurrentSizeItUpContent(getSizeItUpChallenge(rawStop), expectedSize)
          || !hasCurrentSizeItUpContent(
            challengeDocsById.get(`${stop.id}__${expectedSize.id}`),
            expectedSize
          )
        );
        const catalogueMismatch = !hasCurrentChallengeCatalogue(rawStop?.challenges, stop.challenges)
          || !stop.challenges.every((expected) => hasCurrentChallengeCatalogue(
            [challengeDocsById.get(`${stop.id}__${expected.id}`)].filter(Boolean),
            [expected]
          ));

        return Boolean(wordMismatch || geoMismatch || sizeMismatch || catalogueMismatch);
      });

      if (!targets.length) {
        countryWordMigrationVerified = true;
        return 0;
      }

      const updatedAt = Date.now();
      const batch = writeBatch(firestore);
      targets.forEach((stop) => {
        batch.set(
          doc(firestore, COUNTRIES_COLLECTION, stop.id),
          { challenges: stop.challenges, updatedAt },
          { merge: true }
        );
        syncChallengesForStopInBatch(batch, stop, updatedAt);
      });
      await batch.commit();
      countryWordMigrationVerified = true;
      console.info(`Synchronized built-in challenges for ${targets.length} Firestore countries.`);
      return targets.length;
    } catch (migrationError) {
      console.warn('Unable to synchronize built-in challenges to Firestore:', migrationError);
      return 0;
    } finally {
      countryWordMigrationPromise = null;
    }
  })();

  return countryWordMigrationPromise;
};

const seedFirestoreCatalogueIfNeeded = async () => {
  if (seedingPromise) return seedingPromise;
  seedingPromise = (async () => {
    try {
      await ensureMonumentPoolSeeded();
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
    ensureMonumentPoolSeeded().catch(() => {});
    const countriesQuery = query(collection(firestore, COUNTRIES_COLLECTION), orderBy('order', 'asc'));
    const snapshot = await getDocs(countriesQuery);
    const docs = snapshot.docs.map((docSnap) => ({ ...docSnap.data(), id: docSnap.id }));

    if (docs.length >= 2 && !isLegacyCountryCatalogue(docs)) {
      migrateCountryWordChallengesIfNeeded(docs).catch(() => {});
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
        await migrateCountryWordChallengesIfNeeded(docs);
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

const getRouteSignature = (routeStops) => (
  (Array.isArray(routeStops) ? routeStops : []).map((stop) => stop?.id).join('|')
);

const recentRouteSignatures = new Map();

const selectRouteSnapshot = (countryStops, duration = 'long', excludedSignatures = []) => {
  const candidates = getRouteCandidatesForDuration(countryStops, duration);
  const recent = recentRouteSignatures.get(duration) || [];
  const excluded = new Set([...recent, ...excludedSignatures].filter(Boolean));
  const freshCandidates = candidates.filter((route) => !excluded.has(getRouteSignature(route)));
  const available = freshCandidates.length
    ? freshCandidates
    : candidates.filter((route) => !excludedSignatures.includes(getRouteSignature(route)));
  const pool = available.length ? available : candidates;
  const selected = pool[Math.floor(Math.random() * pool.length)]
    || getStopsForDuration(countryStops, duration);
  const signature = getRouteSignature(selected);
  const historyLimit = Math.min(5, Math.max(0, candidates.length - 1));

  recentRouteSignatures.set(
    duration,
    historyLimit
      ? [...recent.filter((item) => item !== signature), signature].slice(-historyLimit)
      : []
  );
  return selected;
};

export const getRouteSnapshotForDuration = async (duration) => (
  selectRouteSnapshot(await getCountryStops(), duration)
);

export const getFreshRouteSnapshotForDuration = async (duration, currentRouteStops) => {
  const countryStops = await getCountryStops();
  return selectRouteSnapshot(
    countryStops,
    duration,
    [getRouteSignature(currentRouteStops)]
  );
};
