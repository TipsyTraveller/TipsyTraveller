export const COUNTRY_FLAGS = {
  France: {
    layout: 'vertical',
    stripes: ['#0055A4', '#FFFFFF', '#EF4135'],
    banner: ['#0055A4', '#FFFFFF', '#EF4135'],
  },
  Spain: {
    layout: 'horizontal',
    stripes: ['#C60B1E', '#FFC400', '#C60B1E'],
    stripeWeights: [1, 1.8, 1],
    banner: ['#C60B1E', '#FFC400', '#C60B1E'],
  },
  Portugal: {
    layout: 'portugal',
    stripes: ['#006600', '#DA291C'],
    stripeWeights: [1.1, 1.7],
    emblemColor: '#FFD700',
    banner: ['#006600', '#FFD700', '#DA291C'],
  },
  Italy: {
    layout: 'vertical',
    stripes: ['#009246', '#FFFFFF', '#CE2B37'],
    banner: ['#009246', '#FFFFFF', '#CE2B37'],
  },
  Germany: {
    layout: 'horizontal',
    stripes: ['#222222', '#DD0000', '#FFCE00'],
    banner: ['#222222', '#DD0000', '#FFCE00'],
  },
  Belgium: {
    layout: 'vertical',
    stripes: ['#222222', '#FDDA24', '#EF3340'],
    banner: ['#222222', '#FDDA24', '#EF3340'],
  },
  Europe: {
    layout: 'horizontal',
    stripes: ['#003399', '#FFCC00', '#003399'],
    banner: ['#003399', '#FFCC00', '#003399'],
  },
};

export const getCountryFlag = (country) => (
  COUNTRY_FLAGS[country] || COUNTRY_FLAGS.Europe
);

const FALLBACK_CHALLENGE = {
  country: 'Europe',
  title: 'Border Check',
  prompt: 'Tell the table where your team is travelling next and why.',
  penalty: 'If the story is boring, take 1 sip of bier.',
  accent: '#1ba39c',
};

// Each stop has a pool. The first entry is the original challenge, so callers
// without a seed keep getting the same card as before.
const CHALLENGES_BY_STOP = {
  1: [
    {
      country: 'France',
      title: 'Cafe Charades',
      prompt: 'Act out ordering the fanciest drink in Paris without using words.',
      penalty: 'If your team cannot guess it in 20 seconds, take 1 at of bier.',
      accent: '#d71920',
    },
    {
      country: 'France',
      title: "Build the Eiffel Tower",
      prompt: "Build an Eiffel Tower with your whole team using only your bodies. The player at the top must down their glass of bier in one go.",
      penalty: "Tower falls before the top player is done? Everybody takes 2 sips of bier.",
      accent: '#d71920',
    },
    {
      country: 'France',
      title: "Moulin Rouge Cancan",
      prompt: "Form a cancan line, arms around each other, and kick for 10 seconds. The other team picks the worst kicker.",
      penalty: "Worst kicker downs their glass of bier in one go.",
      accent: '#d71920',
    },
    {
      country: 'France',
      title: "Arc de Triomphe",
      prompt: "Two players make an arch with their arms. The rest crawl or walk through while the arch players chant. Whoever gets touched by the arch is caught.",
      penalty: "Caught players down their glass of bier in one go.",
      accent: '#d71920',
    },
    {
      country: 'France',
      title: "Mona Lisa Stare-Off",
      prompt: "Everyone strikes the Mona Lisa pose with a mysterious smile. First to laugh or show teeth loses.",
      penalty: "Loser downs their glass of bier in one go.",
      accent: '#d71920',
    },
  ],
  2: [
    {
      country: 'Spain',
      title: 'Tapas Tempo',
      prompt: 'Name three tapas dishes before the other team counts down from five.',
      penalty: 'Miss one? Tell a travel story or take 1 sip of bier.',
      accent: '#f2c94c',
    },
    {
      country: 'Spain',
      title: "Human Castell",
      prompt: "Build a Catalan human tower. The smallest player climbs to the top and downs their glass of bier in one go.",
      penalty: "Tower falls first? Whole team takes 2 sips of bier.",
      accent: '#f2c94c',
    },
    {
      country: 'Spain',
      title: "Running of the Bulls",
      prompt: "One player runs the length of the table while two bulls chase them with finger horns. Touched before the finish line means caught.",
      penalty: "Caught runner downs their glass of bier in one go.",
      accent: '#f2c94c',
    },
    {
      country: 'Spain',
      title: "Sangria Pitcher Relay",
      prompt: "Pass a full cup along the team, each player spinning once before passing. Spilling is not allowed.",
      penalty: "Whoever spills downs the rest of their glass of bier.",
      accent: '#f2c94c',
    },
    {
      country: 'Spain',
      title: "La Tomatina Toss",
      prompt: "Throw a scrunched napkin into a teammate's cup from 1 metre. Every miss is a squashed tomato.",
      penalty: "Team misses 3 of 5? The thrower downs their glass of bier in one go.",
      accent: '#f2c94c',
    },
  ],
  3: [
    {
      country: 'Portugal',
      title: 'Fado Face-Off',
      prompt: 'Give your most dramatic 5-second performance about missing the last train.',
      penalty: 'No drama, no glory: take 1 sip of bier.',
      accent: '#27ae60',
    },
    {
      country: 'Portugal',
      title: "Tram 28 Squeeze",
      prompt: "Everyone stands on one foot and squeezes into the smallest space you can find. Hold for 15 seconds.",
      penalty: "First foot to touch the ground downs their glass of bier in one go.",
      accent: '#27ae60',
    },
    {
      country: 'Portugal',
      title: "Christ the Redeemer",
      prompt: "Stand with arms wide like Cristo Rei and hold for 20 seconds while the other team tries to make you laugh.",
      penalty: "First arm to drop downs their glass of bier in one go.",
      accent: '#27ae60',
    },
    {
      country: 'Portugal',
      title: "Sardine Tin",
      prompt: "Lie side by side like sardines on the floor or across chairs. The player in the middle must drink their bier while lying down.",
      penalty: "Spill a drop and everybody takes 1 sip of bier.",
      accent: '#27ae60',
    },
    {
      country: 'Portugal',
      title: "Nazare Big Wave",
      prompt: "Team stands on one line and wobbles like a big wave. The surfer on top (a teammate's back or shoulders) drinks a sip while balancing.",
      penalty: "Fall off and the surfer downs their glass of bier in one go.",
      accent: '#27ae60',
    },
  ],
  4: [
    {
      country: 'Spain',
      title: 'Flamenco Freeze',
      prompt: 'Strike a flamenco pose. Your team must copy it perfectly.',
      penalty: 'Worst pose takes 1 sip of bier.',
      accent: '#eb5757',
    },
    {
      country: 'Spain',
      title: "Flamenco Line",
      prompt: "Do a synchronized flamenco line dance for 10 seconds with claps and stomps. The other team votes for the worst dancer.",
      penalty: "Worst dancer downs their glass of bier in one go.",
      accent: '#eb5757',
    },
    {
      country: 'Spain',
      title: "Matador Showdown",
      prompt: "One player is the matador with a napkin cape, another is the bull. Dodge 3 charges without moving your feet.",
      penalty: "Feet move? Matador downs their glass of bier in one go.",
      accent: '#eb5757',
    },
    {
      country: 'Spain',
      title: "Paella Pan",
      prompt: "Everyone holds hands in a circle as the pan. One player stands in the middle as the rice and must reach the edge without breaking the circle.",
      penalty: "Circle breaks? Both players down their glass of bier in one go.",
      accent: '#eb5757',
    },
    {
      country: 'Spain',
      title: "Ol\u00e9 Wave",
      prompt: "Start a stadium wave with a loud 'Ol\u00e9!'. The wave must go around the team twice without mistakes.",
      penalty: "Break the wave and you down your glass of bier in one go.",
      accent: '#eb5757',
    },
  ],
  5: [
    {
      country: 'Italy',
      title: 'Pasta Pitch',
      prompt: 'Invent a pasta dish and sell it like a luxury commercial.',
      penalty: 'If nobody would order it, take 1 sip of bier.',
      accent: '#2f80ed',
    },
    {
      country: 'Italy',
      title: "Leaning Tower of Pisa",
      prompt: "Hold hands and lean together as one big tilted tower for 15 seconds.",
      penalty: "First to fall or let go downs their glass of bier in one go.",
      accent: '#2f80ed',
    },
    {
      country: 'Italy',
      title: "Colosseum Duel",
      prompt: "Two players duel in a gladiator showdown of rock paper scissors, best of 3, with dramatic Roman voices.",
      penalty: "Loser downs their glass of bier in one go.",
      accent: '#2f80ed',
    },
    {
      country: 'Italy',
      title: "Trevi Fountain Toss",
      prompt: "Toss a coin or small object over your shoulder into a cup. Land it and you pick someone to drink.",
      penalty: "Miss and you down your glass of bier in one go.",
      accent: '#2f80ed',
    },
    {
      country: 'Italy',
      title: "Gondola Row",
      prompt: "Sit in a row and 'paddle' in sync. The front player is the gondolier and sings an Italian-sounding song.",
      penalty: "Out of sync? The gondolier downs their glass of bier in one go.",
      accent: '#2f80ed',
    },
  ],
  6: [
    {
      country: 'Germany',
      title: 'Autobahn Answers',
      prompt: 'Name two German cities and one German food before time runs out.',
      penalty: 'If you stall, take 1 sip of bier.',
      accent: '#f2994a',
    },
    {
      country: 'Germany',
      title: "Brandenburg Gate",
      prompt: "Build a gate with two players holding arms high while the rest march through in step like a parade.",
      penalty: "Anyone who breaks the formation downs their glass of bier in one go.",
      accent: '#f2994a',
    },
    {
      country: 'Germany',
      title: "Berlin Wall Breakthrough",
      prompt: "Half the team links arms as a wall. One player has 15 seconds to get through without pushing hard.",
      penalty: "Wall holds? The runner downs their glass of bier in one go.",
      accent: '#f2994a',
    },
    {
      country: 'Germany',
      title: "Oktoberfest Stein Hold",
      prompt: "Everyone holds their full cup at arm's length for 20 seconds while the other team sings an oompah song.",
      penalty: "First cup to drop or spill downs their glass of bier in one go.",
      accent: '#f2994a',
    },
    {
      country: 'Germany',
      title: "Oompah Band",
      prompt: "Each player mimes an instrument and plays along to a beat. The other team picks the worst musician.",
      penalty: "Worst musician downs their glass of bier in one go.",
      accent: '#f2994a',
    },
  ],
  7: [
    {
      country: 'Belgium',
      title: 'Trappist Toast',
      prompt: 'Make a grand toast to the whole table in your best royal voice.',
      penalty: 'If the toast gets no applause, take 1 sip of bier.',
      accent: '#1ba39c',
    },
    {
      country: 'Belgium',
      title: "Build the Atomium",
      prompt: "Make the Atomium with your team: one player in the middle, the rest holding hands in a ring around them, arms stretched.",
      penalty: "Ring breaks and the middle player downs their glass of bier in one go.",
      accent: '#1ba39c',
    },
    {
      country: 'Belgium',
      title: "Manneken Pis",
      prompt: "One player stands on a chair or tiptoes and pours bier from a small cup into another player's cup, held lower, without spilling.",
      penalty: "Spill and the pourer downs their glass of bier in one go.",
      accent: '#1ba39c',
    },
    {
      country: 'Belgium',
      title: "Bierfiets Pedal",
      prompt: "Sit in a row and pedal in sync with a loud 'Sant\u00e9!' on every 4th pedal. Keep the rhythm for 15 seconds.",
      penalty: "Out of rhythm? The last player downs their glass of bier in one go.",
      accent: '#1ba39c',
    },
    {
      country: 'Belgium',
      title: "Fries Relay",
      prompt: "Pass a 'cone of fries' (a napkin) down the line without hands. The last player eats it and drinks bier.",
      penalty: "Dropped fries? The dropper downs their glass of bier in one go.",
      accent: '#1ba39c',
    },
  ],
};

const hashSeed = (seed) => {
  const text = String(seed);
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash * 31) + text.charCodeAt(index)) >>> 0;
  }
  return hash;
};

// Per-stop ticket presentation: the destination city, the landmark drawn in
// `CityLandmark`. Flag colors come from `COUNTRY_FLAGS` by country name.
const STOP_VISUALS = {
  1: { code: 'FR', city: 'Paris', landmark: 'paris' },
  2: { code: 'ES', city: 'Madrid', landmark: 'madrid' },
  3: { code: 'PT', city: 'Lisbon', landmark: 'lisbon' },
  4: { code: 'ES', city: 'Sevilla', landmark: 'sevilla' },
  5: { code: 'IT', city: 'Rome', landmark: 'rome' },
  6: { code: 'DE', city: 'Berlin', landmark: 'berlin' },
  7: { code: 'BE', city: 'Brussels', landmark: 'brussels' },
};

// Short badge for the failure penalty, taken from the penalty sentence unless a
// challenge sets an explicit `penaltyTag`.
export const getPenaltyTag = (challenge) => {
  if (challenge.penaltyTag) return challenge.penaltyTag;
  const penalty = challenge.penalty ?? '';
  if (/\bdown/i.test(penalty)) return 'DOWN IT';
  const sips = penalty.match(/(\d+)\s+sips?/i);
  if (sips) return `${sips[1]} ${sips[1] === '1' ? 'SIP' : 'SIPS'}`;
  return 'DRINK';
};

// Optional timer chip, taken from the first "N seconds" in the challenge text.
export const getChallengeTimer = (challenge) => {
  const match = `${challenge.prompt ?? ''} ${challenge.penalty ?? ''}`.match(/(\d+)\s*-?\s*seconds?/i);
  return match ? `${match[1]} SEC` : null;
};

const withStopVisuals = (stopIndex, challenge) => ({
  ...challenge,
  ...STOP_VISUALS[stopIndex],
  stop: stopIndex,
  stopIndex,
});

// `seed` must be identical on every device (e.g. the synced action id) so a
// multiplayer room shows the same challenge everywhere. Without a seed the
// first challenge of the stop is returned.
export const getChallengeForStop = (stopIndex, seed) => {
  const pool = CHALLENGES_BY_STOP[stopIndex];
  if (!pool?.length) return FALLBACK_CHALLENGE;
  if (seed === undefined || seed === null) return withStopVisuals(stopIndex, pool[0]);
  return withStopVisuals(stopIndex, pool[hashSeed(seed) % pool.length]);
};
