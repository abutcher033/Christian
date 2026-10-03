export type StudySceneId = 'hearth' | 'morning' | 'rain' | 'night';

export type ReadingDistance = 'close' | 'cozy' | 'wide';

export type ScenePreset = {
  id: StudySceneId;
  label: string;
  description: string;
  /** 0–1 mix for the fireplace crackle and flame. */
  fire: number;
  /** 0–1 mix for birdsong. */
  birds: number;
  /** 0–1 mix for rain. */
  rain: number;
  background: string;
  wall: string;
  trim: string;
  sky: string;
  floor: string;
  hemisphereSky: string;
  hemisphereGround: string;
  hemisphere: number;
  windowLight: number;
  windowColor: string;
  lamp: number;
};

export const SCENES: ScenePreset[] = [
  {
    id: 'hearth',
    label: 'By the fire',
    description: 'Evening. A crackling hearth and a few birds settling outside.',
    fire: 1,
    birds: 0.32,
    rain: 0,
    background: '#140e0b',
    wall: '#3a2b22',
    trim: '#2a1c16',
    sky: '#1b2838',
    floor: '#3a2618',
    hemisphereSky: '#f0d7b4',
    hemisphereGround: '#2a1812',
    hemisphere: 0.55,
    windowLight: 0.15,
    windowColor: '#8aa4c4',
    lamp: 1.15,
  },
  {
    id: 'morning',
    label: 'Morning',
    description: 'Daylight through the window and birds in the garden.',
    fire: 0,
    birds: 0.9,
    rain: 0,
    background: '#cbbfae',
    wall: '#6d5646',
    trim: '#4e3b2e',
    sky: '#b9d7ea',
    floor: '#5a3d28',
    hemisphereSky: '#f7f1e4',
    hemisphereGround: '#6a5038',
    hemisphere: 0.85,
    windowLight: 1.35,
    windowColor: '#fff4dd',
    lamp: 0.08,
  },
  {
    id: 'rain',
    label: 'Rain',
    description: 'Rain on the glass, a low fire, and a bird or two.',
    fire: 0.42,
    birds: 0.14,
    rain: 0.85,
    background: '#1a2224',
    wall: '#3c463f',
    trim: '#2a312c',
    sky: '#8b989c',
    floor: '#3a3228',
    hemisphereSky: '#d5ddd8',
    hemisphereGround: '#2c2824',
    hemisphere: 0.48,
    windowLight: 0.55,
    windowColor: '#d5e0e4',
    lamp: 0.9,
  },
  {
    id: 'night',
    label: 'Night',
    description: 'A reading lamp and a quiet fire. The birds are asleep.',
    fire: 0.38,
    birds: 0,
    rain: 0,
    background: '#0c0b10',
    wall: '#241c18',
    trim: '#16110e',
    sky: '#10182a',
    floor: '#24180f',
    hemisphereSky: '#cbb89a',
    hemisphereGround: '#140e0c',
    hemisphere: 0.28,
    windowLight: 0.05,
    windowColor: '#6e82a8',
    lamp: 1.45,
  },
];

export function sceneById(id: StudySceneId): ScenePreset {
  return SCENES.find((scene) => scene.id === id) ?? SCENES[0];
}

export function isStudyScene(value: unknown): value is StudySceneId {
  return value === 'hearth' || value === 'morning' || value === 'rain' || value === 'night';
}

export function isReadingDistance(value: unknown): value is ReadingDistance {
  return value === 'close' || value === 'cozy' || value === 'wide';
}

export const DISTANCE_LABEL: Record<ReadingDistance, string> = {
  close: 'Large',
  cozy: 'Medium',
  wide: 'Small',
};
