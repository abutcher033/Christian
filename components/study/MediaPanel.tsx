'use client';

import { useState } from 'react';
import type { StudyEntry } from '@/data/studyContent';

type Props = {
  entry: StudyEntry;
};

/** Study media sits beside Scripture. Images are real; videos are placeholders until cuts land. */
export function MediaPanel({ entry }: Props) {
  const media = entry.media;
  const [failed, setFailed] = useState(false);

  if (!media) return null;

  if (media.type === 'video') {
    return (
      <figure>
        <div className="media-frame">
          {!failed ? (
            <video
              controls
              playsInline
              poster={media.poster}
              style={{ width: '100%' }}
              aria-label={media.caption}
              onError={() => setFailed(true)}
            >
              <source src={media.src} type="video/mp4" />
            </video>
          ) : (
            <>
              <strong>No film yet</strong>
              <span>A short film for this passage is not ready. The note above is the study.</span>
            </>
          )}
        </div>
        <figcaption className="media-caption">{media.caption}</figcaption>
      </figure>
    );
  }

  if (media.type === 'map' || media.type === 'infographic') {
    return (
      <figure>
        <div className="media-frame">
          {!failed && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media.src}
              alt={media.caption}
              onError={() => setFailed(true)}
            />
          )}
          {failed && (
            <>
              <strong>{media.type === 'map' ? 'Map' : 'Infographic'}</strong>
              <span>Artwork could not be loaded.</span>
            </>
          )}
        </div>
        <figcaption className="media-caption">{media.caption}</figcaption>
      </figure>
    );
  }

  return (
    <div className="media-frame">
      <span>{media.caption}</span>
    </div>
  );
}
