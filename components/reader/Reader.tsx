'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BibleScene } from '@/components/bible/BibleScene';
import { BookPicker } from '@/components/bible/BookPicker';
import { PageTurnControls } from '@/components/bible/PageTurnControls';
import type { PageTurn } from '@/components/bible/BibleBook';
import { useSettings } from '@/components/settings/SettingsProvider';
import { StudyOverlay } from '@/components/study/StudyOverlay';
import { getEntriesForChapters } from '@/data/studyContent';
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
  type LaidPage,
} from '@/lib/bible/pages';
import { loadPlace, savePlace } from '@/lib/bible/storage';
import type { BibleCorpus, Place } from '@/lib/bible/types';

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
  const { settings } = useSettings();
  const osReduced = usePrefersReducedMotion();
  const reduced = settings.reducedMotion || osReduced;

  const [corpus, setCorpus] = useState<BibleCorpus | null>(null);
  const [pages, setPages] = useState<LaidPage[] | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Loading Scripture…');
  const [error, setError] = useState<string | null>(null);
  const [spread, setSpread] = useState(0);
  const [turn, setTurn] = useState<PageTurn | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [verseCheck, setVerseCheck] = useState<string | null>(null);

  const turnRef = useRef<PageTurn | null>(null);
  const suppressClick = useRef(false);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    let cancel = false;
    const run = async () => {
      try {
        setStatus('Loading Scripture…');
        const loaded = await loadBible();
        if (cancel) return;
        setCorpus(loaded);
        setProgress(0.08);
        setStatus('Setting the type…');
        await loadBibleFonts();
        if (cancel) return;
        setStatus('Opening the Book…');
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
          setVerseCheck(`${real.toLocaleString()} verses · ${result.pages.length.toLocaleString()} pages`);
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

  const go = useCallback(
    (delta: number) => {
      if (!pages || blocked) return;
      const count = spreadCount(pages.length);
      const target = spread + delta;
      if (target < 0 || target >= count) return;
      if (turnRef.current) return;
      if (reduced || Math.abs(delta) !== 1) {
        turnRef.current = null;
        setTurn(null);
        setSpread(target);
        return;
      }
      const next: PageTurn = {
        dir: delta > 0 ? 'next' : 'prev',
        token: Date.now(),
        from: spread,
      };
      turnRef.current = next;
      setTurn(next);
    },
    [blocked, pages, reduced, spread],
  );

  const finishTurn = useCallback(() => {
    const current = turnRef.current;
    if (!current) return;
    turnRef.current = null;
    setTurn(null);
    setSpread(current.from + (current.dir === 'next' ? 1 : -1));
  }, []);

  const jumpTo = useCallback(
    (place: Place) => {
      if (!pages) return;
      const index = findPageIndex(pages, place);
      turnRef.current = null;
      setTurn(null);
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
      const place = anchor ?? { bookId: 'GEN', chapter: 1, verse: 1 };
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
      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault();
        if (event.shiftKey) stepChapter(1);
        else go(1);
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        if (event.shiftKey) stepChapter(-1);
        else go(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [blocked, go, stepChapter]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('button, a, input, textarea, select')) return;
    suppressClick.current = false;
    swipe.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!swipe.current) return;
    const dx = event.clientX - swipe.current.x;
    const dy = event.clientY - swipe.current.y;
    if (Math.hypot(dx, dy) > 14) suppressClick.current = true;
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start || blocked) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    suppressClick.current = true;
    go(dx < 0 ? 1 : -1);
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

  if (error) {
    return (
      <div className="loading-screen">
        <p className="promise">Open the Book. See the story. Meet Jesus.</p>
        <h2>The Bible didn’t open</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!pages || !corpus) {
    return (
      <div className="loading-screen" role="status" aria-live="polite">
        <p className="promise">Open the Book. See the story. Meet Jesus.</p>
        <h2>{status}</h2>
        <div className="load-track" aria-hidden="true">
          <div className="load-bar" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <p className="settings-note">World English Bible · public domain</p>
      </div>
    );
  }

  const reading = `${pagePlainText(left)} ${pagePlainText(right)}`.trim();

  return (
    <>
      <BibleScene
        pages={pages}
        spread={spread}
        spreadCount={spreads}
        turn={turn}
        onTurnEnd={finishTurn}
        onPrev={() => go(-1)}
        onNext={() => go(1)}
        entries={entries}
        onSelectEntry={(id) => {
          setEntryId(id);
          setOverlayOpen(true);
        }}
        reducedMotion={reduced}
        ignoreClick={() => suppressClick.current || blocked || turnRef.current != null}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />

      <div className="sr-only" aria-live="polite">
        {label}. {reading}
      </div>

      <div className="hud">
        <PageTurnControls
          label={label}
          spread={spread}
          spreadCount={spreads}
          canGoPrev={spread > 0 && !turn}
          canGoNext={spread < spreads - 1 && !turn}
          onPrev={() => go(-1)}
          onNext={() => go(1)}
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
            Study this page{entries.length > 0 ? ` (${entries.length})` : ''}
          </button>
          <p className="hud-meta">{verseCheck} · WEB</p>
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
