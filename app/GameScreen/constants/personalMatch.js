export const PERSONAL_MATCH_CHALLENGE_ID = 'personal-match';
export const PERSONAL_MATCH_CHALLENGE_TYPE = 'personalMatch';
export const PERSONAL_MATCH_POOL_VERSION = 1;
export const PERSONAL_MATCH_DURATION_SECONDS = 25;
export const PERSONAL_MATCH_SUCCESS_POINTS = 10;

// Lethal-only prompts stay adult and consensual without asking players to disclose
// trauma, medical details, illegal acts, or explicit descriptions of other people.
export const PERSONAL_MATCH_QUESTIONS = [
  { id: 'perfect-first-date', prompt: 'What would be your perfect first date?', options: ['Cocktails at a hidden bar', 'A spontaneous road trip', 'Dinner somewhere fancy', 'A cosy movie night'] },
  { id: 'flirting-style', prompt: 'What is your usual flirting style?', options: ['Playful teasing', 'Direct compliments', 'Awkward jokes', 'Waiting for them to flirt first'] },
  { id: 'celebrity-crush-type', prompt: 'Which celebrity-crush energy gets you every time?', options: ['Mysterious artist', 'Funny chaos agent', 'Confident athlete', 'Soft-spoken intellectual'] },
  { id: 'dating-red-flag', prompt: 'Which dating red flag would make you leave fastest?', options: ['Rude to staff', 'Always on their phone', 'Only talks about an ex', 'Never asks a question'] },
  { id: 'party-role', prompt: 'Who are you most likely to become at a party?', options: ['Dance-floor captain', 'Kitchen therapist', 'Flirty social butterfly', 'The one who disappears early'] },
  { id: 'tipsy-text', prompt: 'Who are you most likely to text when tipsy?', options: ['My best friend', 'An old crush', 'The group chat', 'Nobody; my phone gets confiscated'] },
  { id: 'harmless-secret', prompt: 'Which harmless secret are you most likely to keep?', options: ['A secret crush', 'A guilty-pleasure playlist', 'A ridiculous purchase', 'A fake excuse to cancel plans'] },
  { id: 'compliment', prompt: 'Which compliment would make you blush most?', options: ['You are hilarious', 'You look incredible', 'I feel safe with you', 'You are unforgettable'] },
  { id: 'holiday-romance', prompt: 'What would tempt you most into a holiday romance?', options: ['A sunset conversation', 'Dancing until sunrise', 'Getting lost together', 'A bold first move'] },
  { id: 'jealousy-trigger', prompt: 'What is most likely to make you a little jealous?', options: ['An ex appearing', 'Being left on read', 'A suspicious new bestie', 'Someone stealing the spotlight'] },
  { id: 'bad-date-escape', prompt: 'How would you escape a truly terrible date?', options: ['Fake an urgent call', 'Be honest and leave', 'Text a friend for rescue', 'Stay and turn it into a story'] },
  { id: 'love-language', prompt: 'Which gesture wins you over fastest?', options: ['Thoughtful gifts', 'Quality time', 'Physical affection', 'Helpful little actions'] },
  { id: 'romcom-role', prompt: 'Which role would you have in a romantic comedy?', options: ['The charming lead', 'The chaotic best friend', 'The unexpected rival', 'The one missing every hint'] },
  { id: 'dating-app-opener', prompt: 'Which dating-app opener would you answer?', options: ['A clever joke', 'A bold compliment', 'A strange hypothetical', 'A simple honest hello'] },
  { id: 'relationship-dealbreaker', prompt: 'Which relationship habit would annoy you most?', options: ['Stealing the blankets', 'Never choosing dinner', 'Being chronically late', 'Sharing everything online'] },
  { id: 'public-affection', prompt: 'How comfortable are you with public affection?', options: ['Very; bring it on', 'Only hand-holding', 'Only in quiet places', 'Please keep it private'] },
  { id: 'confession-method', prompt: 'How would you confess a crush?', options: ['Say it directly', 'Send a carefully written text', 'Drop painfully obvious hints', 'Hope a friend tells them'] },
  { id: 'ex-encounter', prompt: 'What would you do if you met an ex at a party?', options: ['Act completely unbothered', 'Have a friendly chat', 'Avoid them all night', 'Make sure I look amazing'] },
  { id: 'karaoke-dedication', prompt: 'Who gets your dramatic karaoke dedication?', options: ['A current crush', 'My best friend', 'My ex as a joke', 'Myself, obviously'] },
  { id: 'most-attractive-trait', prompt: 'Which trait do you find most attractive?', options: ['Quick humour', 'Quiet confidence', 'Kindness', 'Adventurous energy'] },
  { id: 'awkward-date-moment', prompt: 'Which awkward date moment could you recover from?', options: ['Forgetting their name', 'Spilling a drink', 'Running into family', 'Calling them the wrong name'] },
  { id: 'phone-snoop', prompt: 'What would tempt you most to peek at someone else\'s phone?', options: ['A suspicious notification', 'A message from an ex', 'A hidden photo album', 'Nothing; I would not peek'] },
  { id: 'secret-admirer', prompt: 'How would you react to a secret admirer?', options: ['Immediately investigate', 'Enjoy the mystery', 'Feel slightly terrified', 'Ask friends to solve it'] },
  { id: 'couple-costume', prompt: 'Which couple costume would you actually wear?', options: ['Iconic movie duo', 'Ridiculous food pairing', 'Matching villains', 'Never a couple costume'] },
  { id: 'proposal-setting', prompt: 'Where would you prefer a big romantic question?', options: ['On a scenic trip', 'At home in private', 'During a huge celebration', 'Somewhere meaningful from the past'] },
  { id: 'crush-giveaway', prompt: 'What gives away that you have a crush?', options: ['I talk much more', 'I avoid eye contact', 'I become extra helpful', 'I tell everyone except them'] },
  { id: 'revenge-glow-up', prompt: 'What powers your best revenge glow-up?', options: ['A new outfit', 'A wild new hobby', 'A great night out', 'Pretending I never cared'] },
  { id: 'midnight-adventure', prompt: 'Which midnight adventure would you choose?', options: ['Sneak to the beach', 'Find an all-night bar', 'Drive with no destination', 'Order food and stay in'] },
  { id: 'romantic-surprise', prompt: 'Which romantic surprise would you love most?', options: ['A planned getaway', 'A handwritten letter', 'A surprise party', 'Breakfast in bed'] },
  { id: 'dating-show', prompt: 'Which dating-show challenge would you dominate?', options: ['Speed dating', 'Meeting the parents', 'Couples trivia', 'A dramatic elimination speech'] },
  { id: 'most-likely-lie', prompt: 'Which tiny dating lie are you most likely to tell?', options: ['I am five minutes away', 'I have seen that film', 'I never checked your profile', 'I am fine with sharing dessert'] },
  { id: 'friendship-crush', prompt: 'What would you do if you liked a close friend?', options: ['Tell them quickly', 'Wait for a perfect moment', 'Ask another friend for advice', 'Hide it forever'] },
  { id: 'dance-floor-move', prompt: 'What is your most dangerous dance-floor move?', options: ['Intense eye contact', 'Pulling someone closer', 'A ridiculous signature move', 'Leaving before I embarrass myself'] },
  { id: 'morning-after', prompt: 'What matters most after a chaotic night out?', options: ['A full recap', 'Greasy breakfast', 'Checking my messages', 'Pretending nothing happened'] },
  { id: 'double-date', prompt: 'What role do you play on a double date?', options: ['Conversation starter', 'Secret matchmaker', 'Competitive storyteller', 'Quiet observer'] },
  { id: 'crush-challenge', prompt: 'Which dare involving a crush would you actually do?', options: ['Send a flirty emoji', 'Ask them for a drink', 'Post a subtle story', 'Refuse every dare'] },
  { id: 'lethal-turn-on', prompt: 'Which quality is the biggest turn-on for you?', options: ['Confident eye contact', 'A commanding voice', 'Playful teasing', 'Unexpected tenderness'], lethalOnly: true },
  { id: 'lethal-hookup-place', prompt: 'Where would a spontaneous hook-up feel most exciting?', options: ['A luxury hotel', 'Somewhere outdoors and secluded', 'At a party after everyone leaves', 'My own bed; comfort wins'], lethalOnly: true },
  { id: 'lethal-one-night-stand', prompt: 'What is your honest opinion of a one-night stand?', options: ['Fun with the right person', 'Only on holiday', 'Not really my thing', 'Depends entirely on the chemistry'], lethalOnly: true },
  { id: 'lethal-roleplay', prompt: 'Which fantasy would you be most open to discussing with a partner?', options: ['Roleplay', 'Being more dominant', 'Being more submissive', 'Trying somewhere adventurous'], lethalOnly: true },
  { id: 'lethal-kiss-style', prompt: 'What kind of kiss gets your attention fastest?', options: ['Slow and teasing', 'Bold and intense', 'Playful and surprising', 'Soft and affectionate'], lethalOnly: true },
  { id: 'lethal-bedroom-mood', prompt: 'Which mood sounds most appealing for an intimate night?', options: ['Romantic and slow', 'Playful and experimental', 'Spontaneous and intense', 'Relaxed with lots of laughter'], lethalOnly: true },
  { id: 'lethal-friends-benefits', prompt: 'Could a friends-with-benefits situation work for you?', options: ['Yes, easily', 'Only with strict rules', 'I would catch feelings', 'Absolutely not'], lethalOnly: true },
  { id: 'lethal-first-move', prompt: 'What is the boldest first move you would enjoy?', options: ['A direct invitation home', 'A kiss without overthinking', 'A whispered suggestion', 'Letting the other person lead'], lethalOnly: true },
  { id: 'lethal-secret-fantasy', prompt: 'How likely are you to share a secret fantasy with a partner?', options: ['Immediately', 'After a few drinks', 'Only in a serious relationship', 'I would keep it private'], lethalOnly: true },
  { id: 'lethal-location', prompt: 'Which setting feels sexiest for a private getaway?', options: ['A city hotel suite', 'A remote cabin', 'A beach villa', 'Home with every phone switched off'], lethalOnly: true },
  { id: 'lethal-attraction', prompt: 'What creates sexual chemistry fastest for you?', options: ['Tension and anticipation', 'Physical touch', 'Deep conversation', 'Shared humour'], lethalOnly: true },
  { id: 'lethal-boundary-talk', prompt: 'When would you prefer to talk about intimate boundaries?', options: ['Before anything starts', 'In the moment', 'After trust has grown', 'Whenever the topic comes up naturally'], lethalOnly: true },
];

const hashSeed = (seed) => String(seed).split('').reduce((total, character) => (
  ((total * 31) + character.charCodeAt(0)) >>> 0
), 0);

const isValidOptionIndex = (value) => (
  value !== null
  && value !== undefined
  && value !== ''
  && Number.isInteger(Number(value))
  && Number(value) >= 0
  && Number(value) < 4
);

export const getEligiblePersonalMatchQuestions = (difficulty = 'easy') => (
  PERSONAL_MATCH_QUESTIONS.filter((question) => (
    !question.lethalOnly || ['hard', 'lethal'].includes(String(difficulty).toLowerCase())
  ))
);

export const selectPersonalMatchQuestion = ({
  difficulty = 'easy',
  seed = '',
  usedQuestionIds = [],
}) => {
  const eligible = getEligiblePersonalMatchQuestions(difficulty);
  const used = new Set(Array.isArray(usedQuestionIds) ? usedQuestionIds : []);
  const available = eligible.filter((question) => !used.has(question.id));
  const candidates = available.length ? available : eligible;
  if (!candidates.length) return null;

  const question = candidates[hashSeed(`${seed}:personal-match-question`) % candidates.length];
  return {
    question,
    nextUsedQuestionIds: [...new Set([...(usedQuestionIds || []), question.id])],
  };
};

export const evaluatePersonalMatchGuess = ({ selectedAnswerIndex, teamGuessIndex }) => {
  const answer = Number(selectedAnswerIndex);
  const guess = Number(teamGuessIndex);
  const isValidAnswer = isValidOptionIndex(selectedAnswerIndex);
  const isValidGuess = isValidOptionIndex(teamGuessIndex);
  return {
    isValidAnswer,
    isValidGuess,
    matched: isValidAnswer && isValidGuess && answer === guess,
  };
};
