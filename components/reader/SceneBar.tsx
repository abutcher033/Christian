'use client';

import { SCENES, type StudySceneId } from '@/lib/study/scenes';

type Props = {
  scene: StudySceneId;
  soundOn: boolean;
  volume: number;
  focus: boolean;
  onScene: (scene: StudySceneId) => void;
  onSound: (on: boolean) => void;
  onVolume: (volume: number) => void;
  onFocus: (focus: boolean) => void;
};

export function SceneBar({
  scene,
  soundOn,
  volume,
  focus,
  onScene,
  onSound,
  onVolume,
  onFocus,
}: Props) {
  const current = SCENES.find((item) => item.id === scene) ?? SCENES[0];

  return (
    <div className="scene-bar">
      <div className="scene-bar-row">
        <p className="scene-kicker">The study</p>
        <div className="scene-choices" role="radiogroup" aria-label="Choose the room">
          {SCENES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={item.id === scene}
              className={item.id === scene ? 'is-on' : undefined}
              onClick={() => onScene(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button type="button" className="scene-quiet" onClick={() => onFocus(!focus)}>
          {focus ? 'Show menus' : 'Hide menus'}
        </button>
      </div>
      <p className="scene-note">{current.description}</p>
      <div className="scene-bar-row">
        <button type="button" className="scene-quiet" aria-pressed={soundOn} onClick={() => onSound(!soundOn)}>
          {soundOn ? 'Sound on' : 'Sound off'}
        </button>
        <label className="volume">
          Volume
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(volume * 100)}
            aria-valuetext={`${Math.round(volume * 100)} percent`}
            disabled={!soundOn}
            onChange={(event) => onVolume(Number(event.target.value) / 100)}
          />
        </label>
      </div>
    </div>
  );
}
