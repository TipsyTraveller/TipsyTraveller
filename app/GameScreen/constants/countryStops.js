import { MAP_CY, MAP_H, MAP_W, svgPoint, uv } from './mapCoordinates';

export const DURATION_STOP_COUNTS = { short: 6, medium: 9, long: 12 };

// Each corridor is ordered from Belgium toward Greece. A room picks one
// corridor, then samples evenly distributed stops from it so routes vary while
// remaining geographically readable instead of zigzagging randomly.
export const ROUTE_CORRIDORS = [
  [
    'luxembourg', 'france', 'monaco', 'switzerland', 'liechtenstein',
    'italy', 'san-marino', 'vatican-city', 'slovenia',
    'croatia', 'bosnia-herzegovina', 'montenegro', 'albania', 'north-macedonia',
  ],
  [
    'netherlands', 'germany', 'denmark', 'poland', 'czechia', 'austria',
    'slovakia', 'hungary', 'romania', 'serbia', 'kosovo', 'bulgaria',
    'north-macedonia',
  ],
  [
    'netherlands', 'germany', 'denmark', 'norway', 'sweden', 'finland',
    'estonia', 'latvia', 'lithuania', 'poland', 'ukraine', 'moldova',
    'romania', 'bulgaria', 'turkey', 'north-macedonia',
  ],
  [
    'ireland', 'united-kingdom', 'france', 'portugal', 'spain', 'andorra',
    'monaco', 'switzerland', 'italy', 'san-marino', 'vatican-city',
    'malta', 'albania',
  ],
];
export const COUNTRY_POSITION_VERSION = 2;

const position = (x, y) => {
  const point = svgPoint(x, y);
  return { x: point.x, y: point.y };
};

const challenge = (id, title, prompt, penalty = 'If the team cannot do it, take 1 sip or choose water.') => ([{
  id,
  title,
  prompt,
  penalty,
}]);

const COUNTRY_WORDS = {
  iceland: ['Thingvellir', 'Eyjafjallajokull', 'skyr', 'puffin colony', 'medieval saga', 'geothermal lagoon'],
  ireland: ['Cliffs of Moher', 'hurling', 'bodhran', 'Gaelic language', 'Ring of Kerry', 'soda bread'],
  'united-kingdom': ['Stonehenge', 'Beefeater', "Hadrian's Wall", 'black cab', 'Westminster', 'crumpet'],
  portugal: ['azulejo tiles', 'bacalhau', 'cork oak', 'Douro Valley', 'custard tart', 'saudade'],
  spain: ['Alhambra', 'gazpacho', 'castanets', 'Camino de Santiago', 'jamon', 'parador'],
  andorra: ['Caldea spa', 'Vallnord', 'Romanesque church', 'duty-free shopping', 'Madriu Valley', 'co-prince'],
  france: ['Mont Saint-Michel', 'bouillabaisse', 'petanque', 'Versailles', 'escargot', 'Tour de France'],
  monaco: ['Casino Square', 'hairpin bend', 'Grimaldi dynasty', 'principality', 'Larvotto Beach', 'yacht club'],
  belgium: ['Manneken Pis', 'speculoos', 'comic strip', 'Trappist abbey', 'saxophone', 'diamond district'],
  netherlands: ['polder', 'stroopwafel', 'Kinderdijk', 'Delta Works', "King's Day", 'Delftware'],
  luxembourg: ['Bock Casemates', 'Schengen', 'Grand Duke', 'Moselle Valley', 'fortified old town', 'multilingualism'],
  switzerland: ['Bernese Oberland', 'raclette', 'canton', 'yodel', 'Glacier Express', 'edelweiss'],
  liechtenstein: ['Gutenberg Castle', 'Kunstmuseum', 'Rhine Valley', 'princely family', 'alpine pasture', 'double-landlocked'],
  germany: ['Neuschwanstein', 'currywurst', 'Black Forest', 'Bundestag', 'Bauhaus', 'Christmas market'],
  denmark: ['smorrebrod', 'Nyhavn', 'Jutland', 'runestone', 'modernist furniture', 'cinnamon roll'],
  norway: ['stave church', 'Trolltunga', 'brown cheese', 'Lofoten Islands', 'polar night', 'bunad'],
  sweden: ['Dala horse', 'midsummer pole', 'archipelago', 'Nobel Prize', 'cinnamon bun', 'ice hotel'],
  finland: ['sisu', 'Lakeland', 'Moomin', 'salmiakki', 'midnight sun', 'design district'],
  estonia: ['e-residency', 'Singing Revolution', 'bog walk', 'Saaremaa', 'medieval city wall', 'black bread'],
  latvia: ['Rundale Palace', 'midsummer wreath', 'Riga Black Balsam', 'Daugava River', 'song festival', 'grey peas'],
  lithuania: ['Hill of Crosses', 'Curonian Spit', 'cepelinai', 'Gediminas Tower', 'pagan heritage', 'rye bread'],
  poland: ['Wieliczka Salt Mine', 'obwarzanek', 'Solidarity movement', 'amber coast', 'Bialowieza Forest', 'mazurka'],
  czechia: ['Bohemian glass', 'pilsner', 'Kafka', 'spa colonnade', 'marionette', 'Moravian wine'],
  austria: ['Schonbrunn Palace', 'Sachertorte', 'coffeehouse', 'Spanish Riding School', 'alpine chalet', 'opera ball'],
  slovakia: ['Spis Castle', 'bryndza cheese', 'High Tatras', 'folk embroidery', 'ice cave', 'wooden church'],
  hungary: ['paprika', 'ruin bar', 'Puszta', 'Tokaji wine', 'Chain Bridge', 'thermal spring'],
  slovenia: ['Postojna Cave', 'Lipizzaner', 'beehive panel', 'karst landscape', 'potica', 'Soca River'],
  italy: ['white truffle', 'gondolier', 'Renaissance', 'limoncello', 'Vespa', 'opera house'],
  'san-marino': ['Guaita Tower', 'Cesta Tower', 'crossbow corps', 'Mount Titano', 'medieval republic', 'postage stamp'],
  'vatican-city': ['Swiss Guard', 'papal conclave', 'Pieta', 'papal audience', 'Raphael Rooms', 'Apostolic Palace'],
  malta: ['megalithic temple', 'luzzu boat', 'Mdina', 'eight-pointed cross', 'pastizzi', 'Hypogeum'],
  croatia: ['Plitvice Lakes', 'cravat', 'Istrian truffle', 'klapa singing', "Diocletian's Palace", 'bora wind'],
  'bosnia-herzegovina': ['cevapi', 'Sebilj fountain', 'stecak tombstone', 'copper coffee set', 'Bascarsija', 'Neretva River'],
  serbia: ['slava celebration', 'rakija', 'gusle', 'Nikola Tesla', 'Exit Festival', 'plum brandy'],
  montenegro: ['Durmitor', 'black mountain', 'Njegusi ham', 'Ostrog Monastery', 'Tara Canyon', 'Venetian walls'],
  albania: ['iso-polyphony', 'Skanderbeg', 'Berat windows', 'Blue Eye spring', 'byrek', 'Ionian Riviera'],
  kosovo: ['Newborn Monument', 'Rugova Canyon', 'filigree', 'qebapa', 'Ottoman bazaar', 'Sharr Mountains'],
  'north-macedonia': ['ajvar', 'Matka Canyon', 'Cyrillic script', 'Stone Bridge', 'Ohrid pearl', 'tavce gravce'],
  greece: ['Meteora', 'ouzo', 'Delphi oracle', 'moussaka', 'Cyclades', 'olive wreath'],
  bulgaria: ['Cyrillic alphabet', 'banitsa', 'Rila Monastery', 'kukeri mask', 'Thracian tomb', 'Shopska salad'],
  romania: ['painted monastery', 'Carpathian shepherd', 'Sighisoara', 'Danube Delta', 'Maramures gate', 'Palace of Parliament'],
  moldova: ['Cricova tunnels', 'mamaliga', 'Orheiul Vechi', 'walnut orchard', 'woven carpet', 'Dniester River'],
  ukraine: ['pysanka', 'vyshyvanka', 'bandura', 'golden domes', 'Cossack', 'varenyky'],
  belarus: ['Mir Castle', 'linen weaving', 'draniki', 'Naliboki Forest', 'blue lakes', 'straw weaving'],
  russia: ['Hermitage Museum', 'Trans-Siberian Railway', 'samovar', 'balalaika', 'White Nights', 'onion dome'],
  kazakhstan: ['eagle hunter', 'dombra', 'Charyn Canyon', 'kumis', 'space launch', 'felt yurt'],
  georgia: ['supra feast', 'qvevri', 'Svan tower', 'polyphonic singing', 'churchkhela', 'sulfur bath'],
  armenia: ['khachkar', 'duduk', 'lavash', 'Geghard Monastery', 'brandy distillery', 'tuff stone'],
  azerbaijan: ['mud volcano', 'mugham', 'pomegranate', 'Maiden Tower', 'pear-shaped tea glass', 'fire temple'],
  turkey: ['whirling dervish', 'evil eye', 'hammam', 'Bosphorus', 'lokum', 'Cappadocia'],
  cyprus: ['Commandaria', 'lace village', 'mouflon', 'copper mine', 'divided capital', 'mezze'],
};

const getCountryWordChallenge = (countryId) => {
  const words = COUNTRY_WORDS[countryId];
  if (!words) return null;

  return {
    id: 'guess-country-word',
    type: 'countryWordGuess',
    title: 'Guess the Country Word',
    prompt: 'One player explains a secret country-themed word while their team tries to guess it.',
    penalty: 'Guess it within 30 seconds to earn 10 points.',
    penaltyTag: '10 PTS',
    durationSeconds: 30,
    successPoints: 10,
    wordListVersion: 2,
    words,
  };
};

const ensureCountryWordChallenge = (countryId, challenges) => {
  const countryWordChallenge = getCountryWordChallenge(countryId);
  if (!countryWordChallenge) return challenges;
  return [
    ...challenges.filter((item) => (
      item?.id !== countryWordChallenge.id && item?.type !== countryWordChallenge.type
    )),
    countryWordChallenge,
  ];
};

const stop = ({ accent, challenge: stopChallenge, city, code, id, name, sourcePosition }, order) => ({
  id,
  name,
  code,
  city,
  order,
  position: position(...sourcePosition),
  positionVersion: COUNTRY_POSITION_VERSION,
  accent,
  challenges: stopChallenge,
});

// Inclusive 51-country catalogue: sovereign states wholly or partly in Europe,
// plus Kosovo. The ordering follows a geographically coherent west-to-east
// road-trip route and keeps every country exactly once.
const EUROPE_COUNTRIES = [
  { id: 'iceland', name: 'Iceland', code: 'IS', city: 'Reykjavik', longitude: -21.9426, latitude: 64.1466, sourcePosition: [457, 243], accent: '#2f80ed', challenge: challenge('saga-in-six', 'Saga in Six', 'Tell an epic travel saga in exactly six words.') },
  { id: 'ireland', name: 'Ireland', code: 'IE', city: 'Dublin', longitude: -6.2603, latitude: 53.3498, sourcePosition: [499, 289], accent: '#27ae60', challenge: challenge('rhyme-time', 'Rhyme Time', 'Take turns naming words that rhyme with road. First repeat or pause ends the round.') },
  { id: 'united-kingdom', name: 'United Kingdom', code: 'GB', city: 'London', longitude: -0.1276, latitude: 51.5072, sourcePosition: [518, 294], accent: '#d71920', challenge: challenge('royal-announcement', 'Royal Announcement', 'Announce the next team like a royal herald without laughing.') },
  { id: 'portugal', name: 'Portugal', code: 'PT', city: 'Lisbon', longitude: -9.1393, latitude: 38.7223, sourcePosition: [490, 340], accent: '#27ae60', challenge: challenge('fado-face-off', 'Fado Face-Off', 'Give a dramatic 10-second performance about missing the last train.') },
  { id: 'spain', name: 'Spain', code: 'ES', city: 'Madrid', longitude: -3.7038, latitude: 40.4168, sourcePosition: [515, 337], accent: '#f2c94c', challenge: challenge('tapas-tempo', 'Tapas Tempo', 'Name three Spanish dishes before the other team counts down from five.') },
  { id: 'andorra', name: 'Andorra', code: 'AD', city: 'Andorra la Vella', longitude: 1.5218, latitude: 42.5063, sourcePosition: [528, 329], accent: '#2f80ed', challenge: challenge('mountain-echo', 'Mountain Echo', 'Create a three-sound mountain call; every teammate must echo it perfectly.') },
  { id: 'france', name: 'France', code: 'FR', city: 'Paris', longitude: 2.3522, latitude: 48.8566, sourcePosition: [532, 309], accent: '#d71920', challenge: challenge('cafe-charades', 'Cafe Charades', 'Act out ordering a fancy café drink without using words.') },
  { id: 'monaco', name: 'Monaco', code: 'MC', city: 'Monaco', longitude: 7.4246, latitude: 43.7384, sourcePosition: [548, 329], accent: '#eb5757', challenge: challenge('grand-prix-pitstop', 'Grand Prix Pitstop', 'Mime a lightning-fast tyre change with your whole team in 10 seconds.') },
  { id: 'belgium', name: 'Belgium', code: 'BE', city: 'Brussels', longitude: 4.3517, latitude: 50.8503, sourcePosition: [531, 303], accent: '#1ba39c', challenge: challenge('trappist-toast', 'Grand Toast', 'Make a grand toast to the whole table in your best royal voice.') },
  { id: 'netherlands', name: 'Netherlands', code: 'NL', city: 'Amsterdam', longitude: 4.9041, latitude: 52.3676, sourcePosition: [534, 297], accent: '#f2994a', challenge: challenge('canal-balance', 'Canal Balance', 'Balance a coaster on your head for 15 seconds while naming three Dutch cities.') },
  { id: 'luxembourg', name: 'Luxembourg', code: 'LU', city: 'Luxembourg City', longitude: 6.1319, latitude: 49.6116, sourcePosition: [535, 308], accent: '#2f80ed', challenge: challenge('tiny-country-big-story', 'Tiny Country, Big Story', 'Invent a 15-second legend about the smallest kingdom on the route.') },
  { id: 'switzerland', name: 'Switzerland', code: 'CH', city: 'Bern', longitude: 7.4474, latitude: 46.948, sourcePosition: [542, 319], accent: '#eb5757', challenge: challenge('clockwork-team', 'Clockwork Team', 'Make a human clock and tick in sync for 10 seconds.') },
  { id: 'liechtenstein', name: 'Liechtenstein', code: 'LI', city: 'Vaduz', longitude: 9.5215, latitude: 47.141, sourcePosition: [550, 317], accent: '#2f80ed', challenge: challenge('postcard-pitch', 'Postcard Pitch', 'Sell the table a holiday in Liechtenstein using only three sentences.') },
  { id: 'germany', name: 'Germany', code: 'DE', city: 'Berlin', longitude: 13.405, latitude: 52.52, sourcePosition: [552, 301], accent: '#f2994a', challenge: challenge('autobahn-answers', 'Autobahn Answers', 'Name two German cities and one German food in 8 seconds.') },
  { id: 'denmark', name: 'Denmark', code: 'DK', city: 'Copenhagen', longitude: 12.5683, latitude: 55.6761, sourcePosition: [550, 289], accent: '#d71920', challenge: challenge('hygge-huddle', 'Hygge Huddle', 'Give every player a one-word compliment before the timer reaches 15 seconds.') },
  { id: 'norway', name: 'Norway', code: 'NO', city: 'Oslo', longitude: 10.7522, latitude: 59.9139, sourcePosition: [560, 282], accent: '#2f80ed', challenge: challenge('fjord-freeze', 'Fjord Freeze', 'Hold your best windswept explorer pose for 15 seconds.') },
  { id: 'sweden', name: 'Sweden', code: 'SE', city: 'Stockholm', longitude: 18.0686, latitude: 59.3293, sourcePosition: [582, 280], accent: '#f2c94c', challenge: challenge('flat-pack', 'Flat-Pack', 'One player describes a pose like furniture instructions; the team must build it.') },
  { id: 'finland', name: 'Finland', code: 'FI', city: 'Helsinki', longitude: 24.9384, latitude: 60.1699, sourcePosition: [591, 282], accent: '#2f80ed', challenge: challenge('sauna-stillness', 'Sauna Stillness', 'Stay completely silent and still while the other team tries to make you laugh for 15 seconds.') },
  { id: 'estonia', name: 'Estonia', code: 'EE', city: 'Tallinn', longitude: 24.7536, latitude: 59.437, sourcePosition: [594, 286], accent: '#2f80ed', challenge: challenge('digital-pantomime', 'Digital Pantomime', 'Mime a phone app while your team guesses it in 15 seconds.') },
  { id: 'latvia', name: 'Latvia', code: 'LV', city: 'Riga', longitude: 24.1052, latitude: 56.9496, sourcePosition: [590, 291], accent: '#9b51e0', challenge: challenge('riga-rhythm', 'Riga Rhythm', 'Build a four-beat table rhythm and pass it around without a mistake.') },
  { id: 'lithuania', name: 'Lithuania', code: 'LT', city: 'Vilnius', longitude: 25.2797, latitude: 54.6872, sourcePosition: [594, 298], accent: '#27ae60', challenge: challenge('amber-memory', 'Amber Memory', 'Repeat the growing packing list; add one travel item each turn.') },
  { id: 'poland', name: 'Poland', code: 'PL', city: 'Warsaw', longitude: 21.0122, latitude: 52.2297, sourcePosition: [575, 307], accent: '#eb5757', challenge: challenge('pierogi-pitch', 'Pierogi Pitch', 'Invent a new dumpling filling and pitch it to the table like a chef.') },
  { id: 'czechia', name: 'Czechia', code: 'CZ', city: 'Prague', longitude: 14.4378, latitude: 50.0755, sourcePosition: [556, 315], accent: '#2f80ed', challenge: challenge('prague-statue', 'Prague Statue', 'Freeze like a bridge statue while your team copies your pose.') },
  { id: 'austria', name: 'Austria', code: 'AT', city: 'Vienna', longitude: 16.3738, latitude: 48.2082, sourcePosition: [563, 322], accent: '#d71920', challenge: challenge('waltz-count', 'Waltz Count', 'Your team must clap a clean one-two-three waltz rhythm for 15 seconds.') },
  { id: 'slovakia', name: 'Slovakia', code: 'SK', city: 'Bratislava', longitude: 17.1077, latitude: 48.1486, sourcePosition: [566, 323], accent: '#2f80ed', challenge: challenge('castle-caption', 'Castle Caption', 'Give an imaginary castle photo the funniest caption at the table.') },
  { id: 'hungary', name: 'Hungary', code: 'HU', city: 'Budapest', longitude: 19.0402, latitude: 47.4979, sourcePosition: [571, 326], accent: '#27ae60', challenge: challenge('danube-duet', 'Danube Duet', 'Two teammates narrate the same boat trip, alternating one word at a time.') },
  { id: 'slovenia', name: 'Slovenia', code: 'SI', city: 'Ljubljana', longitude: 14.5058, latitude: 46.0569, sourcePosition: [558, 330], accent: '#2f80ed', challenge: challenge('dragon-director', 'Dragon Director', 'Direct the team into a silent dragon pose in 15 seconds.') },
  { id: 'italy', name: 'Italy', code: 'IT', city: 'Rome', longitude: 12.4964, latitude: 41.9028, sourcePosition: [552, 346], accent: '#2f80ed', challenge: challenge('pasta-pitch', 'Pasta Pitch', 'Invent a pasta dish and sell it like a luxury commercial.') },
  { id: 'san-marino', name: 'San Marino', code: 'SM', city: 'San Marino', longitude: 12.4578, latitude: 43.9424, sourcePosition: [558, 338], accent: '#6fcf97', challenge: challenge('three-towers', 'Three Towers', 'Stack three safe table items and keep the tower standing for 10 seconds.') },
  { id: 'vatican-city', name: 'Vatican City', code: 'VA', city: 'Vatican City', longitude: 12.4534, latitude: 41.9029, sourcePosition: [550, 348], accent: '#f2c94c', challenge: challenge('ceiling-masterpiece', 'Ceiling Masterpiece', 'Air-paint a masterpiece overhead while your team guesses the subject.') },
  { id: 'malta', name: 'Malta', code: 'MT', city: 'Valletta', longitude: 14.5146, latitude: 35.8989, sourcePosition: [560, 369], accent: '#eb5757', challenge: challenge('harbour-master', 'Harbour Master', 'Guide a blindfold-free teammate to a coaster using only nautical directions.') },
  { id: 'croatia', name: 'Croatia', code: 'HR', city: 'Zagreb', longitude: 15.9819, latitude: 45.815, sourcePosition: [562, 333], accent: '#2f80ed', challenge: challenge('coastline-countdown', 'Coastline Countdown', 'Name five things you would pack for an island trip in 8 seconds.') },
  { id: 'bosnia-herzegovina', name: 'Bosnia and Herzegovina', code: 'BA', city: 'Sarajevo', longitude: 18.4131, latitude: 43.8563, sourcePosition: [569, 340], accent: '#2f80ed', challenge: challenge('bridge-story', 'Bridge Story', 'Connect two random words chosen by the table in one convincing story.') },
  { id: 'serbia', name: 'Serbia', code: 'RS', city: 'Belgrade', longitude: 20.4489, latitude: 44.7866, sourcePosition: [577, 336], accent: '#d71920', challenge: challenge('fortress-faceoff', 'Fortress Face-Off', 'Play best-of-three rock paper scissors with dramatic battle commentary.') },
  { id: 'montenegro', name: 'Montenegro', code: 'ME', city: 'Podgorica', longitude: 19.2594, latitude: 42.4304, sourcePosition: [576, 346], accent: '#f2994a', challenge: challenge('mountain-line', 'Mountain Line', 'Arrange the team from shortest to tallest without speaking.') },
  { id: 'albania', name: 'Albania', code: 'AL', city: 'Tirana', longitude: 19.8187, latitude: 41.3275, sourcePosition: [580, 351], accent: '#d71920', challenge: challenge('eagle-pose', 'Eagle Pose', 'Create a two-person eagle silhouette and hold it for 10 seconds.') },
  { id: 'kosovo', name: 'Kosovo', code: 'XK', city: 'Pristina', longitude: 21.1655, latitude: 42.6629, sourcePosition: [583, 346], accent: '#2f80ed', challenge: challenge('newborn-slogan', 'Newborn Slogan', 'Invent a bold tourism slogan and deliver it together.') },
  { id: 'north-macedonia', name: 'North Macedonia', code: 'MK', city: 'Skopje', longitude: 21.4316, latitude: 41.9981, sourcePosition: [585, 352], accent: '#f2c94c', challenge: challenge('lake-echo', 'Lake Echo', 'Whisper a phrase around the team once; compare the final version with the original.') },
  { id: 'greece', name: 'Greece', code: 'GR', city: 'Athens', longitude: 23.7275, latitude: 37.9838, sourcePosition: [589, 359], accent: '#2f80ed', challenge: challenge('oracle-says', 'Oracle Says', 'Predict what the next player will roll and explain your prophecy dramatically.') },
  { id: 'bulgaria', name: 'Bulgaria', code: 'BG', city: 'Sofia', longitude: 23.3219, latitude: 42.6977, sourcePosition: [592, 349], accent: '#27ae60', challenge: challenge('rose-relay', 'Rose Relay', 'Pass an imaginary rose around; each player adds a new scent description.') },
  { id: 'romania', name: 'Romania', code: 'RO', city: 'Bucharest', longitude: 26.1025, latitude: 44.4268, sourcePosition: [600, 340], accent: '#f2c94c', challenge: challenge('castle-shadow', 'Castle Shadow', 'Make a spooky hand shadow while the team guesses the creature.') },
  { id: 'moldova', name: 'Moldova', code: 'MD', city: 'Chisinau', longitude: 28.8353, latitude: 47.0105, sourcePosition: [608, 331], accent: '#2f80ed', challenge: challenge('cellar-secret', 'Cellar Secret', 'Share a harmless hidden talent or demonstrate it for the table.') },
  { id: 'ukraine', name: 'Ukraine', code: 'UA', city: 'Kyiv', longitude: 30.5234, latitude: 50.4501, sourcePosition: [616, 313], accent: '#f2c94c', challenge: challenge('sunflower-circle', 'Sunflower Circle', 'Each teammate turns toward the next like a sunflower wave; complete two clean laps.') },
  { id: 'belarus', name: 'Belarus', code: 'BY', city: 'Minsk', longitude: 27.5615, latitude: 53.9045, sourcePosition: [597, 301], accent: '#27ae60', challenge: challenge('forest-soundscape', 'Forest Soundscape', 'Build a forest soundscape one teammate at a time and hold it for 10 seconds.') },
  { id: 'russia', name: 'Russia', code: 'RU', city: 'Moscow', longitude: 37.6173, latitude: 55.7558, sourcePosition: [625, 290], accent: '#d71920', challenge: challenge('one-word-epic', 'One-Word Epic', 'Tell an epic winter journey one word per player without breaking the sentence.') },
  { id: 'kazakhstan', name: 'Kazakhstan', code: 'KZ', city: 'Astana', longitude: 71.4304, latitude: 51.1282, sourcePosition: [676, 320], accent: '#2f80ed', challenge: challenge('steppe-stare', 'Steppe Stare', 'Face another player in a silent stare-off for 15 seconds.') },
  { id: 'georgia', name: 'Georgia', code: 'GE', city: 'Tbilisi', longitude: 44.8271, latitude: 41.7151, sourcePosition: [636, 347], accent: '#eb5757', challenge: challenge('table-toast', 'Table Toast', 'Give a warm 10-second toast that mentions every team.') },
  { id: 'armenia', name: 'Armenia', code: 'AM', city: 'Yerevan', longitude: 44.5152, latitude: 40.1872, sourcePosition: [640, 355], accent: '#f2994a', challenge: challenge('apricot-advert', 'Apricot Advert', 'Create a five-second luxury advert for an apricot.') },
  { id: 'azerbaijan', name: 'Azerbaijan', code: 'AZ', city: 'Baku', longitude: 49.8671, latitude: 40.4093, sourcePosition: [653, 355], accent: '#1ba39c', challenge: challenge('flame-freeze', 'Flame Freeze', 'Make a team flame sculpture and hold it perfectly still for 10 seconds.') },
  { id: 'turkey', name: 'Turkey', code: 'TR', city: 'Istanbul', longitude: 28.9784, latitude: 41.0082, sourcePosition: [592, 351], accent: '#d71920', challenge: challenge('bazaar-barter', 'Bazaar Barter', 'Trade an imaginary object with another player using only gestures.') },
  { id: 'cyprus', name: 'Cyprus', code: 'CY', city: 'Nicosia', longitude: 33.3823, latitude: 35.1856, sourcePosition: [610, 369], accent: '#f2994a', challenge: challenge('island-finale', 'Island Finale', 'Create a team postcard pose and hold it while the table counts to five.') },
];

export const DEFAULT_COUNTRY_STOPS = EUROPE_COUNTRIES.map(stop).map((countryStop) => ({
  ...countryStop,
  challenges: ensureCountryWordChallenge(countryStop.id, countryStop.challenges),
}));
const DEFAULT_COUNTRY_STOP_BY_ID = new Map(DEFAULT_COUNTRY_STOPS.map((countryStop) => [
  countryStop.id,
  countryStop,
]));

const toList = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value && typeof value === 'object') return Object.values(value).filter(Boolean);
  return [];
};

const LEGACY_ROUTE_IDS = new Set(['belgium-start', 'spain-north', 'spain-south', 'belgium-finish']);
const LEGACY_VIEWPORT = {
  minU: 445 / 1096,
  maxU: 620 / 1096,
  minV: 248 / 780,
  maxV: 379 / 780,
};

export const isLegacyCountryCatalogue = (value) => {
  const ids = new Set(toList(value).map(({ id }) => id));
  return [...LEGACY_ROUTE_IDS].some((id) => ids.has(id));
};

const remapLegacyPosition = ({ x, y }) => {
  const legacyWidth = LEGACY_VIEWPORT.maxU - LEGACY_VIEWPORT.minU;
  const legacyHeight = LEGACY_VIEWPORT.maxV - LEGACY_VIEWPORT.minV;
  const legacyCenterU = (LEGACY_VIEWPORT.minU + LEGACY_VIEWPORT.maxU) / 2;
  const legacyCenterV = (LEGACY_VIEWPORT.minV + LEGACY_VIEWPORT.maxV) / 2;
  const sourceU = (x / MAP_W) * legacyWidth + legacyCenterU;
  const sourceV = legacyCenterV - ((y - MAP_CY) / MAP_H) * legacyHeight;
  const point = uv(sourceU, sourceV);
  return { x: point.x, y: point.y };
};

export const normalizeCountryStops = (value) => {
  const source = toList(value);
  const stops = source.length >= 2 ? source : DEFAULT_COUNTRY_STOPS;
  return stops.map((stop, index) => {
    const normalized = {
      id: String(stop.id || `stop-${index}`),
      name: String(stop.name || `Stop ${index + 1}`),
      order: Number.isFinite(Number(stop.order)) ? Number(stop.order) : index,
      position: { x: Number(stop.position?.x) || 0, y: Number(stop.position?.y) || 0 },
      accent: stop.accent || '#1ba39c',
      challenges: ensureCountryWordChallenge(
        String(stop.id || `stop-${index}`),
        toList(stop.challenges).map((challenge, challengeIndex) => ({
          id: String(challenge.id || `challenge-${challengeIndex}`),
          title: String(challenge.title || 'Border Check'),
          prompt: String(challenge.prompt || 'Tell the table why your team stopped here.'),
          penalty: String(challenge.penalty || 'Take 1 sip if the table is not convinced.'),
          ...(challenge.type ? { type: String(challenge.type) } : {}),
          ...(challenge.penaltyTag ? { penaltyTag: String(challenge.penaltyTag) } : {}),
          ...(Number.isFinite(Number(challenge.durationSeconds))
            ? { durationSeconds: Number(challenge.durationSeconds) }
            : {}),
          ...(Number.isFinite(Number(challenge.successPoints))
            ? { successPoints: Number(challenge.successPoints) }
            : {}),
          ...(Number.isFinite(Number(challenge.wordListVersion))
            ? { wordListVersion: Number(challenge.wordListVersion) }
            : {}),
          ...(Array.isArray(challenge.words)
            ? { words: challenge.words.map(String).filter(Boolean) }
            : {}),
        }))
      ),
    };

    if (stop.code) {
      normalized.code = String(stop.code).toUpperCase().slice(0, 3);
    }
    if (stop.city) {
      normalized.city = String(stop.city);
    }
    if (stop.landmark) {
      normalized.landmark = String(stop.landmark);
    }
    if (Number.isFinite(Number(stop.positionVersion))) {
      normalized.positionVersion = Number(stop.positionVersion);
    }
    if (Number.isFinite(Number(stop.updatedAt))) {
      normalized.updatedAt = Number(stop.updatedAt);
    }

    return normalized;
  }).sort((left, right) => left.order - right.order)
    .map((stop, index) => ({ ...stop, order: index }));
};

export const applyCurrentDefaultPositions = (value) => normalizeCountryStops(value).map((stop) => {
  const defaultStop = DEFAULT_COUNTRY_STOP_BY_ID.get(stop.id);
  if (!defaultStop || stop.positionVersion === COUNTRY_POSITION_VERSION) return stop;

  return {
    ...stop,
    position: { ...defaultStop.position },
    positionVersion: COUNTRY_POSITION_VERSION,
  };
});

export const getStopsForDuration = (stops, duration = 'long', random = Math.random) => {
  const normalized = normalizeCountryStops(stops);
  const stopCount = DURATION_STOP_COUNTS[duration] || DURATION_STOP_COUNTS.long;
  const intermediateCount = stopCount - 2;
  const availableIds = new Set(normalized.map(({ id }) => id));
  const availableCorridors = ROUTE_CORRIDORS
    .map((corridor) => corridor.filter((id) => availableIds.has(id)))
    .filter((corridor) => corridor.length >= intermediateCount);
  const routeCorridors = availableCorridors.length > 0 ? availableCorridors : ROUTE_CORRIDORS;
  const corridorIndex = Math.min(
    routeCorridors.length - 1,
    Math.floor(random() * routeCorridors.length)
  );
  const corridor = routeCorridors[corridorIndex];
  const intermediateIds = Array.from({ length: intermediateCount }, (_, index) => {
    const segmentStart = Math.floor((index * corridor.length) / intermediateCount);
    const segmentEnd = Math.max(
      segmentStart,
      Math.floor(((index + 1) * corridor.length) / intermediateCount) - 1
    );
    const offset = Math.floor(random() * (segmentEnd - segmentStart + 1));
    return corridor[Math.min(segmentEnd, segmentStart + offset)];
  });
  const routeIds = ['belgium', ...intermediateIds, 'greece'];
  const authoredById = new Map(normalized.map((countryStop) => [countryStop.id, countryStop]));

  return routeIds.map((id, index) => ({
    ...(authoredById.get(id) || DEFAULT_COUNTRY_STOP_BY_ID.get(id)),
    order: index,
  }));
};

export const mergeRouteStopsWithCatalogue = (routeStops, catalogueStops) => {
  const route = normalizeCountryStops(routeStops);
  const catalogueById = new Map(
    normalizeCountryStops(catalogueStops).map((countryStop) => [countryStop.id, countryStop])
  );

  return route.map((routeStop, index) => ({
    ...routeStop,
    ...(catalogueById.get(routeStop.id) || {}),
    order: index,
  }));
};

export const resolveGameRouteStops = (gameData = {}) => (
  applyCurrentDefaultPositions(gameData.routeStops || DEFAULT_COUNTRY_STOPS)
    .map((stop, _index, stops) => (
      stops.some(({ id }) => LEGACY_ROUTE_IDS.has(id))
        ? { ...stop, position: remapLegacyPosition(stop.position) }
        : stop
    ))
);

