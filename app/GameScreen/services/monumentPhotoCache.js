import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import {
  GEO_GUESSR_IMAGE_HEADERS,
  normalizeMonumentImageUrl,
} from '../constants/monumentPool';

const photoUriCache = new Map();

const hashPhotoUrl = (url) => String(url).split('').reduce((total, character) => (
  ((total * 31) + character.charCodeAt(0)) >>> 0
), 0).toString(16);

const getPhotoExtension = (url) => {
  const match = String(url).split(/[?#]/, 1)[0].match(/\.(jpe?g|png|webp)$/i);
  return match?.[1]?.toLowerCase() || 'jpg';
};

const getCachedFile = (url) => new File(
  Paths.cache,
  `tipsy-monument-${hashPhotoUrl(url)}.${getPhotoExtension(url)}`
);

const loadWebPhotoDataUri = async (url, signal) => {
  const response = await fetch(url, {
    headers: GEO_GUESSR_IMAGE_HEADERS,
    signal,
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => (
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Failed to read photo as data URI'))
    );
    reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
};

export const getCachedMonumentPhotoUri = (imageUrl) => {
  const normalizedUrl = normalizeMonumentImageUrl(imageUrl);
  return normalizedUrl ? photoUriCache.get(normalizedUrl) || null : null;
};

export const loadMonumentPhotoUri = async (imageUrl, { signal } = {}) => {
  const normalizedUrl = normalizeMonumentImageUrl(imageUrl);
  if (!normalizedUrl) return null;

  const cachedUri = photoUriCache.get(normalizedUrl);
  if (cachedUri) return cachedUri;

  let uri;
  if (Platform.OS === 'web') {
    uri = await loadWebPhotoDataUri(normalizedUrl, signal);
  } else {
    const destination = getCachedFile(normalizedUrl);
    try {
      const downloadedFile = await File.downloadFileAsync(normalizedUrl, destination, {
        headers: GEO_GUESSR_IMAGE_HEADERS,
        idempotent: true,
        signal,
      });
      if (!downloadedFile.exists || Number(downloadedFile.size) <= 0) {
        throw new Error('Downloaded photo is empty');
      }
      uri = downloadedFile.uri;
    } catch (error) {
      // Android can leave a partial destination behind after a cancelled download.
      try {
        if (destination.exists) destination.delete();
      } catch (cleanupError) {
        console.warn('Failed to remove partial monument photo:', cleanupError?.message || cleanupError);
      }
      throw error;
    }
  }

  photoUriCache.set(normalizedUrl, uri);
  return uri;
};
