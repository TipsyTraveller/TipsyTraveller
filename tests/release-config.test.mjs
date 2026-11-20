import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { DEFAULT_COUNTRY_STOPS } from '../app/GameScreen/constants/countryStops.js';
import { getChallengeIdForStop } from '../app/GameScreen/constants/challenges.js';

const readJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));

test('eas beta profile builds a standalone, installable APK with the dev portal on', () => {
  const eas = readJson('../eas.json');
  const beta = eas.build.beta;
  assert.ok(beta, 'beta profile exists');
  assert.equal(beta.extends, 'preview');
  assert.equal(beta.android.buildType, 'apk');
  assert.equal(beta.developmentClient, false);
  assert.equal(beta.env.EXPO_PUBLIC_ENABLE_DEV_PORTAL, 'true');
  assert.equal(eas.build.preview.distribution, 'internal');
  assert.notEqual(beta.android.developmentClient, true);
});

test('the beta APK package id matches the checked-in Android project', () => {
  const appJson = readJson('../app.json');
  const gradle = readFileSync(new URL('../android/app/build.gradle', import.meta.url), 'utf8');
  const applicationId = /applicationId\s+['"]([^'"]+)['"]/.exec(gradle)?.[1];
  assert.equal(appJson.expo.android.package, applicationId);
});

// Reference copy of the selection logic that ordinary rooms used before beta scenarios.
const legacyChallengeId = (stop, seed, teamPlayerCount, forceType, usedChallengeKeys) => {
  const hashSeed = (value) => String(value).split('').reduce((total, character) => (
    ((total * 31) + character.charCodeAt(0)) >>> 0
  ), 0);
  const challenges = stop.challenges;
  if (forceType) {
    const forced = challenges.find((challenge) => challenge?.type === forceType);
    if (forced?.id) return forced.id;
  }
  const used = new Set(usedChallengeKeys);
  const eligible = challenges.filter((challenge) => (
    teamPlayerCount >= (Number(challenge?.minPlayers) || (
      challenge?.type === 'countryWordGuess' ? 2 : 1
    ))
    && !used.has(`${stop.id}:${challenge.id}`)
  ));
  if (!eligible.length) return null;
  return eligible[hashSeed(seed) % eligible.length].id;
};

test('ordinary challenge selection is unchanged for every stop, seed and team size', () => {
  let compared = 0;
  DEFAULT_COUNTRY_STOPS.forEach((stop) => {
    [1, 2, 3].forEach((teamPlayerCount) => {
      ['', 'geoGuessr'].forEach((forceType) => {
        for (let seed = 0; seed < 12; seed += 1) {
          const used = seed % 3 === 0 ? [`${stop.id}:${stop.challenges[0].id}`] : [];
          assert.equal(
            getChallengeIdForStop(stop, `seed-${seed}`, {
              teamPlayerCount,
              forceType: forceType || null,
              usedChallengeKeys: used,
            }),
            legacyChallengeId(stop, `seed-${seed}`, teamPlayerCount, forceType, used)
          );
          compared += 1;
        }
      });
    });
  });
  assert.ok(compared > 1000);
});
