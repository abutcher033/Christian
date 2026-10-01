'use client';

import Link from 'next/link';
import { getEntriesForChapters, getEntryById } from '@/data/studyContent';
import type { Passage } from '@/lib/bible/passage';
import type { ChapterRef } from '@/lib/bible/pages';
import { MediaPanel } from './MediaPanel';
import { ScriptureBlock } from './ScriptureBlock';

type Props = {
  open: boolean;
  label: string;
  chapters: ChapterRef[];
  entryId: string | null;
  passage: Passage | null;
  scriptureFirst: boolean;
  onClose: () => void;
  onSelectEntry: (id: string) => void;
  onBackToList: () => void;
};

function renderMd(body: string) {
  return body.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>');
}

export function StudyOverlay({
  open,
  label,
  chapters,
  entryId,
  passage,
  scriptureFirst,
  onClose,
  onSelectEntry,
  onBackToList,
}: Props) {
  if (!open) return null;
  const entries = getEntriesForChapters(chapters);
  const entry = entryId ? getEntryById(entryId) : undefined;

  return (
    <div
      className="overlay-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={entry ? entry.title : 'Study entries'}
      onClick={onClose}
    >
      <div className="overlay-panel" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            {entry ? (
              <>
                <span className="badge">{entry.type}</span>
                <h2>{entry.title}</h2>
                <p className="muted-line">
                  {entry.book} {entry.chapter}:{entry.verseStart}
                  {entry.verseEnd !== entry.verseStart ? `–${entry.verseEnd}` : ''}
                </p>
              </>
            ) : (
              <>
                <span className="badge">Study</span>
                <h2>{label}</h2>
                <p className="muted-line">Read the page first, then open a study note.</p>
              </>
            )}
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {!entry && (
          <>
            {scriptureFirst && passage && <ScriptureBlock passage={passage} heading="On this page" />}
            {entries.length === 0 ? (
              <div className="empty-study">
                <h3>Open the Book</h3>
                <p>
                  No study notes on this page yet. Read the verses slowly, ask the Lord for light,
                  then check back as notes are added. The Scripture on the page is the main thing.
                </p>
              </div>
            ) : (
              <ul className="entry-list">
                {entries.map((item) => (
                  <li key={item.id}>
                    <button type="button" onClick={() => onSelectEntry(item.id)}>
                      <span className="badge">{item.type}</span>
                      <div className="entry-title">{item.title}</div>
                      <div className="entry-summary">{item.summary}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {entry && (
          <>
            <button type="button" className="text-button" onClick={onBackToList}>
              ← All entries on this page
            </button>
            {scriptureFirst && <ScriptureBlock passage={passage} />}
            <p className="study-summary">{entry.summary}</p>
            <div className="study-body" dangerouslySetInnerHTML={{ __html: renderMd(entry.bodyMd) }} />
            {!scriptureFirst && <ScriptureBlock passage={passage} heading="The passage" />}
            <MediaPanel entry={entry} />
            <div className="response-box">
              <h4>Pray</h4>
              <p>{entry.prayerPrompt}</p>
              <h4>Apply</h4>
              <p>{entry.apply}</p>
            </div>
            {entry.themes.length > 0 && <p className="media-caption">Themes: {entry.themes.join(' · ')}</p>}
            <p className="study-link">
              <Link href={`/study/${entry.id}`}>Open full study page →</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
