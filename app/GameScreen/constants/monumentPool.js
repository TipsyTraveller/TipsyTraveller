import { MAP_CY, MAP_H, MAP_W, svgPoint } from './mapCoordinates.js';
import { EUROPE_SVG_VIEWBOX } from './europeMapPaths.js';

export const MONUMENT_POOL_VERSION = 3;
export const MONUMENT_POOL_DOC_ID = 'monumentPool';
export const GEO_GUESSR_CHALLENGE_ID = 'geo-guessr-duel';
export const GEO_GUESSR_CHALLENGE_TYPE = 'geoGuessr';
export const GEO_GUESSR_PHOTO_SECONDS = 18;
export const GEO_GUESSR_PIN_SECONDS = 20;
export const GEO_GUESSR_SUCCESS_POINTS = 15;

// Approximate conversion between board units (20x15 Europe viewport) and real-world km.
const KM_PER_BOARD_UNIT = 285;

// Keep the legacy monument naming in the stored shape for multiplayer compatibility,
// while classifying broader views so the duel can alternate between landmarks and places.
const PLACE_SCENE_IDS = new Set([
  'mc-monte-carlo-casino',
  'nl-kinderdijk',
  'dk-nyhavn',
  'no-bryggen-bergen',
  'se-turning-torso',
  'ee-tallinn-old-town',
  'cz-charles-bridge',
  'it-rialto-bridge',
  'va-st-peters-basilica',
  'al-berat-windows',
]);
const PLACE_SCENE_CATEGORIES = new Set(['mountain', 'coast']);

const getSubjectType = ({ id, category, subjectType }) => {
  if (subjectType === 'place' || subjectType === 'landmark') return subjectType;
  return PLACE_SCENE_IDS.has(id) || PLACE_SCENE_CATEGORIES.has(category)
    ? 'place'
    : 'landmark';
};

const toBoardPosition = (svgX, svgY) => {
  const pt = svgPoint(svgX, svgY);
  return {
    x: Number(pt.x.toFixed(2)),
    y: Number(pt.y.toFixed(2)),
  };
};

export const GEO_GUESSR_IMAGE_HEADERS = Object.freeze({
  'User-Agent': 'TipsyTraveller/1.0 (https://github.com/nielspeters/TipsyTraveller; contact@tipsytraveller.app)',
  Accept: 'image/jpeg,image/png,image/*;q=0.8,*/*;q=0.5',
});

const photoDataUriCache = new Map();

export const getCachedMonumentPhotoDataUri = (imageUrl) => {
  const normalized = normalizeMonumentImageUrl(imageUrl);
  return normalized ? photoDataUriCache.get(normalized) || null : null;
};

export const loadMonumentPhotoDataUri = async (imageUrl, { signal } = {}) => {
  const normalizedUrl = normalizeMonumentImageUrl(imageUrl);
  if (!normalizedUrl) return null;

  const cached = photoDataUriCache.get(normalizedUrl);
  if (cached) return cached;

  const response = await fetch(normalizedUrl, {
    headers: GEO_GUESSR_IMAGE_HEADERS,
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const blob = await response.blob();
  const dataUri = await new Promise((resolve, reject) => {
    if (typeof FileReader !== 'undefined') {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read photo blob as data URI'));
        }
      };
      reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
      reader.readAsDataURL(blob);
    } else {
      blob.arrayBuffer()
        .then((buffer) => {
          const base64 = Buffer.from(buffer).toString('base64');
          resolve(`data:${blob.type || 'image/jpeg'};base64,${base64}`);
        })
        .catch(reject);
    }
  });

  photoDataUriCache.set(normalizedUrl, dataUri);
  return dataUri;
};

export const normalizeMonumentImageUrl = (imageUrl) => String(imageUrl || '')
  .trim()
  .replace(/^http:\/\//i, 'https://')
  .replace('https://thumb.wikimedia.org/', 'https://upload.wikimedia.org/');

export const boardToNormalizedMap = (position) => {
  const x = Number(position?.x) || 0;
  const y = Number(position?.y) || 0;
  return {
    normX: Math.max(0.02, Math.min(0.98, (x + MAP_W / 2) / MAP_W)),
    normY: Math.max(0.02, Math.min(0.98, (MAP_CY + MAP_H / 2 - y) / MAP_H)),
  };
};

export const normalizedMapToBoard = (normXOrObj, maybeNormY) => {
  const normX = typeof normXOrObj === 'object' && normXOrObj !== null
    ? normXOrObj.normX
    : normXOrObj;
  const normY = typeof normXOrObj === 'object' && normXOrObj !== null
    ? normXOrObj.normY
    : maybeNormY;
  const clampedX = Math.max(0.02, Math.min(0.98, Number(normX) || 0.5));
  const clampedY = Math.max(0.02, Math.min(0.98, Number(normY) || 0.5));
  return {
    x: Number((clampedX * MAP_W - MAP_W / 2).toFixed(2)),
    y: Number((MAP_CY + MAP_H / 2 - clampedY * MAP_H).toFixed(2)),
  };
};

export const boardToSvgCoords = (position) => {
  const { normX, normY } = boardToNormalizedMap(position);
  return {
    svgX: EUROPE_SVG_VIEWBOX.minX + normX * EUROPE_SVG_VIEWBOX.width,
    svgY: EUROPE_SVG_VIEWBOX.minY + normY * EUROPE_SVG_VIEWBOX.height,
  };
};

export const calculateBoardDistanceKm = (fromPosition, toPosition) => {
  if (!fromPosition || !toPosition) return 9999;
  const dx = (Number(fromPosition.x) || 0) - (Number(toPosition.x) || 0);
  const dy = (Number(fromPosition.y) || 0) - (Number(toPosition.y) || 0);
  return Math.max(5, Math.round(Math.hypot(dx, dy) * KM_PER_BOARD_UNIT));
};

const monument = ({
  id,
  countryId,
  countryName,
  city,
  name,
  clue,
  category,
  palette,
  svgPosition,
  imageUrl,
  imageSourceUrl,
  imageAuthor,
  imageLicense,
  photoSource,
  subjectType,
}) => ({
  id,
  countryId,
  countryName,
  city,
  name,
  clue,
  category: category || 'castle',
  palette: palette || ['#4A90E2', '#D9B382', '#2C3E50'],
  svgPosition,
  position: toBoardPosition(svgPosition[0], svgPosition[1]),
  imageUrl: normalizeMonumentImageUrl(imageUrl),
  imageSourceUrl,
  imageAuthor,
  imageLicense,
  photoSource,
  subjectType: getSubjectType({ id, category: category || 'castle', subjectType }),
});

// Comprehensive European photo-location pool covering all 51 countries in the catalogue,
// with a mix of landmarks, landscapes, waterfronts, villages, and city scenes.
export const DEFAULT_MONUMENT_POOL = [
  monument({
    id: 'is-hallgrimskirkja',
    countryId: 'iceland',
    countryName: 'Iceland',
    city: 'Reykjavik',
    name: 'Hallgrimskirkja',
    clue: 'Stepped concrete church tower inspired by volcanic basalt columns.',
    category: 'cathedral',
    palette: ['#5DA9E9', '#E5ECF4', '#2B3A4A'],
    svgPosition: [457, 243],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Hallgr%C3%ADmskirkja.jpeg/960px-Hallgr%C3%ADmskirkja.jpeg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Hallgr%C3%ADmskirkja.jpeg",
    imageAuthor: "Andreas Tille",
    imageLicense: "CC BY-SA 4.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'is-kirkjufell',
    countryId: 'iceland',
    countryName: 'Iceland',
    city: 'Grundarfjordur',
    name: 'Kirkjufell Mountain',
    clue: 'Conical coastal peak beside cascading sub-arctic waterfalls.',
    category: 'mountain',
    palette: ['#3F88C5', '#4E8752', '#1C3144'],
    svgPosition: [451, 239],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Kirkjufell%2C_Iceland%2C_20240714_1631_0713.jpg/960px-Kirkjufell%2C_Iceland%2C_20240714_1631_0713.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Kirkjufell,_Iceland,_20240714_1631_0713.jpg",
    imageAuthor: "Jakub Ha\u0142un",
    imageLicense: "CC BY 4.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'ie-cliffs-of-moher',
    countryId: 'ireland',
    countryName: 'Ireland',
    city: 'County Clare',
    name: 'Cliffs of Moher',
    clue: 'Sheer emerald sea cliffs plunging into the North Atlantic.',
    category: 'coast',
    palette: ['#6EC6FF', '#2E7D32', '#37474F'],
    svgPosition: [493, 290],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Ireland_Cliffs_of_Moher_BW_2025-09-11_14-27-51.jpg/960px-Ireland_Cliffs_of_Moher_BW_2025-09-11_14-27-51.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Ireland_Cliffs_of_Moher_BW_2025-09-11_14-27-51.jpg",
    imageAuthor: "Berthold Werner",
    imageLicense: "CC BY-SA 4.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'ie-rock-of-cashel',
    countryId: 'ireland',
    countryName: 'Ireland',
    city: 'Tipperary',
    name: 'Rock of Cashel',
    clue: 'Medieval limestone fortress and round tower crowning a green hill.',
    category: 'castle',
    palette: ['#7FB3D5', '#45B39D', '#566573'],
    svgPosition: [497, 292],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Ireland_Rock_of_Cashel_BW_2025-09-14_15-39-31.jpg/960px-Ireland_Rock_of_Cashel_BW_2025-09-14_15-39-31.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Ireland_Rock_of_Cashel_BW_2025-09-14_15-39-31.jpg",
    imageAuthor: "Berthold Werner",
    imageLicense: "CC BY-SA 4.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'gb-tower-bridge',
    countryId: 'united-kingdom',
    countryName: 'United Kingdom',
    city: 'London',
    name: 'Tower Bridge',
    clue: 'Twin neo-Gothic river towers connected by high-level walkways and blue suspension chains.',
    category: 'bridge',
    palette: ['#64B5F6', '#D7CCC8', '#1E88E5'],
    svgPosition: [518, 294],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Tower_Bridge_London_Dusk_Feb_2006.jpg/960px-Tower_Bridge_London_Dusk_Feb_2006.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Tower_Bridge_London_Dusk_Feb_2006.jpg",
    imageAuthor: "Diliff",
    imageLicense: "CC BY-SA 3.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'gb-stonehenge',
    countryId: 'united-kingdom',
    countryName: 'United Kingdom',
    city: 'Wiltshire',
    name: 'Stonehenge',
    clue: 'Prehistoric ring of giant standing sarsen stones on a windswept plain.',
    category: 'ancient',
    palette: ['#FFCC80', '#7CB342', '#5D4037'],
    svgPosition: [512, 296],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Stonehenge_Heel_Stone.jpg/960px-Stonehenge_Heel_Stone.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Stonehenge_Heel_Stone.jpg",
    imageAuthor: "DeFacto",
    imageLicense: "CC BY-SA 4.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'gb-edinburgh-castle',
    countryId: 'united-kingdom',
    countryName: 'United Kingdom',
    city: 'Edinburgh',
    name: 'Edinburgh Castle',
    clue: 'Historic royal fortress perched atop an extinct volcanic crag.',
    category: 'castle',
    palette: ['#90CAF9', '#558B2F', '#455A64'],
    svgPosition: [511, 276],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Edinburgh_Castle_from_Grass_Market.jpg/960px-Edinburgh_Castle_from_Grass_Market.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Edinburgh_Castle_from_Grass_Market.jpg",
    imageAuthor: "George Washington Wilson / Adam Cuerden",
    imageLicense: "Public domain",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'pt-belem-tower',
    countryId: 'portugal',
    countryName: 'Portugal',
    city: 'Lisbon',
    name: 'Belem Tower',
    clue: 'Ornate limestone maritime bastion standing at the mouth of a wide estuary.',
    category: 'tower',
    palette: ['#4FC3F7', '#F5E6CA', '#0277BD'],
    svgPosition: [490, 340],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Torre_Bel%C3%A9m_April_2009-4a.jpg/960px-Torre_Bel%C3%A9m_April_2009-4a.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Torre_Bel%C3%A9m_April_2009-4a.jpg",
    imageAuthor: "Alvesgaspar",
    imageLicense: "CC BY-SA 3.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'pt-pena-palace',
    countryId: 'portugal',
    countryName: 'Portugal',
    city: 'Sintra',
    name: 'Pena Palace',
    clue: 'Vivid yellow-and-red Romanticist hilltop castle above coastal forests.',
    category: 'palace',
    palette: ['#81D4FA', '#FBC02D', '#D32F2F'],
    svgPosition: [489, 338],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Sintra_Portugal_Pal%C3%A1cio_da_Pena-01.jpg/960px-Sintra_Portugal_Pal%C3%A1cio_da_Pena-01.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Sintra_Portugal_Pal%C3%A1cio_da_Pena-01.jpg",
    imageAuthor: "CEphoto, Uwe Aranas",
    imageLicense: "CC BY-SA 3.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'es-sagrada-familia',
    countryId: 'spain',
    countryName: 'Spain',
    city: 'Barcelona',
    name: 'Sagrada Familia',
    clue: 'Towering honeycomb-like modernist basilica spires carved with organic stonework.',
    category: 'cathedral',
    palette: ['#64B5F6', '#E6C280', '#BF360C'],
    svgPosition: [529, 335],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Sagrada_Familia_March_2015-10a.jpg/960px-Sagrada_Familia_March_2015-10a.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Sagrada_Familia_March_2015-10a.jpg",
    imageAuthor: "Alvesgaspar",
    imageLicense: "CC BY-SA 4.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'es-alhambra',
    countryId: 'spain',
    countryName: 'Spain',
    city: 'Granada',
    name: 'The Alhambra',
    clue: 'Red-walled Moorish palace complex framed by cypress trees and snowy sierra peaks.',
    category: 'palace',
    palette: ['#90CAF9', '#D87A56', '#2E7D32'],
    svgPosition: [512, 348],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Pavillon_Cour_des_Lions_Alhambra_Granada_Spain.jpg/960px-Pavillon_Cour_des_Lions_Alhambra_Granada_Spain.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Pavillon_Cour_des_Lions_Alhambra_Granada_Spain.jpg",
    imageAuthor: "Jebulon",
    imageLicense: "CC0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'ad-sant-joan',
    countryId: 'andorra',
    countryName: 'Andorra',
    city: 'Canillo',
    name: 'Sant Joan de Caselles',
    clue: 'Fieldstone Romanesque mountain chapel with a slender square bell tower in the Pyrenees.',
    category: 'mountain',
    palette: ['#64B5F6', '#689F38', '#5D4037'],
    svgPosition: [528, 329],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Saint_John_church_in_Caselles_%288%29.jpg/960px-Saint_John_church_in_Caselles_%288%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Saint_John_church_in_Caselles_(8).jpg",
    imageAuthor: "Krzysztof Golik",
    imageLicense: "CC BY-SA 4.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'fr-mont-saint-michel',
    countryId: 'france',
    countryName: 'France',
    city: 'Normandy',
    name: 'Mont Saint-Michel',
    clue: 'Fortified tidal island village rising to a soaring abbey spire.',
    category: 'castle',
    palette: ['#81D4FA', '#FFE082', '#37474F'],
    svgPosition: [520, 309],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Mont_St_Michel_at_sunrise.jpg/960px-Mont_St_Michel_at_sunrise.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Mont_St_Michel_at_sunrise.jpg",
    imageAuthor: "Lynx1211",
    imageLicense: "CC BY-SA 4.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'fr-eiffel-tower',
    countryId: 'france',
    countryName: 'France',
    city: 'Paris',
    name: 'Eiffel Tower',
    clue: 'Wrought-iron lattice tower rising above haussmannian boulevards and a winding river.',
    category: 'tower',
    palette: ['#64B5F6', '#BCAAA4', '#4E342E'],
    svgPosition: [532, 309],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Tour_Eiffel_Wikimedia_Commons.jpg/960px-Tour_Eiffel_Wikimedia_Commons.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Tour_Eiffel_Wikimedia_Commons.jpg",
    imageAuthor: "Benh LIEU SONG",
    imageLicense: "Public domain",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'fr-pont-du-gard',
    countryId: 'france',
    countryName: 'France',
    city: 'Occitanie',
    name: 'Pont du Gard',
    clue: 'Three-tiered ancient Roman limestone aqueduct spanning a sunlit southern gorge.',
    category: 'bridge',
    palette: ['#4FC3F7', '#F4D06F', '#8D6E63'],
    svgPosition: [537, 325],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Pont_du_Gard_%2830%29.jpg/960px-Pont_du_Gard_%2830%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Pont_du_Gard_(30).jpg",
    imageAuthor: "Krzysztof Golik",
    imageLicense: "CC BY-SA 4.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'mc-monte-carlo-casino',
    countryId: 'monaco',
    countryName: 'Monaco',
    city: 'Monte Carlo',
    name: 'Place du Casino',
    clue: 'Belle Epoque marble facade surrounded by palm trees, supercars, and a yacht harbor.',
    category: 'palace',
    palette: ['#29B6F6', '#FFF59D', '#C62828'],
    svgPosition: [548, 329],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Real_Monte_Carlo_Casino.jpg/960px-Real_Monte_Carlo_Casino.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Real_Monte_Carlo_Casino.jpg",
    imageAuthor: "sam garza from Los Angeles, USA",
    imageLicense: "CC BY 2.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'be-atomium',
    countryId: 'belgium',
    countryName: 'Belgium',
    city: 'Brussels',
    name: 'The Atomium',
    clue: 'Nine giant stainless-steel spheres connected by diagonal tubes in a crystal lattice.',
    category: 'monument',
    palette: ['#42A5F5', '#CFD8DC', '#263238'],
    svgPosition: [531, 303],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Atomium%2C_Bruselas%2C_B%C3%A9lgica%2C_2021-12-15%2C_DD_148-150_HDR.jpg/960px-Atomium%2C_Bruselas%2C_B%C3%A9lgica%2C_2021-12-15%2C_DD_148-150_HDR.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Atomium,_Bruselas,_B%C3%A9lgica,_2021-12-15,_DD_148-150_HDR.jpg",
    imageAuthor: "Diego Delso",
    imageLicense: "CC BY-SA 4.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'be-bruges-belfry',
    countryId: 'belgium',
    countryName: 'Belgium',
    city: 'Bruges',
    name: 'Belfry of Bruges',
    clue: 'Stepped brick guildhalls and a towering medieval bell tower reflected in quiet canals.',
    category: 'tower',
    palette: ['#90CAF9', '#D7CCC8', '#A1887F'],
    svgPosition: [528, 301],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Bruges_Belgium_Belfry-02.jpg/960px-Bruges_Belgium_Belfry-02.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Bruges_Belgium_Belfry-02.jpg",
    imageAuthor: "CEphoto, Uwe Aranas",
    imageLicense: "CC BY-SA 3.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'nl-kinderdijk',
    countryId: 'netherlands',
    countryName: 'Netherlands',
    city: 'South Holland',
    name: 'Kinderdijk Windmills',
    clue: 'Row of historic wooden thatch-cap windmills lining a low-lying polder canal.',
    category: 'tower',
    palette: ['#81D4FA', '#8BC34A', '#5D4037'],
    svgPosition: [534, 297],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/The_windmills_of_Kinderdijk.JPG/960px-The_windmills_of_Kinderdijk.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:The_windmills_of_Kinderdijk.JPG",
    imageAuthor: "Tarod",
    imageLicense: "CC BY-SA 3.0 nl",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'lu-vianden-castle',
    countryId: 'luxembourg',
    countryName: 'Luxembourg',
    city: 'Vianden',
    name: 'Vianden Castle',
    clue: 'Slate-roofed Romanesque-Gothic palace fortress overlooking a wooded river valley.',
    category: 'castle',
    palette: ['#90CAF9', '#689F38', '#37474F'],
    svgPosition: [535, 308],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Vianden_chateau1.jpg/960px-Vianden_chateau1.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Vianden_chateau1.jpg",
    imageAuthor: "Palauenc05",
    imageLicense: "CC BY-SA 4.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'ch-chapel-bridge',
    countryId: 'switzerland',
    countryName: 'Switzerland',
    city: 'Lucerne',
    name: 'Kapellbrucke & Water Tower',
    clue: 'Covered wooden footbridge with flower boxes crossing a clear alpine lake beside an octagonal tower.',
    category: 'bridge',
    palette: ['#4FC3F7', '#A1887F', '#C62828'],
    svgPosition: [543, 318],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/CH.LU.Luzern_Kapellbr%C3%BCcke_01_16x9-R_16384x9216.jpg/960px-CH.LU.Luzern_Kapellbr%C3%BCcke_01_16x9-R_16384x9216.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:CH.LU.Luzern_Kapellbr%C3%BCcke_01_16x9-R_16384x9216.jpg",
    imageAuthor: "NOTE: This image is a panorama consisting of multiple frames that were merged or stitched in software. As a result, this image necessarily underwent some form of digital manipulation. These manipulations may include blending, blurring, cloning, and color and perspective adjustments. As a result of these adjustments, the image content may be slightly different from reality at the points where multiple images were combined. This manipulation is often required due to lens, perspective, and parallax distortions.",
    imageLicense: "CC BY-SA 4.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'ch-matterhorn',
    countryId: 'switzerland',
    countryName: 'Switzerland',
    city: 'Zermatt',
    name: 'The Matterhorn',
    clue: 'Chiseled four-faced pyramid peak towering above timber chalets.',
    category: 'mountain',
    palette: ['#42A5F5', '#ECEFF1', '#455A64'],
    svgPosition: [541, 322],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/CH.VS.Zermatt_2021-10-17_Matterhorn_8726.jpg/960px-CH.VS.Zermatt_2021-10-17_Matterhorn_8726.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:CH.VS.Zermatt_2021-10-17_Matterhorn_8726.jpg",
    imageAuthor: "Roy Egloff",
    imageLicense: "CC BY-SA 4.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'li-vaduz-castle',
    countryId: 'liechtenstein',
    countryName: 'Liechtenstein',
    city: 'Vaduz',
    name: 'Vaduz Castle',
    clue: 'Compact princely stone keep perched on a steep forested ledge above the Rhine valley.',
    category: 'castle',
    palette: ['#64B5F6', '#558B2F', '#6D4C41'],
    svgPosition: [550, 317],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Liechtenstein_asv2022-10_img22_Vaduz_Schloss.jpg/960px-Liechtenstein_asv2022-10_img22_Vaduz_Schloss.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Liechtenstein_asv2022-10_img22_Vaduz_Schloss.jpg",
    imageAuthor: "A.Savin",
    imageLicense: "FAL",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'de-neuschwanstein',
    countryId: 'germany',
    countryName: 'Germany',
    city: 'Bavaria',
    name: 'Neuschwanstein Castle',
    clue: 'Fairytale white limestone turrets and blue spires rising from alpine foothills.',
    category: 'castle',
    palette: ['#64B5F6', '#ECEFF1', '#1E88E5'],
    svgPosition: [550, 315],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Neuschwanstein_Castle_2024-02.jpg/960px-Neuschwanstein_Castle_2024-02.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Neuschwanstein_Castle_2024-02.jpg",
    imageAuthor: "Wilfredor",
    imageLicense: "CC0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'de-brandenburg-gate',
    countryId: 'germany',
    countryName: 'Germany',
    city: 'Berlin',
    name: 'Brandenburg Gate',
    clue: 'Neoclassical sandstone colonnade crowned by a bronze four-horse chariot.',
    category: 'monument',
    palette: ['#90CAF9', '#E6CCB2', '#2E7D32'],
    svgPosition: [552, 301],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Brandenburg_Gate_Quadriga_at_Night.jpg/960px-Brandenburg_Gate_Quadriga_at_Night.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Brandenburg_Gate_Quadriga_at_Night.jpg",
    imageAuthor: "\u05d0 (Aleph) Creator: Johann Gottfried Schadow",
    imageLicense: "CC BY-SA 2.5",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'dk-nyhavn',
    countryId: 'denmark',
    countryName: 'Denmark',
    city: 'Copenhagen',
    name: 'Nyhavn Harbour',
    clue: 'Brightly painted 17th-century townhouses and wooden tall ships along a narrow canal.',
    category: 'coast',
    palette: ['#4FC3F7', '#FFB74D', '#D32F2F'],
    svgPosition: [550, 289],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Kopenhagen_%28DK%29%2C_Nyhavn_--_2017_--_1711.jpg/960px-Kopenhagen_%28DK%29%2C_Nyhavn_--_2017_--_1711.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Kopenhagen_(DK),_Nyhavn_--_2017_--_1711.jpg",
    imageAuthor: "Dietmar Rabich",
    imageLicense: "CC BY-SA 4.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'no-borgund-stave-church',
    countryId: 'norway',
    countryName: 'Norway',
    city: 'Laerdal',
    name: 'Borgund Stave Church',
    clue: 'Multi-tiered dark timber medieval church with carved dragon-head roof gables.',
    category: 'cathedral',
    palette: ['#78909C', '#7CB342', '#3E2723'],
    svgPosition: [555, 275],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Borgund_Stave_Church_in_L%C3%A6rdalen%2C_2013_June.jpg/960px-Borgund_Stave_Church_in_L%C3%A6rdalen%2C_2013_June.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Borgund_Stave_Church_in_L%C3%A6rdalen,_2013_June.jpg",
    imageAuthor: "Ximonic (Simo R\u00e4s\u00e4nen)",
    imageLicense: "CC BY-SA 3.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'no-bryggen-bergen',
    countryId: 'norway',
    countryName: 'Norway',
    city: 'Bergen',
    name: 'Bryggen Wharf',
    clue: 'Row of narrow ochre, red, and white Hanseatic wooden warehouses facing a fjord.',
    category: 'coast',
    palette: ['#64B5F6', '#E57373', '#FBC02D'],
    svgPosition: [550, 276],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Bryggen_Hanseatic_wharf_at_night_Bergen_Norway.jpg/960px-Bryggen_Hanseatic_wharf_at_night_Bergen_Norway.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Bryggen_Hanseatic_wharf_at_night_Bergen_Norway.jpg",
    imageAuthor: "Smtunli",
    imageLicense: "CC BY-SA 4.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'se-turning-torso',
    countryId: 'sweden',
    countryName: 'Sweden',
    city: 'Malmo',
    name: 'Turning Torso & Gamla Stan',
    clue: 'Twisting white neo-futurist residential tower overlooking a strait.',
    category: 'tower',
    palette: ['#4FC3F7', '#ECEFF1', '#1565C0'],
    svgPosition: [582, 280],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Turning_Torso_2.jpg/960px-Turning_Torso_2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Turning_Torso_2.jpg",
    imageAuthor: "V\u00e4sk",
    imageLicense: "CC BY-SA 3.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'fi-helsinki-cathedral',
    countryId: 'finland',
    countryName: 'Finland',
    city: 'Helsinki',
    name: 'Helsinki Cathedral',
    clue: 'Neoclassical white cathedral with tall green domes and gold stars atop a grand staircase.',
    category: 'cathedral',
    palette: ['#64B5F6', '#FFFFFF', '#2E7D32'],
    svgPosition: [591, 282],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Lutheran_Cathedral_Helsinki.jpg/960px-Lutheran_Cathedral_Helsinki.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Lutheran_Cathedral_Helsinki.jpg",
    imageAuthor: "Hans Hillewaert",
    imageLicense: "CC BY-SA 3.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'ee-tallinn-old-town',
    countryId: 'estonia',
    countryName: 'Estonia',
    city: 'Tallinn',
    name: 'Toompea & Old Town Walls',
    clue: 'Conical red-tiled defensive towers and a slender Gothic town hall spire near the Baltic coast.',
    category: 'castle',
    palette: ['#81D4FA', '#CFD8DC', '#C62828'],
    svgPosition: [594, 286],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Tallinn_Toompea_Upper_Old_Town_2013.jpg/960px-Tallinn_Toompea_Upper_Old_Town_2013.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Tallinn_Toompea_Upper_Old_Town_2013.jpg",
    imageAuthor: "Ivar Leidus",
    imageLicense: "CC BY-SA 3.0 ee",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'lv-house-of-blackheads',
    countryId: 'latvia',
    countryName: 'Latvia',
    city: 'Riga',
    name: 'House of the Blackheads',
    clue: 'Elaborate Dutch-Renaissance stepped red-brick gable trimmed with white stonework and gilded statues.',
    category: 'palace',
    palette: ['#90CAF9', '#C62828', '#F5F5F5'],
    svgPosition: [590, 291],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/House_of_Blackheads_and_St._Peter%27s_Church_Tower%2C_Riga%2C_Latvia_-_Diliff.jpg/960px-House_of_Blackheads_and_St._Peter%27s_Church_Tower%2C_Riga%2C_Latvia_-_Diliff.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:House_of_Blackheads_and_St._Peter%27s_Church_Tower,_Riga,_Latvia_-_Diliff.jpg",
    imageAuthor: "Diliff",
    imageLicense: "CC BY-SA 3.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'lt-trakai-castle',
    countryId: 'lithuania',
    countryName: 'Lithuania',
    city: 'Trakai',
    name: 'Trakai Island Castle',
    clue: 'Red-brick Gothic island fortress reached by a long wooden footbridge across a tranquil lake.',
    category: 'castle',
    palette: ['#4FC3F7', '#C62828', '#388E3C'],
    svgPosition: [594, 298],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Trakai-Troki.jpg/960px-Trakai-Troki.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Trakai-Troki.jpg",
    imageAuthor: "Julo",
    imageLicense: "CC BY-SA 3.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'pl-wawel-castle',
    countryId: 'poland',
    countryName: 'Poland',
    city: 'Krakow',
    name: 'Wawel Royal Castle',
    clue: 'Renaissance royal courtyard and copper-verdigris cathedral domes beside the Vistula river.',
    category: 'castle',
    palette: ['#64B5F6', '#D84315', '#26A69A'],
    svgPosition: [575, 314],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Wawel_Royal_Castle%2C_view_from_Stradomska_Street%2C_Old_Town%2C_Krak%C3%B3w%2C_Poland.jpg/960px-Wawel_Royal_Castle%2C_view_from_Stradomska_Street%2C_Old_Town%2C_Krak%C3%B3w%2C_Poland.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Wawel_Royal_Castle,_view_from_Stradomska_Street,_Old_Town,_Krak%C3%B3w,_Poland.jpg",
    imageAuthor: "Igor123121",
    imageLicense: "CC BY 4.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'cz-charles-bridge',
    countryId: 'czechia',
    countryName: 'Czechia',
    city: 'Prague',
    name: 'Charles Bridge & Old Town Tower',
    clue: 'Historic stone arch bridge lined with dark baroque statues and guarded by Gothic towers.',
    category: 'bridge',
    palette: ['#64B5F6', '#8D6E63', '#37474F'],
    svgPosition: [556, 315],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Prague_07-2016_View_from_Petrinska_Tower_img2.jpg/960px-Prague_07-2016_View_from_Petrinska_Tower_img2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Prague_07-2016_View_from_Petrinska_Tower_img2.jpg",
    imageAuthor: "A.Savin",
    imageLicense: "FAL",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'at-schonbrunn',
    countryId: 'austria',
    countryName: 'Austria',
    city: 'Vienna',
    name: 'Schonbrunn Palace',
    clue: 'Vast imperial yellow baroque palace with sculpted parterre gardens and a hilltop Gloriette.',
    category: 'palace',
    palette: ['#81D4FA', '#FFD54F', '#43A047'],
    svgPosition: [563, 322],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Palacio_de_Sch%C3%B6nbrunn%2C_Viena%2C_Austria%2C_2020-02-02%2C_DD_10.jpg/960px-Palacio_de_Sch%C3%B6nbrunn%2C_Viena%2C_Austria%2C_2020-02-02%2C_DD_10.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Palacio_de_Sch%C3%B6nbrunn,_Viena,_Austria,_2020-02-02,_DD_10.jpg",
    imageAuthor: "Diego Delso",
    imageLicense: "CC BY-SA 4.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'at-hallstatt',
    countryId: 'austria',
    countryName: 'Austria',
    city: 'Salzkammergut',
    name: 'Hallstatt Lakeside Village',
    clue: 'Pastel lakeside houses and a slender church spire wedged between glassy alpine water and steep peaks.',
    category: 'mountain',
    palette: ['#4FC3F7', '#558B2F', '#8D6E63'],
    svgPosition: [559, 323],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Hallstatt_evangelische_Kirche_20180206.jpg/960px-Hallstatt_evangelische_Kirche_20180206.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Hallstatt_evangelische_Kirche_20180206.jpg",
    imageAuthor: "Uoaei1",
    imageLicense: "CC BY-SA 4.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'sk-spis-castle',
    countryId: 'slovakia',
    countryName: 'Slovakia',
    city: 'Prešov Region',
    name: 'Spis Castle',
    clue: 'Sprawling white limestone castle ruins crowning a travertine hilltop above rolling meadows.',
    category: 'castle',
    palette: ['#90CAF9', '#7CB342', '#EFEBE9'],
    svgPosition: [569, 321],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Spisske_Podhradie_03.jpg/960px-Spisske_Podhradie_03.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Spisske_Podhradie_03.jpg",
    imageAuthor: "Scotch Mist",
    imageLicense: "CC BY-SA 4.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'hu-parliament',
    countryId: 'hungary',
    countryName: 'Hungary',
    city: 'Budapest',
    name: 'Parliament Building on the Danube',
    clue: 'Symmetrical Gothic-Revival riverbank palace with a central red dome and dozens oflace-like spires.',
    category: 'palace',
    palette: ['#4FC3F7', '#F5E6CA', '#C62828'],
    svgPosition: [571, 326],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Hungarian_Parliament_Building_2023-9.jpg/960px-Hungarian_Parliament_Building_2023-9.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Hungarian_Parliament_Building_2023-9.jpg",
    imageAuthor: "Pierre Blach\u00e9",
    imageLicense: "CC0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'si-lake-bled',
    countryId: 'slovenia',
    countryName: 'Slovenia',
    city: 'Julian Alps',
    name: 'Lake Bled Island',
    clue: 'Tiny tear-shaped island with a baroque bell tower floating in an emerald glacial lake.',
    category: 'mountain',
    palette: ['#26C6DA', '#43A047', '#ECEFF1'],
    svgPosition: [558, 330],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Bled_Lake%2C_Slovenia.jpg/960px-Bled_Lake%2C_Slovenia.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Bled_Lake,_Slovenia.jpg",
    imageAuthor: "Ronnie Pander from WikiTravel",
    imageLicense: "Public domain",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'it-colosseum',
    countryId: 'italy',
    countryName: 'Italy',
    city: 'Rome',
    name: 'The Colosseum',
    clue: 'Monumental travertine amphitheatre of tiered Roman arches.',
    category: 'ancient',
    palette: ['#64B5F6', '#E6C280', '#8D6E63'],
    svgPosition: [552, 346],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Colosseum_in_Rome-April_2007-1-_copie_2B.jpg/960px-Colosseum_in_Rome-April_2007-1-_copie_2B.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Colosseum_in_Rome-April_2007-1-_copie_2B.jpg",
    imageAuthor: "Diliff",
    imageLicense: "CC BY-SA 2.5",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'it-pisa-tower',
    countryId: 'italy',
    countryName: 'Italy',
    city: 'Pisa',
    name: 'Leaning Tower of Pisa',
    clue: 'Tilted white marble cylindrical bell tower ringed by open Romanesque galleries.',
    category: 'tower',
    palette: ['#64B5F6', '#7CB342', '#FAFAFA'],
    svgPosition: [549, 339],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/The_Duomo_and_Tower_of_Pisa_at_sunrise.jpg/960px-The_Duomo_and_Tower_of_Pisa_at_sunrise.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:The_Duomo_and_Tower_of_Pisa_at_sunrise.jpg",
    imageAuthor: "MHoser",
    imageLicense: "CC BY-SA 4.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'it-rialto-bridge',
    countryId: 'italy',
    countryName: 'Italy',
    city: 'Venice',
    name: 'Rialto Bridge & Grand Canal',
    clue: 'Ornate white stone portico bridge spanning a bustling lagoon canal filled with gondolas.',
    category: 'bridge',
    palette: ['#26C6DA', '#F5E6CA', '#D84315'],
    svgPosition: [554, 333],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Ponte_di_Rialto_Venice_1.jpg/960px-Ponte_di_Rialto_Venice_1.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Ponte_di_Rialto_Venice_1.jpg",
    imageAuthor: "kallerna",
    imageLicense: "CC BY-SA 4.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'sm-guaita-tower',
    countryId: 'san-marino',
    countryName: 'San Marino',
    city: 'Mount Titano',
    name: 'Guaita Fortress Tower',
    clue: 'Crenellated medieval watchtower perched on the razor edge of a limestone cliff.',
    category: 'castle',
    palette: ['#64B5F6', '#81C784', '#BCAAA4'],
    svgPosition: [558, 338],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Fortress_of_Guaita_2013-09-19.jpg/960px-Fortress_of_Guaita_2013-09-19.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Fortress_of_Guaita_2013-09-19.jpg",
    imageAuthor: "Max_Ryazanov",
    imageLicense: "CC BY-SA 3.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'va-st-peters-basilica',
    countryId: 'vatican-city',
    countryName: 'Vatican City',
    city: 'Vatican City',
    name: "St. Peter's Square & Dome",
    clue: 'Soaring Renaissance dome embraced by twin curving Doric colonnades and an Egyptian obelisk.',
    category: 'cathedral',
    palette: ['#64B5F6', '#F5E6CA', '#5D4037'],
    svgPosition: [550, 348],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Basilica_Sancti_Petri_blue_hour.jpg/960px-Basilica_Sancti_Petri_blue_hour.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Basilica_Sancti_Petri_blue_hour.jpg",
    imageAuthor: "Jebulon",
    imageLicense: "CC0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'mt-valletta-harbour',
    countryId: 'malta',
    countryName: 'Malta',
    city: 'Valletta',
    name: 'Grand Harbour & Basilica Dome',
    clue: 'Honey-colored limestone fortifications and a giant dome rising over a deep Mediterranean harbor.',
    category: 'coast',
    palette: ['#0288D1', '#FFE082', '#D4A373'],
    svgPosition: [560, 369],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Grand_Harbour_-_Senglea.jpg/960px-Grand_Harbour_-_Senglea.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Grand_Harbour_-_Senglea.jpg",
    imageAuthor: "MrPanyGoff",
    imageLicense: "CC BY-SA 3.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'hr-dubrovnik-walls',
    countryId: 'croatia',
    countryName: 'Croatia',
    city: 'Dubrovnik',
    name: 'Dubrovnik Old Town Walls',
    clue: 'Terracotta rooftops encircled by massive white stone sea walls jutting into the Adriatic.',
    category: 'coast',
    palette: ['#0288D1', '#ECEFF1', '#E64A19'],
    svgPosition: [567, 344],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Casco_viejo_de_Dubrovnik%2C_Croacia%2C_2014-04-14%2C_DD_07.JPG/960px-Casco_viejo_de_Dubrovnik%2C_Croacia%2C_2014-04-14%2C_DD_07.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Casco_viejo_de_Dubrovnik,_Croacia,_2014-04-14,_DD_07.JPG",
    imageAuthor: "Diego Delso",
    imageLicense: "CC BY-SA 3.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'ba-stari-most',
    countryId: 'bosnia-herzegovina',
    countryName: 'Bosnia and Herzegovina',
    city: 'Mostar',
    name: 'Stari Most (Old Bridge)',
    clue: 'High humpbacked Ottoman stone arch bridge soaring over a turquoise river canyon.',
    category: 'bridge',
    palette: ['#26A69A', '#D7CCC8', '#5D4037'],
    svgPosition: [569, 340],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Mostar_Old_Town_Panorama_2007.jpg/960px-Mostar_Old_Town_Panorama_2007.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Mostar_Old_Town_Panorama_2007.jpg",
    imageAuthor: "Ramirez",
    imageLicense: "CC BY-SA 4.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'rs-kalemegdan',
    countryId: 'serbia',
    countryName: 'Serbia',
    city: 'Belgrade',
    name: 'Kalemegdan Fortress & Victor',
    clue: 'Brick-and-stone citadel overlooking the confluence of two great rivers.',
    category: 'castle',
    palette: ['#64B5F6', '#689F38', '#A1887F'],
    svgPosition: [577, 336],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Kalemegdan%2C_a04.jpg/960px-Kalemegdan%2C_a04.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Kalemegdan,_a04.jpg",
    imageAuthor: "Mickey Mystique",
    imageLicense: "CC BY-SA 4.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'me-kotor-bay',
    countryId: 'montenegro',
    countryName: 'Montenegro',
    city: 'Kotor',
    name: 'Bay of Kotor & Islet Church',
    clue: 'Blue-domed chapel on a tiny artificial islet surrounded by steep karst fjord walls.',
    category: 'coast',
    palette: ['#0277BD', '#546E7A', '#ECEFF1'],
    svgPosition: [576, 346],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Kotor_and_Boka_kotorska_-_view_from_city_wall.jpg/960px-Kotor_and_Boka_kotorska_-_view_from_city_wall.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Kotor_and_Boka_kotorska_-_view_from_city_wall.jpg",
    imageAuthor: "Pudelek (Marcin Szala)",
    imageLicense: "CC BY-SA 3.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'al-berat-windows',
    countryId: 'albania',
    countryName: 'Albania',
    city: 'Berat',
    name: 'Berat Town of a Thousand Windows',
    clue: 'Tiered white Ottoman hillside houses with rows of dark-framed windows beneath a mountain citadel.',
    category: 'palace',
    palette: ['#64B5F6', '#FAFAFA', '#6D4C41'],
    svgPosition: [580, 351],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Mangalem_district_%28Town_of_a_Thousand_Windows%29_in_Berat%2C_Albania.jpg/960px-Mangalem_district_%28Town_of_a_Thousand_Windows%29_in_Berat%2C_Albania.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Mangalem_district_(Town_of_a_Thousand_Windows)_in_Berat,_Albania.jpg",
    imageAuthor: "Christoph Str\u00e4ssler",
    imageLicense: "CC BY-SA 2.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'xk-pristina-library',
    countryId: 'kosovo',
    countryName: 'Kosovo',
    city: 'Pristina',
    name: 'National Library of Kosovo',
    clue: 'Brutalist concrete building topped by 99 white translucent domes wrapped in metal lattice.',
    category: 'monument',
    palette: ['#64B5F6', '#CFD8DC', '#455A64'],
    svgPosition: [583, 346],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Biblioteca_Nacional%2C_Pristina%2C_Kosovo%2C_2014-04-16%2C_DD_14.JPG/960px-Biblioteca_Nacional%2C_Pristina%2C_Kosovo%2C_2014-04-16%2C_DD_14.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Biblioteca_Nacional,_Pristina,_Kosovo,_2014-04-16,_DD_14.JPG",
    imageAuthor: "Diego Delso",
    imageLicense: "CC BY-SA 3.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'mk-st-john-kaneo',
    countryId: 'north-macedonia',
    countryName: 'North Macedonia',
    city: 'Ohrid',
    name: 'Church of St. John at Kaneo',
    clue: 'Brick-and-stone Byzantine cruciform chapel perched on a cliff above a vast mountain lake.',
    category: 'cathedral',
    palette: ['#29B6F6', '#D7CCC8', '#BF360C'],
    svgPosition: [585, 352],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Church_of_St._John_at_Kaneo_6.jpg/960px-Church_of_St._John_at_Kaneo_6.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Church_of_St._John_at_Kaneo_6.jpg",
    imageAuthor: "kallerna",
    imageLicense: "CC BY-SA 4.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'gr-parthenon',
    countryId: 'greece',
    countryName: 'Greece',
    city: 'Athens',
    name: 'The Parthenon on the Acropolis',
    clue: 'Classical Doric marble temple crowning a flat-topped limestone citadel.',
    category: 'ancient',
    palette: ['#29B6F6', '#FFE082', '#A1887F'],
    svgPosition: [589, 359],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Attica_06-13_Athens_50_View_from_Philopappos_-_Acropolis_Hill.jpg/960px-Attica_06-13_Athens_50_View_from_Philopappos_-_Acropolis_Hill.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Attica_06-13_Athens_50_View_from_Philopappos_-_Acropolis_Hill.jpg",
    imageAuthor: "A.Savin",
    imageLicense: "CC BY-SA 3.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'gr-santorini-oia',
    countryId: 'greece',
    countryName: 'Greece',
    city: 'Santorini',
    name: 'Oia Blue Domes',
    clue: 'Whitewashed cubist cliffside houses and cobalt-blue church domes above a volcanic caldera.',
    category: 'coast',
    palette: ['#0288D1', '#FFFFFF', '#1565C0'],
    svgPosition: [594, 364],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/1000_Three_domes_of_Oia_in_Santorini_Photo_by_Giles_Laurent.jpg/960px-1000_Three_domes_of_Oia_in_Santorini_Photo_by_Giles_Laurent.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:1000_Three_domes_of_Oia_in_Santorini_Photo_by_Giles_Laurent.jpg",
    imageAuthor: "Giles Laurent",
    imageLicense: "CC BY-SA 4.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'bg-alexander-nevsky',
    countryId: 'bulgaria',
    countryName: 'Bulgaria',
    city: 'Sofia',
    name: 'Alexander Nevsky Cathedral',
    clue: 'Neo-Byzantine cathedral with cascading gold and verdigris domes.',
    category: 'cathedral',
    palette: ['#64B5F6', '#FBC02D', '#26A69A'],
    svgPosition: [592, 349],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/AlexanderNevskyCathedral-Sofia-6.jpg/960px-AlexanderNevskyCathedral-Sofia-6.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:AlexanderNevskyCathedral-Sofia-6.jpg",
    imageAuthor: "Plamen Agov ( user:MrPanyGoff )",
    imageLicense: "CC BY-SA 4.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'ro-bran-castle',
    countryId: 'romania',
    countryName: 'Romania',
    city: 'Brasov',
    name: 'Bran Castle',
    clue: 'Dramatic cliff-top Transylvanian fortress with steep red-tiled turrets.',
    category: 'castle',
    palette: ['#78909C', '#ECEFF1', '#B71C1C'],
    svgPosition: [600, 340],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Bran_castle_courtyard_round_tower.jpg/960px-Bran_castle_courtyard_round_tower.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Bran_castle_courtyard_round_tower.jpg",
    imageAuthor: "Myrabella",
    imageLicense: "CC BY-SA 3.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'md-orheiul-vechi',
    countryId: 'moldova',
    countryName: 'Moldova',
    city: 'Butuceni',
    name: 'Orheiul Vechi Cave Monastery',
    clue: 'Gold-domed white clifftop belfry overlooking an S-shaped limestone river gorge.',
    category: 'mountain',
    palette: ['#64B5F6', '#8BC34A', '#FBC02D'],
    svgPosition: [608, 331],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Nave_of_a_Cave_Monastery_%28M%C4%83n%C4%83stire_Rupestr%C4%83%29%2C_Old_Orhei.jpg/960px-Nave_of_a_Cave_Monastery_%28M%C4%83n%C4%83stire_Rupestr%C4%83%29%2C_Old_Orhei.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Nave_of_a_Cave_Monastery_(M%C4%83n%C4%83stire_Rupestr%C4%83),_Old_Orhei.jpg",
    imageAuthor: "AntyLegit",
    imageLicense: "CC BY-SA 4.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'ua-st-sophia-kyiv',
    countryId: 'ukraine',
    countryName: 'Ukraine',
    city: 'Kyiv',
    name: 'Saint Sophia Cathedral',
    clue: 'White baroque bell tower and thirteen golden-and-emerald pear-shaped domes.',
    category: 'cathedral',
    palette: ['#42A5F5', '#FFFFFF', '#FBC02D'],
    svgPosition: [616, 313],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/80-391-9014_Kyiv_Sofia_2_RB_24.jpg/960px-80-391-9014_Kyiv_Sofia_2_RB_24.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:80-391-9014_Kyiv_Sofia_2_RB_24.jpg",
    imageAuthor: "Rbrechko",
    imageLicense: "CC BY-SA 4.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'by-mir-castle',
    countryId: 'belarus',
    countryName: 'Belarus',
    city: 'Grodno Region',
    name: 'Mir Castle Complex',
    clue: 'Square red-brick Gothic fortress with white recessed arches reflected in a moat.',
    category: 'castle',
    palette: ['#64B5F6', '#C62828', '#F5F5F5'],
    svgPosition: [597, 301],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/%D0%9A%D0%BE%D0%BC%D0%BF%D0%BB%D0%B5%D0%BA%D1%81_%D0%9C%D0%B8%D1%80%D1%81%D0%BA%D0%BE%D0%B3%D0%BE_%D0%B7%D0%B0%D0%BC%D0%BA%D0%B0.JPG/960px-%D0%9A%D0%BE%D0%BC%D0%BF%D0%BB%D0%B5%D0%BA%D1%81_%D0%9C%D0%B8%D1%80%D1%81%D0%BA%D0%BE%D0%B3%D0%BE_%D0%B7%D0%B0%D0%BC%D0%BA%D0%B0.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:%D0%9A%D0%BE%D0%BC%D0%BF%D0%BB%D0%B5%D0%BA%D1%81_%D0%9C%D0%B8%D1%80%D1%81%D0%BA%D0%BE%D0%B3%D0%BE_%D0%B7%D0%B0%D0%BC%D0%BA%D0%B0.JPG",
    imageAuthor: "\u0412\u0430\u0434\u0437\u0456\u043c \u041d\u043e\u0432\u0438\u043a\u0430\u045e",
    imageLicense: "CC BY-SA 3.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'ru-st-basils',
    countryId: 'russia',
    countryName: 'Russia',
    city: 'Moscow',
    name: "Saint Basil's Cathedral",
    clue: 'Cluster of brightly striped and swirled onion domes rising above a cobblestone square.',
    category: 'cathedral',
    palette: ['#42A5F5', '#D32F2F', '#FBC02D'],
    svgPosition: [625, 290],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Sant_Vasily_cathedral_in_Moscow.JPG/960px-Sant_Vasily_cathedral_in_Moscow.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Sant_Vasily_cathedral_in_Moscow.JPG",
    imageAuthor: "Petar Milo\u0161evi\u0107",
    imageLicense: "CC BY-SA 4.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'kz-baiterek-tower',
    countryId: 'kazakhstan',
    countryName: 'Kazakhstan',
    city: 'Astana',
    name: 'Baiterek Tower',
    clue: 'White lattice tree-of-life tower cradling a giant golden glass sphere at its crown.',
    category: 'tower',
    palette: ['#29B6F6', '#FFFFFF', '#FFD600'],
    svgPosition: [676, 320],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Night_at_Esil_District%2C_Astana_%28P1190721%29.jpg/960px-Night_at_Esil_District%2C_Astana_%28P1190721%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Night_at_Esil_District,_Astana_(P1190721).jpg",
    imageAuthor: "Matti Blume",
    imageLicense: "CC BY-SA 4.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'ge-gergeti-trinity',
    countryId: 'georgia',
    countryName: 'Georgia',
    city: 'Stepantsminda',
    name: 'Gergeti Trinity Church',
    clue: 'Conical-roofed stone monastery perched high on a ridge beneath snow-covered Caucasus peaks.',
    category: 'mountain',
    palette: ['#64B5F6', '#558B2F', '#8D6E63'],
    svgPosition: [636, 347],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Kazbeg_Panorama.jpg/960px-Kazbeg_Panorama.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Kazbeg_Panorama.jpg",
    imageAuthor: "Philipp Weigell",
    imageLicense: "CC BY 3.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'am-khor-virap',
    countryId: 'armenia',
    countryName: 'Armenia',
    city: 'Ararat Plain',
    name: 'Khor Virap Monastery',
    clue: 'Reddish tuff-stone monastery walled before a towering snow-capped volcanic cone.',
    category: 'mountain',
    palette: ['#90CAF9', '#A1887F', '#ECEFF1'],
    svgPosition: [640, 355],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Monasterio_Khor_Virap%2C_Armenia%2C_2016-10-01%2C_DD_25.jpg/960px-Monasterio_Khor_Virap%2C_Armenia%2C_2016-10-01%2C_DD_25.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Monasterio_Khor_Virap,_Armenia,_2016-10-01,_DD_25.jpg",
    imageAuthor: "Diego Delso",
    imageLicense: "CC BY-SA 4.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'az-flame-towers',
    countryId: 'azerbaijan',
    countryName: 'Azerbaijan',
    city: 'Baku',
    name: 'Flame Towers',
    clue: 'Trio of curved glass skyscrapers shaped like flickering tongues of fire above a sea bay.',
    category: 'tower',
    palette: ['#1E88E5', '#263238', '#FF7043'],
    svgPosition: [653, 355],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Flame_towers_from_Baku_boulevard.JPG/960px-Flame_towers_from_Baku_boulevard.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Flame_towers_from_Baku_boulevard.JPG",
    imageAuthor: "Xoncha",
    imageLicense: "CC BY-SA 4.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'tr-hagia-sophia',
    countryId: 'turkey',
    countryName: 'Turkey',
    city: 'Istanbul',
    name: 'Hagia Sophia',
    clue: 'Massive central dome flanked by four slender stone minarets near a strait.',
    category: 'cathedral',
    palette: ['#4FC3F7', '#E6AD8E', '#5D4037'],
    svgPosition: [592, 351],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Hagia_Sophia_Mars_2013.jpg/960px-Hagia_Sophia_Mars_2013.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Hagia_Sophia_Mars_2013.jpg",
    imageAuthor: "Arild V\u00e5gen",
    imageLicense: "CC BY-SA 3.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
  monument({
    id: 'cy-tombs-of-kings',
    countryId: 'cyprus',
    countryName: 'Cyprus',
    city: 'Paphos',
    name: 'Tombs of the Kings & Aphrodite Coast',
    clue: 'Rock-cut Doric sandstone columns beside a sun-drenched eastern Mediterranean shore.',
    category: 'ancient',
    palette: ['#039BE5', '#FFE082', '#A1887F'],
    svgPosition: [610, 369],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Tombs_of_the_Kings_Paphos_Cyprus_17.jpg/960px-Tombs_of_the_Kings_Paphos_Cyprus_17.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Tombs_of_the_Kings_Paphos_Cyprus_17.jpg",
    imageAuthor: "Nikodem Nijaki",
    imageLicense: "CC BY-SA 3.0",
    photoSource: 'wikimedia-commons-curated-v2',
  }),
];

export const normalizeMonumentPool = (rawPool) => {
  const list = Array.isArray(rawPool)
    ? rawPool
    : Array.isArray(rawPool?.monuments)
      ? rawPool.monuments
      : null;

  if (!list || list.length < 10) {
    return DEFAULT_MONUMENT_POOL;
  }

  const byId = new Map(DEFAULT_MONUMENT_POOL.map((item) => [item.id, item]));
  const normalized = list
    .filter((item) => item && item.id && item.name)
    .map((item) => {
      const fallback = byId.get(item.id) || {};
      const hasValidSvgPosition = Array.isArray(item.svgPosition)
        && item.svgPosition.length === 2
        && item.svgPosition.every((coordinate) => Number.isFinite(Number(coordinate)));
      const svgPos = hasValidSvgPosition
        ? [Number(item.svgPosition[0]), Number(item.svgPosition[1])]
        : fallback.svgPosition || [550, 320];
      return {
        id: String(item.id),
        countryId: String(item.countryId || fallback.countryId || 'europe'),
        countryName: String(item.countryName || fallback.countryName || 'Europe'),
        city: String(item.city || fallback.city || ''),
        name: String(item.name || fallback.name || 'Mystery Place'),
        clue: String(item.clue || fallback.clue || 'Study the scene and guess where in Europe this place is.'),
        category: String(item.category || fallback.category || 'castle'),
        palette: Array.isArray(item.palette) && item.palette.length >= 3
          ? item.palette.map(String)
          : (fallback.palette || ['#4A90E2', '#D9B382', '#2C3E50']),
        svgPosition: svgPos,
        // svgPosition is the source of truth for this map. Recomputing avoids stale
        // board coordinates from older Firestore/cache map transforms.
        position: toBoardPosition(svgPos[0], svgPos[1]),
        imageUrl: normalizeMonumentImageUrl(item.imageUrl || fallback.imageUrl),
        imageSourceUrl: String(item.imageSourceUrl || fallback.imageSourceUrl || ''),
        imageAuthor: String(item.imageAuthor || fallback.imageAuthor || ''),
        imageLicense: String(item.imageLicense || fallback.imageLicense || ''),
        photoSource: String(item.photoSource || fallback.photoSource || ''),
        subjectType: getSubjectType({
          id: String(item.id),
          category: String(item.category || fallback.category || 'castle'),
          subjectType: item.subjectType || fallback.subjectType,
        }),
      };
    });

  // Ensure every country from DEFAULT_MONUMENT_POOL is represented even if a partial pool was stored
  const existingIds = new Set(normalized.map((item) => item.id));
  DEFAULT_MONUMENT_POOL.forEach((defaultMonument) => {
    if (!existingIds.has(defaultMonument.id)) {
      normalized.push(defaultMonument);
    }
  });

  return normalized;
};

const hashSeed = (seed) => String(seed).split('').reduce((total, character) => (
  ((total * 31) + character.charCodeAt(0)) >>> 0
), 0);

/**
 * Picks a photo location from the pool that has NOT been used yet in the current game
 * (`usedMonumentIds`), and avoids picking a location from the country the team just
 * landed on (`excludeCountryId`) so the destination never spoils the answer.
 */
export const selectMonumentFromPool = ({
  pool = DEFAULT_MONUMENT_POOL,
  usedMonumentIds = [],
  excludeCountryId = null,
  seed = '',
}) => {
  const monuments = normalizeMonumentPool(pool);
  const usedSet = new Set(Array.isArray(usedMonumentIds) ? usedMonumentIds : []);

  // 1. Unused monuments outside the landed country
  let candidates = monuments.filter(
    (item) => !usedSet.has(item.id) && (!excludeCountryId || item.countryId !== excludeCountryId)
  );

  // 2. Fallback: any unused monument
  if (candidates.length === 0) {
    candidates = monuments.filter((item) => !usedSet.has(item.id));
  }

  // 3. Fallback if all 67 monuments were exhausted in a marathon session: reset used list
  const didResetUsed = candidates.length === 0;
  if (didResetUsed) {
    candidates = monuments.filter((item) => !excludeCountryId || item.countryId !== excludeCountryId);
    if (candidates.length === 0) candidates = monuments;
  }

  // Alternate broad place scenes with landmarks. This keeps the challenge approachable
  // without removing the famous monuments already present in stored game content.
  const preferredSubjectType = usedSet.size % 2 === 0 ? 'place' : 'landmark';
  const preferredCandidates = candidates.filter((item) => item.subjectType === preferredSubjectType);
  if (preferredCandidates.length > 0) candidates = preferredCandidates;

  const index = hashSeed(`${seed}:place:${usedSet.size}`) % candidates.length;
  const selected = candidates[index] || candidates[0];
  const baseUsed = didResetUsed ? [] : [...usedSet];

  return {
    monument: selected,
    nextUsedMonumentIds: [...baseUsed, selected.id],
  };
};

/**
 * Generates a realistic bot pin when a team has only bot members or timed out without placing a pin.
 */
export const generateFallbackPin = (targetPosition, teamId, seed = '') => {
  const h1 = hashSeed(`${seed}:${teamId}:dx`);
  const h2 = hashSeed(`${seed}:${teamId}:dy`);
  const angle = ((h1 % 360) * Math.PI) / 180;
  const radius = 0.85 + ((h2 % 260) / 100); // ~240 km to ~980 km off target
  const rawX = (Number(targetPosition?.x) || 0) + Math.cos(angle) * radius;
  const rawY = (Number(targetPosition?.y) || 0) + Math.sin(angle) * radius;
  return {
    x: Number(Math.max(-9.4, Math.min(9.4, rawX)).toFixed(2)),
    y: Number(Math.max(-6.4, Math.min(7.4, rawY)).toFixed(2)),
  };
};

export const evaluateGeoGuessrGuesses = ({
  guesses = {},
  requiredTeamIds = [],
  targetPosition,
  seed = '',
  autoFillMissing = true,
}) => {
  const finalGuesses = {};
  requiredTeamIds.forEach((teamId) => {
    const existing = guesses?.[teamId];
    if (existing && Number.isFinite(Number(existing.x)) && Number.isFinite(Number(existing.y))) {
      const pos = { x: Number(existing.x), y: Number(existing.y) };
      finalGuesses[teamId] = {
        ...existing,
        x: pos.x,
        y: pos.y,
        distanceKm: calculateBoardDistanceKm(pos, targetPosition),
      };
    } else if (autoFillMissing) {
      const fallbackPos = generateFallbackPin(targetPosition, teamId, seed);
      finalGuesses[teamId] = {
        x: fallbackPos.x,
        y: fallbackPos.y,
        distanceKm: calculateBoardDistanceKm(fallbackPos, targetPosition),
        isAutoPin: true,
        lockedAt: Date.now(),
      };
    }
  });

  const entries = Object.entries(finalGuesses);
  if (entries.length === 0) {
    return { guesses: finalGuesses, winnerTeamIds: [], bestDistanceKm: null };
  }

  const bestDistanceKm = Math.min(...entries.map(([, guess]) => guess.distanceKm));
  const winnerTeamIds = entries
    .filter(([, guess]) => guess.distanceKm === bestDistanceKm)
    .map(([teamId]) => teamId);

  return {
    guesses: finalGuesses,
    winnerTeamIds,
    bestDistanceKm,
  };
};
