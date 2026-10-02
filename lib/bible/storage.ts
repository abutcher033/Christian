import type { ReadingDistance, StudySceneId } from '@/lib/study/scenes';
import { isReadingDistance, isStudyScene } from '@/lib/study/scenes';
import type { Place } from './types';

const PLACE_KEY = 'christian.place';
const SETTINGS_KEY = 'christian.settings';

export type SavedPlace =
  | { kind: 'front'; }
  | { kind: 'ref'; bookId: string; chapter: number; verse: number };

export type ReaderSettings = {
  scriptureFirst: boolean;
  largeTargets: boolean;
  reducedMotion: boolean;
  scene: StudySceneId;
  soundOn: boolean;
  volume: number;
  readingDistance: ReadingDistance;
  hintSeen: boolean;
};

export const DEFAULT_SETTINGS: ReaderSettings = {
  scriptureFirst: true,
  largeTargets: true,
  reducedMotion: false,
  scene: 'hearth',
  soundOn: true,
  volume: 0.72,
  readingDistance: 'cozy',
  hintSeen: false,
};

export function loadPlace(): SavedPlace | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PLACE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedPlace;
    if (parsed.kind === 'front') return parsed;
    if (
      parsed.kind === 'ref' &&
      typeof parsed.bookId === 'string' &&
      Number.isFinite(parsed.chapter) &&
      Number.isFinite(parsed.verse)
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function savePlace(place: SavedPlace) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PLACE_KEY, JSON.stringify(place));
}

export function loadSettings(): ReaderSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<ReaderSettings>;
    const volume = typeof parsed.volume === 'number' ? parsed.volume : DEFAULT_SETTINGS.volume;
    return {
      scriptureFirst: parsed.scriptureFirst !== false,
      largeTargets: parsed.largeTargets !== false,
      reducedMotion: parsed.reducedMotion === true,
      scene: isStudyScene(parsed.scene) ? parsed.scene : DEFAULT_SETTINGS.scene,
      soundOn: parsed.soundOn !== false,
      volume: Math.min(1, Math.max(0, volume)),
      readingDistance: isReadingDistance(parsed.readingDistance)
        ? parsed.readingDistance
        : DEFAULT_SETTINGS.readingDistance,
      hintSeen: parsed.hintSeen === true,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: ReaderSettings) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function placeFromRef(place: Place): SavedPlace {
  return { kind: 'ref', bookId: place.bookId, chapter: place.chapter, verse: place.verse };
}
