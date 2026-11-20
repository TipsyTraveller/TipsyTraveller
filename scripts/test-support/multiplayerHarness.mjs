import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { transformSync } from '@babel/core';
import { createInitialGameplay } from '../../app/GameScreen/gameplayState.js';
import { createBetaPreset } from '../../app/GameScreen/constants/betaScenario.js';
import { createRouteModel } from '../../app/GameScreen/constants/route.js';
import { DEFAULT_MONUMENT_POOL } from '../../app/GameScreen/constants/monumentPool.js';

const filename = new URL('../../app/GameScreen/hooks/useMultiplayerGame.js', import.meta.url);
const source = readFileSync(filename, 'utf8');
const { code } = transformSync(source, {
  configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
});
const dependencies = {};
const mocked = new Set([
  '../../../firebaseConfig', '../../shared/storage/userSettings', '../services/countryStopsService',
]);
for (const [, name] of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
  if (name.startsWith('.') && !mocked.has(name)) dependencies[name] = await import(new URL(`${name}.js`, filename));
}

// Executes real transaction callbacks with a fake transport and explicit client renders.
// Effects, React rendering and Firebase SDK networking are intentionally outside this harness.
export function createMultiplayerHarness() {
  let clock = 1000000;
  let device = 'team1-phone';
  let stateIndex = 0;
  const teamIds = ['team1', 'team2', 'team3'];
  const members = Object.fromEntries(teamIds.map(id => [id, Object.fromEntries([0, 1, 2].map(i => [
    `${id}-p${i}`, { name: `${id} player ${i}`, deviceID: i === 0 ? `${id}-phone` : '', isLeader: i === 0 },
  ]))]));
  const room = {
    ...createBetaPreset(), nrOfPlayers: '9-12', difficulty: 'medium', duration: 'long',
    hostDeviceID: 'team1-phone', status: 'game',
  };
  room.gameplay = createInitialGameplay(room, clock, members);
  const routeModel = createRouteModel(room.routeStops);
  const snapshot = value => ({ exists: () => value != null, val: () => structuredClone(value) });
  const read = path => path === 'games/test/gameplay' ? room.gameplay
    : path === 'games/test' ? room : path === 'games/test/betaScenario' ? room.betaScenario : null;
  const modules = {
    ...dependencies,
    react: {
      useEffect: () => {}, useMemo: fn => fn(), useCallback: fn => fn, useRef: value => ({ current: value }),
      useState: initial => {
        const overrides = {
          0: room.gameplay, 1: members, 2: device, 3: 0, 4: true, 5: false,
          6: Object.fromEntries(teamIds.map(id => [`${id}-phone`, { connected: true }])), 7: true, 9: clock,
        };
        const index = stateIndex++;
        return [index in overrides ? overrides[index] : typeof initial === 'function' ? initial() : initial, () => {}];
      },
    },
    'firebase/database': {
      ref: (_db, path) => path, get: async path => snapshot(read(path)),
      runTransaction: async (path, update) => {
        const original = structuredClone(read(path));
        const next = update(structuredClone(original));
        const retry = update(structuredClone(original));
        assert.deepEqual(next, retry, 'retry must preserve the transition');
        assert.deepEqual(read(path), original, 'callback must not mutate the stored state');
        if (next === undefined) return { committed: false };
        assert.equal(path, 'games/test/gameplay');
        room.gameplay = structuredClone(next);
        return { committed: true, snapshot: snapshot(next) };
      },
    },
    '@react-native-async-storage/async-storage': { default: {} },
    'react-native': {}, '../../../firebaseConfig': { db: {} },
    '../../shared/storage/userSettings': {},
    '../services/countryStopsService': { getCachedMonumentPool: () => DEFAULT_MONUMENT_POOL },
  };
  const exports = {};
  vm.runInNewContext(code, {
    exports, require: name => {
      assert.ok(name in modules, `unmocked dependency: ${name}`);
      return modules[name];
    },
    Date: class extends Date { static now() { return clock; } }, console,
  }, { filename: filename.pathname });
  const client = (team = room.gameplay.activeTeamId) => {
    device = `${team}-phone`;
    stateIndex = 0;
    return exports.default({ enabled: true, gameID: 'test', gameData: room, routeModel, teamMembers: members });
  };
  return { room, members, routeModel, client, advance: ms => { clock += ms; }, setTime: ms => { clock = ms; },
    land: async type => {
      const [id] = Object.entries(room.betaScenario.stops).find(([, plan]) => plan.challenge.type === type);
      const index = room.routeStops.findIndex(stop => stop.id === id);
      room.gameplay.teamProgress.team1.currentLeg = index - 1;
      room.gameplay.teamProgress.team1.score = (index - 1) * 10;
      assert.equal(await client().submitRoll(1), true);
      clock = room.gameplay.currentAction.movementEndsAt + 1000;
      assert.equal(await client().completeMovement(room.gameplay.currentAction.id), true);
    },
  };
}
