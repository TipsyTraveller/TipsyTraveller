import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { get, ref } from 'firebase/database';
import { db } from '../../../firebaseConfig';
import { resolveGameRouteStops } from '../constants/countryStops';

export const getOverviewRouteSignature = (stops) => JSON.stringify(stops.map(
  ({ id, name, city, position }) => [id, name, city, position.x, position.y]
));

export default function useRouteOverview({
  canPresent,
  connected,
  gameData,
  gameID,
  localSession,
  multiplayerEnabled,
  routeSignature,
  sessionId,
}) {
  const sessionKey = multiplayerEnabled
    ? (sessionId ? `room:${gameID}:${sessionId}` : null)
    : localSession;
  const storageKey = sessionKey ? `@tipsy_route_overview_v1:${encodeURIComponent(sessionKey)}` : null;
  const [readResult, setReadResult] = useState(null);
  const [verifiedRoute, setVerifiedRoute] = useState(null);
  const dismissed = readResult?.key === storageKey ? readResult.dismissed : null;

  useEffect(() => {
    if (!storageKey) return undefined;
    let current = true;
    AsyncStorage.getItem(storageKey).catch(() => null).then((value) => {
      if (current) setReadResult({ key: storageKey, dismissed: value === '1' });
    });
    return () => { current = false; };
  }, [storageKey]);

  const entrySignature = useMemo(() => (
    sessionId && sessionId === gameData.gameplay?.sessionId && gameData.routeStops
      ? getOverviewRouteSignature(resolveGameRouteStops(gameData))
      : null
  ), [gameData, sessionId]);
  const confirmedSignature = entrySignature
    ?? (verifiedRoute?.key === storageKey ? verifiedRoute?.signature : null);

  useEffect(() => {
    if (!multiplayerEnabled || !storageKey || !connected || dismissed !== false || confirmedSignature) {
      return undefined;
    }
    let current = true;
    // Rematch writes both fields together, but the board's separate listeners can
    // deliver them on different renders. Verify the pair in one room snapshot.
    get(ref(db, `games/${gameID}`)).then((snapshot) => {
      const stops = snapshot.child('routeStops').val();
      if (!current || snapshot.child('gameplay/sessionId').val() !== sessionId || !stops) return;
      const signature = getOverviewRouteSignature(resolveGameRouteStops({ routeStops: stops }));
      setVerifiedRoute({ key: storageKey, signature });
    }).catch(() => {
      // A failed lookup leaves gameplay usable. Reconnection can retry.
    });
    return () => { current = false; };
  }, [confirmedSignature, connected, dismissed, gameID, multiplayerEnabled, sessionId, storageKey]);

  const ready = Boolean(storageKey && canPresent && (!multiplayerEnabled || confirmedSignature === routeSignature));
  const visible = ready && dismissed === false;

  const dismiss = useCallback(() => {
    if (!visible) return;
    setReadResult({ key: storageKey, dismissed: true });
    AsyncStorage.setItem(storageKey, '1').catch(() => {});
  }, [storageKey, visible]);

  return { dismiss, visible, blocksRoll: ready && dismissed !== true };
}
