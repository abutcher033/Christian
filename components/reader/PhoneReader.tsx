'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookPicker } from '@/components/bible/BookPicker';
import { useSettings } from '@/components/settings/SettingsProvider';
import { StudyOverlay } from '@/components/study/StudyOverlay';
import { getEntriesForChapters } from '@/data/studyContent';
import { getAmbience } from '@/lib/ambience/engine';
import { slicePassage } from '@/lib/bible/passage';
import {
  chaptersOnSpread,
  describeSpread,
  pagePlainText,
  type LaidPage,
  type LayoutLine,
} from '@/lib/bible/pages';
import { loadPlace, savePlace } from '@/lib/bible/storage';
import type { BibleBook, BibleCorpus, Place } from '@/lib/bible/types';
import { SCENES, sceneById } from '@/lib/study/scenes';

const FONT_PX = 18;
const LINE_PX = 32;
const NUM_PX = 36;
const HINT_KEY = 'christian.phoneHint';

type FitBox = {
  width: number;
  lines: number;
};

type Phase = 'welcome' | 'title' | 'read' | 'end';

type Location = {
  phase: Phase;
  bookIndex: number;
  chapter: number;
  verse: number;
  part: number;
};

function pagesWithVerse(pages: LaidPage[], verse: number): number[] {
  const indexes: number[] = [];
  for (const page of pages) {
    if (page.lines.some((line) => line.kind === 'verse' && line.verse === verse)) indexes.push(page.index);
  }
  return indexes;
}

function resolvePage(pages: LaidPage[], verse: number, part: number): number {
  const indexes = pagesWithVerse(pages, verse);
  if (indexes.length === 0) return 0;
  return indexes[Math.min(Math.max(0, part), indexes.length - 1)];
}

function placeOnPage(pages: LaidPage[], index: number): { verse: number; part: number } {
  const page = pages[index];
  const verse = page?.anchor?.verse ?? 1;
  const part = Math.max(0, pagesWithVerse(pages, verse).indexOf(index));
  return { verse, part };
}

type Box = { width: number; height: number };

/** Pack one chapter into pages by measuring the same type the screen draws. */
function packChapter(book: BibleBook, chapterNumber: number, box: Box): LaidPage[] {
  const probe = document.createElement('div');
  probe.style.position = 'absolute';
  probe.style.left = '-10000px';
  probe.style.top = '0';
  probe.style.width = `${box.width}px`;
  probe.style.fontFamily = '"Libre Baskerville", Georgia, serif';
  probe.style.fontSize = `${FONT_PX}px`;
  probe.style.lineHeight = `${LINE_PX}px`;
  probe.style.visibility = 'hidden';
  document.body.appendChild(probe);

  const chunks: LayoutLine[][] = [];
  let lines: LayoutLine[] = [];

  const overflow = () => probe.scrollHeight > box.height;

  const seal = () => {
    if (lines.length === 0) return;
    chunks.push(lines);
    lines = [];
    probe.replaceChildren();
  };

  const verseNode = (text: string, verse: number, showNumber: boolean) => {
    const row = document.createElement('p');
    row.style.margin = '0';
    row.style.lineHeight = `${LINE_PX}px`;
    row.style.fontSize = `${FONT_PX}px`;
    if (showNumber) {
      const num = document.createElement('span');
      num.textContent = String(verse);
      num.style.float = 'left';
      num.style.width = `${NUM_PX}px`;
      num.style.paddingRight = '0.35rem';
      num.style.textAlign = 'right';
      num.style.fontWeight = '700';
      num.style.fontSize = '12px';
      num.style.lineHeight = `${LINE_PX}px`;
      row.appendChild(num);
    } else {
      row.style.paddingLeft = `${NUM_PX}px`;
    }
    row.appendChild(document.createTextNode(text));
    return row;
  };

  const push = (line: LayoutLine, node: HTMLElement) => {
    probe.appendChild(node);
    lines.push(line);
  };

  const addVerse = (verse: number, text: string, continued: boolean) => {
    const line: LayoutLine = {
      kind: 'verse',
      bookId: book.id,
      bookName: book.name,
      chapter: chapterNumber,
      verse,
      text,
      first: true,
      continued,
    };
    push(line, verseNode(text, verse, true));
    if (!overflow()) return;
    probe.lastChild?.remove();
    lines.pop();
    if (lines.length > 0) {
      seal();
      addVerse(verse, text, continued);
      return;
    }
    const words = text.split(/\s+/).filter(Boolean);
    let best = 1;
    let low = 1;
    let high = words.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const trial = verseNode(words.slice(0, mid).join(' '), verse, true);
      probe.appendChild(trial);
      const fits = !overflow();
      trial.remove();
      if (fits) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    const head = words.slice(0, best).join(' ');
    const rest = words.slice(best).join(' ');
    push({ ...line, text: head }, verseNode(head, verse, true));
    seal();
    if (rest) addVerse(verse, rest, true);
  };

  const heading = document.createElement('p');
  heading.style.margin = '0';
  heading.style.textAlign = 'center';
  heading.style.fontStyle = 'italic';
  heading.style.fontWeight = '700';
  heading.style.lineHeight = `${LINE_PX}px`;
  heading.textContent = `Chapter ${chapterNumber}`;
  push(
    { kind: 'chapter', bookId: book.id, bookName: book.name, chapter: chapterNumber },
    heading,
  );

  const chapter = book.chapters[chapterNumber - 1] ?? [];
  for (let verseIndex = 0; verseIndex < chapter.length; verseIndex += 1) {
    const text = chapter[verseIndex];
    if (!text) continue;
    addVerse(verseIndex + 1, text, false);
  }
  if (lines.length > 0) chunks.push(lines);
  probe.remove();

  return chunks.map((chunk, index) => {
    const firstVerse = chunk.find((line) => line.kind === 'verse');
    return {
      index,
      kind: 'scripture' as const,
      lines: chunk,
      anchor:
        firstVerse && firstVerse.kind === 'verse'
          ? { bookId: book.id, chapter: chapterNumber, verse: firstVerse.verse }
          : null,
      headerLeft: book.name,
      headerRight: String(chapterNumber),
    };
  });
}

function verseSpan(page: LaidPage): string {
  const verses = page.lines.filter((line) => line.kind === 'verse' && line.first);
  if (verses.length === 0) return '';
  const first = verses[0];
  const last = verses[verses.length - 1];
  if (first.kind !== 'verse' || last.kind !== 'verse') return '';
  if (first.chapter === last.chapter && first.verse === last.verse) return `Verse ${first.verse}`;
  if (first.chapter === last.chapter) return `Verses ${first.verse}–${last.verse}`;
  return `Verses ${first.chapter}:${first.verse}–${last.chapter}:${last.verse}`;
}

function PhoneLeaf({ page, motion }: { page: LaidPage; motion: 'next' | 'prev' | 'none' }) {
  const motionClass = motion === 'prev' ? 'is-back' : motion === 'next' ? 'is-forward' : '';

  if (page.kind === 'frontispiece') {
    return (
      <div className={`phone-copy ${motionClass}`} key={page.index}>
        <p className="phone-kicker">Welcome</p>
        <h2>The Holy Bible is open.</h2>
        <p>Swipe sideways, or use Back and Next. One page at a time.</p>
      </div>
    );
  }

  if (page.kind === 'title') {
    return (
      <div className={`phone-copy ${motionClass}`} key={page.index}>
        <p className="phone-kicker">The Holy Bible</p>
        <h2>World English Bible</h2>
        <p>The Old and New Testaments. Public domain.</p>
      </div>
    );
  }

  if (page.kind === 'colophon') {
    return (
      <div className={`phone-copy ${motionClass}`} key={page.index}>
        <p className="phone-kicker">The end</p>
        <h2>Glory to God alone.</h2>
        <p>World English Bible. Public domain.</p>
      </div>
    );
  }

  return (
    <div className={`phone-lines ${motionClass}`} key={page.index}>
      {page.lines.map((line, index) => {
        if (line.kind === 'chapter') {
          return (
            <p className="phone-chapter" key={`${page.index}-c-${index}`}>
              Chapter {line.chapter}
            </p>
          );
        }
        return (
          <p className="phone-line" key={`${page.index}-v-${index}`}>
            {line.first ? <span className="phone-num">{line.verse}</span> : <span className="phone-num" />}
            <span>{line.text}</span>
          </p>
        );
      })}
    </div>
  );
}

export function PhoneReader({ corpus }: { corpus: BibleCorpus }) {
  const { settings, update } = useSettings();
  const scene = sceneById(settings.scene);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<FitBox | null>(null);
  const [loc, setLoc] = useState<Location | null>(null);
  const [motion, setMotion] = useState<'next' | 'prev' | 'none'>('none');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hint, setHint] = useState(false);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const anchorRef = useRef<Place | null>(null);

  useEffect(() => {
    document.body.dataset.phone = '1';
    setHint(window.localStorage.getItem(HINT_KEY) !== '1');
    return () => {
      document.body.dataset.phone = '0';
    };
  }, []);

  useEffect(() => {
    const node = bodyRef.current;
    if (!node) return;
    const measure = () => {
      const style = getComputedStyle(node);
      const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      const width = Math.floor(node.clientWidth - padX);
      const lines = Math.floor((node.clientHeight - padY) / LINE_PX);
      if (width < 100 || lines < 4) return;
      const fitted = Math.max(3, lines - 1);
      setFit((current) => {
        if (current && Math.abs(current.width - width) < 8 && current.lines === fitted) return current;
        return { width, lines: fitted };
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const spec: Box | null = useMemo(
    () => (fit ? { width: fit.width, height: fit.lines * LINE_PX } : null),
    [fit],
  );

  useEffect(() => {
    if (!spec) return;
    setLoc((current) => {
      if (current) return current;
      const saved = loadPlace();
      if (!saved || saved.kind === 'front') {
        return { phase: 'welcome', bookIndex: 0, chapter: 1, verse: 1, part: 0 };
      }
      const bookIndex = corpus.books.findIndex((book) => book.id === saved.bookId);
      if (bookIndex < 0) return { phase: 'welcome', bookIndex: 0, chapter: 1, verse: 1, part: 0 };
      const book = corpus.books[bookIndex];
      const chapter = Math.min(Math.max(1, saved.chapter), book.chapters.length);
      return { phase: 'read', bookIndex, chapter, verse: saved.verse, part: 0 };
    });
  }, [corpus.books, spec]);

  const chapterKey = loc?.phase === 'read' ? `${loc.bookIndex}:${loc.chapter}` : '';
  const chapterPages = useMemo(() => {
    if (!spec || !chapterKey) return null;
    const [bookIndex, chapter] = chapterKey.split(':').map(Number);
    const book = corpus.books[bookIndex];
    if (!book) return null;
    return packChapter(book, chapter, spec);
  }, [chapterKey, corpus.books, spec]);

  const pageIndex =
    loc?.phase === 'read' && chapterPages ? resolvePage(chapterPages, loc.verse, loc.part) : 0;

  const specialPage = (kind: LaidPage['kind']): LaidPage => ({
    index: 0,
    kind,
    lines: [],
    anchor: null,
    headerLeft: '',
    headerRight: '',
  });

  const page =
    loc?.phase === 'welcome'
      ? specialPage('frontispiece')
      : loc?.phase === 'title'
        ? specialPage('title')
        : loc?.phase === 'end'
          ? specialPage('colophon')
          : (chapterPages?.[pageIndex] ?? null);

  const anchor = page?.anchor ?? null;
  anchorRef.current = anchor;
  const label =
    loc?.phase === 'welcome'
      ? 'Welcome'
      : loc?.phase === 'title'
        ? 'Title page'
        : loc?.phase === 'end'
          ? 'The end'
          : page
            ? describeSpread(page, null)
            : 'Holy Bible';
  const chapters = page && loc?.phase === 'read' ? chaptersOnSpread(page, null) : [];
  const entries = getEntriesForChapters(chapters);
  const blocked = pickerOpen || overlayOpen || menuOpen;

  useEffect(() => {
    if (!loc) return;
    if (loc.phase === 'welcome') savePlace({ kind: 'front' });
    else if (anchor) savePlace({ kind: 'ref', ...anchor });
  }, [anchor, loc]);

  const closeSheets = () => {
    setPickerOpen(false);
    setOverlayOpen(false);
    setEntryId(null);
    setMenuOpen(false);
  };

  const go = useCallback(
    (dir: 'next' | 'prev') => {
      if (!spec || !loc || blocked) return;
      const turn = (next: Location) => {
        setMotion(dir);
        setLoc(next);
        getAmbience().rustle();
      };
      const book = corpus.books[loc.bookIndex];
      if (!book) return;

      if (loc.phase === 'welcome') {
        if (dir === 'next') turn({ ...loc, phase: 'title' });
        return;
      }
      if (loc.phase === 'title') {
        if (dir === 'next') turn({ phase: 'read', bookIndex: 0, chapter: 1, verse: 1, part: 0 });
        else turn({ ...loc, phase: 'welcome' });
        return;
      }
      if (loc.phase === 'end') {
        if (dir === 'prev') {
          const lastBook = corpus.books.length - 1;
          const lastChapter = corpus.books[lastBook].chapters.length;
          const laid = packChapter(corpus.books[lastBook], lastChapter, spec);
          const last = placeOnPage(laid, Math.max(0, laid.length - 1));
          turn({ phase: 'read', bookIndex: lastBook, chapter: lastChapter, ...last });
        }
        return;
      }

      const laid = chapterPages ?? packChapter(book, loc.chapter, spec);
      const here = resolvePage(laid, loc.verse, loc.part);
      if (dir === 'next') {
        if (here < laid.length - 1) {
          turn({ ...loc, ...placeOnPage(laid, here + 1) });
          return;
        }
        if (loc.chapter < book.chapters.length) {
          turn({ ...loc, chapter: loc.chapter + 1, verse: 1, part: 0 });
          return;
        }
        if (loc.bookIndex < corpus.books.length - 1) {
          turn({ phase: 'read', bookIndex: loc.bookIndex + 1, chapter: 1, verse: 1, part: 0 });
          return;
        }
        turn({ ...loc, phase: 'end' });
        return;
      }

      if (here > 0) {
        turn({ ...loc, ...placeOnPage(laid, here - 1) });
        return;
      }
      if (loc.chapter > 1) {
        const prev = packChapter(book, loc.chapter - 1, spec);
        turn({ ...loc, chapter: loc.chapter - 1, ...placeOnPage(prev, Math.max(0, prev.length - 1)) });
        return;
      }
      if (loc.bookIndex > 0) {
        const prevBook = corpus.books[loc.bookIndex - 1];
        const prevChapter = prevBook.chapters.length;
        const prev = packChapter(prevBook, prevChapter, spec);
        turn({
          phase: 'read',
          bookIndex: loc.bookIndex - 1,
          chapter: prevChapter,
          ...placeOnPage(prev, Math.max(0, prev.length - 1)),
        });
        return;
      }
      turn({ ...loc, phase: 'title' });
    },
    [blocked, chapterPages, corpus.books, loc, spec],
  );

  const jumpTo = useCallback(
    (place: Place) => {
      if (!spec) return;
      const bookIndex = corpus.books.findIndex((book) => book.id === place.bookId);
      if (bookIndex < 0) return;
      const book = corpus.books[bookIndex];
      const chapter = Math.min(Math.max(1, place.chapter), book.chapters.length);
      const verse = Math.min(Math.max(1, place.verse), book.chapters[chapter - 1]?.length ?? 1);
      setMotion('none');
      setLoc({ phase: 'read', bookIndex, chapter, verse, part: 0 });
      closeSheets();
    },
    [corpus.books, spec],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
      ) {
        return;
      }
      if (event.key === 'Escape') {
        setPickerOpen(false);
        setOverlayOpen(false);
        setMenuOpen(false);
        setEntryId(null);
        return;
      }
      if (blocked) return;
      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault();
        go('next');
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        go('prev');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [blocked, go]);

  const onPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('button, a, input')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    swipe.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: React.PointerEvent<HTMLElement>) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start || blocked) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.15) return;
    go(dx < 0 ? 'next' : 'prev');
  };

  const copyPlace = async () => {
    const bookName = anchor ? corpus.books.find((book) => book.id === anchor.bookId)?.name : null;
    const text =
      anchor && bookName
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

  const passage =
    anchor
      ? slicePassage(
          corpus,
          corpus.books.find((book) => book.id === anchor.bookId)?.name ?? '',
          anchor.chapter,
          anchor.verse,
          anchor.verse,
        )
      : null;

  const dismissHint = () => {
    window.localStorage.setItem(HINT_KEY, '1');
    setHint(false);
  };

  const span = page ? verseSpan(page) : '';
  const reading = pagePlainText(page);

  return (
    <div className={settings.reducedMotion ? 'phone-app is-still' : 'phone-app'} style={{ background: scene.background }}>
      <header className="phone-toolbar">
        <p className="phone-brand">Christian</p>
        <div className="phone-tools">
          <button type="button" onClick={() => setOverlayOpen(true)}>
            Notes{entries.length > 0 ? ` ${entries.length}` : ''}
          </button>
          <button
            type="button"
            aria-pressed={settings.soundOn}
            onClick={() => update({ soundOn: !settings.soundOn })}
          >
            {settings.soundOn ? 'Sound on' : 'Sound off'}
          </button>
          <button type="button" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
            Room
          </button>
        </div>
      </header>

      <article
        className="phone-sheet"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <button type="button" className="phone-sheet-title" onClick={() => setPickerOpen(true)} disabled={!loc}>
          <span>{label}</span>
          {span ? <small>{span}</small> : null}
        </button>
        <div
          className="phone-body"
          ref={bodyRef}
          style={{ ['--phone-line' as string]: `${LINE_PX}px`, ['--phone-num' as string]: `${NUM_PX}px` }}
        >
          {!page ? <p className="phone-status">Opening the page…</p> : null}
          {page ? (
            <PhoneLeaf
              key={`${loc?.phase}-${loc?.bookIndex}-${loc?.chapter}-${pageIndex}`}
              page={page}
              motion={motion}
            />
          ) : null}
        </div>
        <p className="phone-folio">
          {loc?.phase === 'read' && chapterPages
            ? `${(pageIndex + 1).toLocaleString()} of ${chapterPages.length.toLocaleString()}`
            : ' '}
        </p>
      </article>

      {hint && loc ? (
        <p className="phone-hint">
          Swipe sideways to turn the page.
          <button type="button" onClick={dismissHint}>
            Got it
          </button>
        </p>
      ) : null}

      <div className="phone-progress" aria-hidden="true">
        <span
          style={{
            width:
              loc?.phase === 'end'
                ? '100%'
                : loc?.phase === 'read' && chapterPages && chapterPages.length > 1
                  ? `${(pageIndex / (chapterPages.length - 1)) * 100}%`
                  : '0%',
          }}
        />
      </div>

      <nav className="phone-nav" aria-label="Turn the page">
        <button type="button" onClick={() => go('prev')} disabled={!loc || loc.phase === 'welcome'}>
          Back
        </button>
        <button type="button" onClick={() => go('next')} disabled={!loc || loc.phase === 'end'}>
          Next
        </button>
      </nav>

      <p className="sr-only" aria-live="polite">
        {label}. {span}. {reading}
      </p>

      {menuOpen ? (
        <div className="phone-menu-backdrop" onClick={() => setMenuOpen(false)}>
          <div
            className="phone-menu"
            role="dialog"
            aria-modal="true"
            aria-label="The room"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <h2>The room</h2>
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close">
                Close
              </button>
            </header>
            <p className="phone-menu-note">{scene.description}</p>
            <div className="phone-scenes" role="radiogroup" aria-label="Choose the room">
              {SCENES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={item.id === settings.scene}
                  className={item.id === settings.scene ? 'is-on' : undefined}
                  onClick={() => update({ scene: item.id })}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <label className="phone-volume">
              Volume
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(settings.volume * 100)}
                disabled={!settings.soundOn}
                onChange={(event) => update({ volume: Number(event.target.value) / 100 })}
              />
            </label>
            <button type="button" className="phone-menu-action" onClick={() => void copyPlace()}>
              {copied ? 'Copied' : 'Copy reference'}
            </button>
            <Link href="/settings" className="phone-menu-action">
              Settings
            </Link>
          </div>
        </div>
      ) : null}

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
    </div>
  );
}
