'use client';

import { Html } from '@react-three/drei';
import type { StudyEntry } from '@/data/studyContent';

type Props = {
  entry: StudyEntry;
  position: [number, number, number];
  onSelect: (id: string) => void;
};

const LABEL: Record<StudyEntry['type'], string> = {
  note: 'Note',
  infographic: 'Info',
  map: 'Map',
  video: 'Video',
  timeline: 'Time',
  'word-study': 'Word',
};

/** Large tappable marker above the open page */
export function StudyEntryMarker({ entry, position, onSelect }: Props) {
  return (
    <Html position={position} center distanceFactor={5} zIndexRange={[30, 0]}>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onSelect(entry.id);
        }}
        aria-label={`Open study: ${entry.title}`}
        style={{
          minWidth: 48,
          minHeight: 48,
          borderRadius: 999,
          border: '2px solid #c4a35a',
          background: 'rgba(255,253,249,0.95)',
          color: '#2f5d50',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          padding: '0 10px',
        }}
      >
        {LABEL[entry.type]}
      </button>
    </Html>
  );
}
