'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { BibleBookHandle } from '@/components/bible/BibleBook';
import { BibleScene } from '@/components/bible/BibleScene';
import { BookPicker } from '@/components/bible/BookPicker';
import { PageTurnControls } from '@/components/bible/PageTurnControls';
import { SceneBar } from '@/components/reader/SceneBar';
import { useSettings } from '@/components/settings/SettingsProvider';
import { StudyOverlay } from '@/components/study/StudyOverlay';
import { getEntriesForChapters, type StudyEntry } from '@/data/studyContent';
import { loadBible, loadBibleFonts } from '@/lib/bible/load';
import { slicePassage } from '@/lib/bible/passage';
import {
  chaptersOnSpread,
  countRealVerses,
  countStartedVerses,
  createPaginator,
  describeSpread,
  findPageIndex,
  pageOnSpread,
  pagePlainText,
  spreadAnchor,
  spreadCount,
  spreadPageLabel,
  type LaidPage,
} from '@/lib/bible/pages';
import { loadPlace, savePlace } from '@/lib/bible/storage';
import type { BibleCorpus, Place } from '@/lib/bible/types';

const NOTE_KIND: Record<StudyEntry['type'], string> = {
  note: 'Note',
  infographic: 'Picture',
  map: 'Map',
  video: 'Watch',
  timeline: 'Timeline',
  'word-study': 'Word',
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);
  return reduced;
}

export function Reader() {
  const { settings, update } = useSettings();
  const osReduced = usePrefersReducedMotion();
  const reduced = settings.reducedMotion || osReduced;

  const [corpus, setCorpus] = useState<BibleCorpus | null>(null);
  const [pages, setPages] = useState<LaidPage[] | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Loading Scripture…');
  const [error, setError] = useState<string | null>(null);
  const [spread, setSpread] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [turning, setTurning] = useState(false);
  const [focus, setFocus] = useState(false);
  const [copied, setCopied] = useState(false);

  const bookRef = useRef<BibleBookHandle>(null);
  const gestureRef = useRef(false);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    let cancel = false;
    const run = async () => {
      try {
        setStatus('Opening the Bible…');
        const loaded = await loadBible();
        if (cancel) return;
        setCorpus(loaded);
        setProgress(0.08);
        setStatus('Laying out every page…');
        await loadBibleFonts();
        if (cancel) return;
        setStatus('Finding your place…');
        const job = createPaginator(loaded);
        const step = () => {
          if (cancel) return;
          const result = job.work(14);
          setProgress(0.1 + result.progress * 0.9);
          if (!result.done || !result.pages) {
            requestAnimationFrame(step);
            return;
          }
          const laid = countStartedVerses(result.pages);
          const real = countRealVerses(loaded);
          if (laid !== real) {
            setError(`The page layout is missing verses (${laid.toLocaleString()} of ${real.toLocaleString()}).`);
            return;
          }
          const saved = loadPlace();
          let initial = Math.floor(
            findPageIndex(result.pages, { bookId: 'GEN', chapter: 1, verse: 1 }) / 2,
          );
          if (saved?.kind === 'front') initial = 0;
          if (saved?.kind === 'ref') {
            initial = Math.floor(findPageIndex(result.pages, saved) / 2);
          }
          setPages(result.pages);
          setSpread(initial);
          setProgress(1);
          readyRef.current = true;
        };
        requestAnimationFrame(step);
      } catch (err) {
        if (!cancel) setError(err instanceof Error ? err.message : 'Could not open the Bible.');
      }
    };
    void run();
    return () => {
      cancel = true;
    };
  }, []);

  const spreads = pages ? spreadCount(pages.length) : 0;
  const left = pages ? pageOnSpread(pages, spread, 'left') : null;
  const right = pages ? pageOnSpread(pages, spread, 'right') : null;
  const chapters = chaptersOnSpread(left, right);
  const entries = getEntriesForChapters(chapters);
  const label = describeSpread(left, right);
  const anchor = spreadAnchor(left, right);
  const blocked = pickerOpen || overlayOpen;

  useEffect(() => {
    if (!pages || !readyRef.current) return;
    if (anchor) savePlace({ kind: 'ref', ...anchor });
    else if (spread === 0) savePlace({ kind: 'front' });
  }, [anchor, pages, spread]);

  const commitTurn = useCallback(
    (dir: 'next' | 'prev') => {
      setSpread((current) => {
        if (!pages) return current;
        const count = spreadCount(pages.length);
        const next = current + (dir === 'next' ? 1 : -1);
        if (next < 0 || next >= count) return current;
        return next;
      });
    },
    [pages],
  );

  const requestTurn = useCallback(
    (dir: 'next' | 'prev') => {
      if (!pages || blocked) return;
      bookRef.current?.turn(dir);
    },
    [blocked, pages],
  );

  const jumpTo = useCallback(
    (place: Place) => {
      if (!pages) return;
      const index = findPageIndex(pages, place);
      setSpread(Math.floor(index / 2));
      setPickerOpen(false);
      setOverlayOpen(false);
      setEntryId(null);
    },
    [pages],
  );

  const stepChapter = useCallback(
    (dir: 1 | -1) => {
      if (!corpus || !pages) return;
      if (!anchor) {
        if (dir > 0) jumpTo({ bookId: corpus.books[0]?.id ?? 'GEN', chapter: 1, verse: 1 });
        return;
      }
      const place = anchor;
      const bookIndex = corpus.books.findIndex((book) => book.id === place.bookId);
      if (bookIndex < 0) return;
      let nextBook = bookIndex;
      let chapter = place.chapter + dir;
      if (chapter < 1) {
        nextBook -= 1;
        if (nextBook < 0) return;
        chapter = corpus.books[nextBook].chapters.length;
      } else if (chapter > corpus.books[bookIndex].chapters.length) {
        nextBook += 1;
        if (nextBook >= corpus.books.length) return;
        chapter = 1;
      }
      jumpTo({ bookId: corpus.books[nextBook].id, chapter, verse: 1 });
    },
    [anchor, corpus, jumpTo, pages],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === 'Escape') {
        setPickerOpen(false);
        setOverlayOpen(false);
        setEntryId(null);
        return;
      }
      if (blocked) return;
      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault();
        setFocus((current) => !current);
        return;
      }
      if (event.key === 'm' || event.key === 'M') {
        event.preventDefault();
        update({ soundOn: !settings.soundOn });
        return;
      }
      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault();
        if (event.shiftKey) stepChapter(1);
        else requestTurn('next');
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        if (event.shiftKey) stepChapter(-1);
        else requestTurn('prev');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [blocked, requestTurn, settings.soundOn, stepChapter, update]);

  useEffect(() => {
    document.body.dataset.focus = focus ? '1' : '0';
    return () => {
      document.body.dataset.focus = '0';
    };
  }, [focus]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (gestureRef.current) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('button, a, input, textarea, select')) return;
    swipe.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (gestureRef.current) {
      gestureRef.current = false;
      swipe.current = null;
      return;
    }
    const start = swipe.current;
    swipe.current = null;
    if (!start || blocked) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 72 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    requestTurn(dx < 0 ? 'next' : 'prev');
  };

  const entry = entries.find((item) => item.id === entryId) ?? null;
  const passage =
    corpus && entry
      ? slicePassage(corpus, entry.book, entry.chapter, entry.verseStart, entry.verseEnd)
      : corpus && anchor
        ? slicePassage(
            corpus,
            corpus.books.find((book) => book.id === anchor.bookId)?.name ?? '',
            anchor.chapter,
            anchor.verse,
            anchor.verse,
          )
        : null;

  const copyPlace = async () => {
    const bookName = anchor && corpus ? corpus.books.find((book) => book.id === anchor.bookId)?.name : null;
    const text = anchor && bookName
      ? `${bookName} ${anchor.chapter}:${anchor.verse} · World English Bible`
      : `${label} · World English Bible`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  if (error) {
    return (
      <div className="loading-screen">
        <p className="promise">Read the Bible, one page at a time.</p>
        <h2>The Bible didn’t open</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!pages || !corpus) {
    return (
      <div className="loading-screen" role="status" aria-live="polite">
        <p className="promise">Read the Bible, one page at a time.</p>
        <h2>{status}</h2>
        <div className="load-track" aria-hidden="true">
          <div className="load-bar" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <p className="settings-note">World English Bible · public domain</p>
      </div>
    );
  }

  const reading = `${pagePlainText(left)} ${pagePlainText(right)}`.trim();
  const pageLabel = spreadPageLabel(spread, pages.length);
  const firstBook = corpus.books[0];
  const lastBook = corpus.books[corpus.books.length - 1];
  const canChapterPrev =
    !turning && !!anchor && !(anchor.bookId === firstBook?.id && anchor.chapter <= 1);
  const canChapterNext =
    !turning && !(anchor?.bookId === lastBook?.id && anchor.chapter >= (lastBook?.chapters.length ?? 1));
  const through = spreads > 1 ? (spread / (spreads - 1)) * 100 : 100;

  return (
    <>
      <BibleScene
        pages={pages}
        spread={spread}
        spreadCount={spreads}
        bookRef={bookRef}
        onCommit={commitTurn}
        reducedMotion={reduced}
        blocked={blocked}
        gestureRef={gestureRef}
        onTurning={setTurning}
        scene={settings.scene}
        readingDistance={settings.readingDistance}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      />

      <div className="sr-only" aria-live="polite">
        {label}. {pageLabel}. {reading}
      </div>

      <SceneBar
        scene={settings.scene}
        soundOn={settings.soundOn}
        volume={settings.volume}
        distance={settings.readingDistance}
        focus={focus}
        onScene={(scene) => update({ scene })}
        onSound={(soundOn) => update({ soundOn })}
        onVolume={(volume) => update({ volume })}
        onDistance={(readingDistance) => update({ readingDistance })}
        onFocus={setFocus}
      />

      <div className="hud">
        {!settings.hintSeen && (
          <div className="read-hint">
            <p>
              Drag a page to turn it. The right arrow goes forward and the left arrow goes back.
              Hold Shift with an arrow to change chapter. Sound plays the room — choose Sound off
              if you want quiet. Your place is saved in this browser.
            </p>
            <button type="button" onClick={() => update({ hintSeen: true })}>
              Got it
            </button>
          </div>
        )}
        {entries.length > 0 && (
          <div className="study-chips">
            {entries.slice(0, 4).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setEntryId(item.id);
                  setOverlayOpen(true);
                }}
              >
                <span>{NOTE_KIND[item.type]}</span>
                {item.title}
              </button>
            ))}
          </div>
        )}
        <PageTurnControls
          label={label}
          pageLabel={pageLabel}
          canGoPrev={spread > 0 && !turning}
          canGoNext={spread < spreads - 1 && !turning}
          canChapterPrev={canChapterPrev}
          canChapterNext={canChapterNext}
          onPrev={() => requestTurn('prev')}
          onNext={() => requestTurn('next')}
          onChapterPrev={() => stepChapter(-1)}
          onChapterNext={() => stepChapter(1)}
          onOpenPicker={() => setPickerOpen(true)}
        />
        <div className="hud-actions">
          <button
            type="button"
            className="study-launch"
            onClick={() => {
              setEntryId(null);
              setOverlayOpen(true);
            }}
          >
            {entries.length > 0 ? `Study notes (${entries.length})` : 'Study notes'}
          </button>
          <button type="button" className="quiet-button" onClick={() => void copyPlace()}>
            {copied ? 'Copied' : 'Copy reference'}
          </button>
          <p className="hud-meta">World English Bible</p>
        </div>
        <div className="read-progress" aria-hidden="true">
          <span style={{ width: `${through}%` }} />
        </div>
      </div>

      <BookPicker
        open={pickerOpen}
        corpus={corpus}
        current={anchor}
        onClose={() => setPickerOpen(false)}
        onJump={jumpTo}
      />

      <StudyOverlay
        open={overlayOpen}
        label={label}
        chapters={chapters}
        entryId={entryId}
        passage={passage}
        scriptureFirst={settings.scriptureFirst}
        onClose={() => {
          setOverlayOpen(false);
          setEntryId(null);
        }}
        onSelectEntry={(id) => setEntryId(id)}
        onBackToList={() => setEntryId(null)}
      />
    </>
  );
}
