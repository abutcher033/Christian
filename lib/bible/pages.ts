import type { BibleBook, BibleCorpus, Place } from './types';

export const PAGE_W = 1200;
export const PAGE_H = 1700;
/** Backing-store scale. Layout stays in PAGE_W × PAGE_H so page breaks do not move. */
export const PAGE_SCALE = 2;
export const MARGIN_X = 78;
export const BODY_TOP = 168;
export const LINE_H = 62;
export const BODY_BOTTOM = 1604;
export const MAX_LINES = Math.floor((BODY_BOTTOM - BODY_TOP) / LINE_H);
/** Left column reserved for verse numbers, so every line of a verse shares one measure. */
export const NUM_COL = 72;

const BODY_FONT = '44px "Libre Baskerville", Georgia, serif';
const NUM_FONT = '700 24px "Libre Baskerville", Georgia, serif';
const HEADER_FONT = '700 28px "Libre Baskerville", Georgia, serif';
const CHAPTER_FONT = 'italic 700 36px "Libre Baskerville", Georgia, serif';

export type VerseLine = {
  kind: 'verse';
  bookId: string;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
  /** Draw the verse number on this line. */
  first: boolean;
  /** True when this is the first line of a verse continued from the previous page. */
  continued: boolean;
};

export type ChapterLine = {
  kind: 'chapter';
  bookId: string;
  bookName: string;
  chapter: number;
};

export type LayoutLine = VerseLine | ChapterLine;

export type PageKind = 'frontispiece' | 'title' | 'scripture' | 'colophon';

export type LaidPage = {
  index: number;
  kind: PageKind;
  lines: LayoutLine[];
  anchor: { bookId: string; chapter: number; verse: number } | null;
  headerLeft: string;
  headerRight: string;
};

export function countRealVerses(corpus: BibleCorpus): number {
  let count = 0;
  for (const book of corpus.books) {
    for (const chapter of book.chapters) {
      for (const verse of chapter) {
        if (verse) count += 1;
      }
    }
  }
  return count;
}

export function countStartedVerses(pages: LaidPage[]): number {
  let count = 0;
  for (const page of pages) {
    for (const line of page.lines) {
      if (line.kind === 'verse' && line.first && !line.continued) count += 1;
    }
  }
  return count;
}

function wrapVerse(ctx: CanvasRenderingContext2D, text: string): string[] {
  ctx.font = BODY_FONT;
  const maxW = PAGE_W - MARGIN_X * 2 - NUM_COL;
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(trial).width > maxW) {
      lines.push(current);
      current = word;
    } else {
      current = trial;
    }
  }
  if (current || lines.length === 0) lines.push(current);
  return lines;
}

function makeSpecial(kind: Exclude<PageKind, 'scripture'>, index: number): LaidPage {
  if (kind === 'frontispiece') {
    return {
      index,
      kind,
      lines: [],
      anchor: null,
      headerLeft: 'Christian',
      headerRight: '',
    };
  }
  if (kind === 'title') {
    return {
      index,
      kind,
      lines: [],
      anchor: null,
      headerLeft: 'Holy Bible',
      headerRight: '',
    };
  }
  return {
    index,
    kind,
    lines: [],
    anchor: null,
    headerLeft: 'End',
    headerRight: '',
  };
}

function makeScripture(index: number, lines: LayoutLine[]): LaidPage {
  const refs: { bookId: string; bookName: string; chapter: number }[] = [];
  let anchor: LaidPage['anchor'] = null;
  for (const line of lines) {
    if (!anchor && line.kind === 'verse') {
      anchor = { bookId: line.bookId, chapter: line.chapter, verse: line.verse };
    }
    const last = refs[refs.length - 1];
    if (!last || last.bookId !== line.bookId || last.chapter !== line.chapter) {
      refs.push({ bookId: line.bookId, bookName: line.bookName, chapter: line.chapter });
    }
  }

  let headerLeft = 'Holy Bible';
  let headerRight = 'WEB';
  if (refs.length === 1) {
    headerLeft = refs[0].bookName;
    headerRight = String(refs[0].chapter);
  } else if (refs.length > 1) {
    const sameBook = refs.every((ref) => ref.bookId === refs[0].bookId);
    headerLeft = refs[0].bookName;
    headerRight = sameBook
      ? `${refs[0].chapter}–${refs[refs.length - 1].chapter}`
      : refs[refs.length - 1].bookName;
  }

  return {
    index,
    kind: 'scripture',
    lines,
    anchor,
    headerLeft,
    headerRight,
  };
}

type Paginator = {
  /** Advance layout work for up to `maxMs`. Returns pages once the canon is bound. */
  work: (maxMs: number) => { done: boolean; progress: number; pages: LaidPage[] | null };
};

/**
 * Lay the Protestant canon onto readable pages.
 * Call `work` across frames so the loading screen can paint.
 */
export function createPaginator(corpus: BibleCorpus): Paginator {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not prepare the page canvas.');
  const ctx: CanvasRenderingContext2D = context;

  const totalVerses = Math.max(1, countRealVerses(corpus));
  const pages: LaidPage[] = [makeSpecial('frontispiece', 0), makeSpecial('title', 1)];
  let current: LayoutLine[] = [];
  let bookIndex = 0;
  let chapterIndex = 0;
  let verseIndex = 0;
  let fragment: string[] | null = null;
  let fragmentAt = 0;
  let headingPlaced = false;
  let processed = 0;
  let done = false;

  const room = () => MAX_LINES - current.length;

  function seal() {
    if (current.length === 0) return;
    pages.push(makeScripture(pages.length, current));
    current = [];
  }

  function stepBook(book: BibleBook) {
    if (chapterIndex >= book.chapters.length) {
      bookIndex += 1;
      chapterIndex = 0;
      verseIndex = 0;
      headingPlaced = false;
      fragment = null;
      fragmentAt = 0;
      return;
    }

    const chapter = book.chapters[chapterIndex];
    const chapterNumber = chapterIndex + 1;

    if (verseIndex >= chapter.length) {
      chapterIndex += 1;
      verseIndex = 0;
      headingPlaced = false;
      fragment = null;
      fragmentAt = 0;
      return;
    }

    if (!headingPlaced) {
      if (room() < 3) seal();
      current.push({
        kind: 'chapter',
        bookId: book.id,
        bookName: book.name,
        chapter: chapterNumber,
      });
      headingPlaced = true;
    }

    const text = chapter[verseIndex];
    const verseNumber = verseIndex + 1;
    if (!text) {
      verseIndex += 1;
      return;
    }

    if (!fragment) {
      fragment = wrapVerse(ctx, text);
      fragmentAt = 0;
    }

    if (room() === 0) seal();
    const take = Math.min(room(), fragment.length - fragmentAt);
    if (take <= 0) {
      seal();
      return;
    }

    for (let i = 0; i < take; i += 1) {
      const absolute = fragmentAt + i;
      current.push({
        kind: 'verse',
        bookId: book.id,
        bookName: book.name,
        chapter: chapterNumber,
        verse: verseNumber,
        text: fragment[absolute],
        first: absolute === 0 || i === 0,
        continued: absolute > 0 && i === 0,
      });
    }

    fragmentAt += take;
    if (fragmentAt >= fragment.length) {
      processed += 1;
      verseIndex += 1;
      fragment = null;
      fragmentAt = 0;
    }
  }

  return {
    work(maxMs: number) {
      const started = performance.now();
      while (!done && performance.now() - started < maxMs) {
        if (bookIndex >= corpus.books.length) {
          seal();
          pages.push(makeSpecial('colophon', pages.length));
          done = true;
          break;
        }
        stepBook(corpus.books[bookIndex]);
      }
      return {
        done,
        progress: done ? 1 : Math.min(0.99, processed / totalVerses),
        pages: done ? pages : null,
      };
    },
  };
}

export function findPageIndex(pages: LaidPage[], place: Place): number {
  let nearest = -1;
  for (const page of pages) {
    for (const line of page.lines) {
      if (line.kind !== 'verse') continue;
      if (line.bookId !== place.bookId || line.chapter !== place.chapter) continue;
      if (line.verse === place.verse && line.first && !line.continued) return page.index;
      if (line.verse >= place.verse && line.first && !line.continued && nearest < 0) {
        nearest = page.index;
      }
    }
  }
  if (nearest >= 0) return nearest;
  for (const page of pages) {
    for (const line of page.lines) {
      if (line.bookId === place.bookId && line.chapter === place.chapter) return page.index;
    }
  }
  const firstScripture = pages.find((page) => page.kind === 'scripture');
  return firstScripture?.index ?? 0;
}

export function spreadCount(pageCount: number): number {
  return Math.ceil(pageCount / 2);
}

export function pageOnSpread(pages: LaidPage[], spread: number, side: 'left' | 'right'): LaidPage | null {
  const index = spread * 2 + (side === 'right' ? 1 : 0);
  return pages[index] ?? null;
}

export type ChapterRef = { book: string; bookId: string; chapter: number };

export function chaptersOnSpread(left: LaidPage | null, right: LaidPage | null): ChapterRef[] {
  const refs: ChapterRef[] = [];
  const seen = new Set<string>();
  for (const page of [left, right]) {
    if (!page) continue;
    for (const line of page.lines) {
      const key = `${line.bookId}:${line.chapter}`;
      if (seen.has(key)) continue;
      seen.add(key);
      refs.push({ book: line.bookName, bookId: line.bookId, chapter: line.chapter });
    }
  }
  return refs;
}

export function spreadAnchor(left: LaidPage | null, right: LaidPage | null): Place | null {
  return left?.anchor ?? right?.anchor ?? null;
}

function paintPaper(ctx: CanvasRenderingContext2D, spine: 'left' | 'right') {
  ctx.fillStyle = '#f6f1e6';
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  const tooth = ctx.createLinearGradient(0, 0, PAGE_W, PAGE_H);
  tooth.addColorStop(0, 'rgba(255, 252, 246, 0.55)');
  tooth.addColorStop(1, 'rgba(214, 196, 168, 0.16)');
  ctx.fillStyle = tooth;
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  ctx.save();
  ctx.globalAlpha = 0.045;
  let seed = spine === 'left' ? 19 : 47;
  for (let i = 0; i < 900; i += 1) {
    seed = (seed * 16807 + 13) % 2147483647;
    const x = (seed % PAGE_W);
    seed = (seed * 16807 + 13) % 2147483647;
    const y = seed % PAGE_H;
    ctx.fillStyle = i % 4 === 0 ? '#b89a74' : '#fffdf8';
    ctx.fillRect(x, y, 1.4, 1.4);
  }
  ctx.restore();

  const gutter = ctx.createLinearGradient(spine === 'left' ? 0 : PAGE_W, 0, spine === 'left' ? 110 : PAGE_W - 110, 0);
  gutter.addColorStop(0, 'rgba(92, 64, 38, 0.13)');
  gutter.addColorStop(1, 'rgba(92, 64, 38, 0)');
  ctx.fillStyle = gutter;
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  const edge = ctx.createLinearGradient(0, 0, 0, PAGE_H);
  edge.addColorStop(0, 'rgba(120, 90, 58, 0.05)');
  edge.addColorStop(0.04, 'rgba(120, 90, 58, 0)');
  edge.addColorStop(0.96, 'rgba(120, 90, 58, 0)');
  edge.addColorStop(1, 'rgba(120, 90, 58, 0.06)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);
}

function drawCentered(ctx: CanvasRenderingContext2D, text: string, y: number) {
  ctx.textAlign = 'center';
  ctx.fillText(text, PAGE_W / 2, y);
}

function drawFrontispiece(ctx: CanvasRenderingContext2D) {
  paintPaper(ctx, 'right');
  ctx.fillStyle = '#c4a35a';
  ctx.fillRect(PAGE_W / 2 - 70, 430, 140, 2);
  ctx.fillStyle = '#5c3d2e';
  ctx.font = 'italic 700 64px "Libre Baskerville", Georgia, serif';
  drawCentered(ctx, 'Welcome', 560);
  ctx.font = '40px "Libre Baskerville", Georgia, serif';
  ctx.fillStyle = '#3b2618';
  drawCentered(ctx, 'The Holy Bible', 680);
  drawCentered(ctx, 'is open on the desk.', 750);
  ctx.fillStyle = '#c4a35a';
  ctx.fillRect(PAGE_W / 2 - 70, 820, 140, 2);
  ctx.font = 'italic 32px "Libre Baskerville", Georgia, serif';
  ctx.fillStyle = '#6e5336';
  drawCentered(ctx, 'Turn the page to begin.', 900);
}

function drawTitle(ctx: CanvasRenderingContext2D) {
  paintPaper(ctx, 'left');
  ctx.fillStyle = '#8a6230';
  ctx.font = '700 28px "Libre Baskerville", Georgia, serif';
  drawCentered(ctx, 'THE HOLY BIBLE', 500);
  ctx.fillStyle = '#c4a35a';
  ctx.fillRect(PAGE_W / 2 - 120, 540, 240, 2);
  ctx.fillStyle = '#3b2618';
  ctx.font = 'italic 700 68px "Libre Baskerville", Georgia, serif';
  drawCentered(ctx, 'World English', 660);
  drawCentered(ctx, 'Bible', 750);
  ctx.font = 'italic 30px "Libre Baskerville", Georgia, serif';
  ctx.fillStyle = '#6b5e52';
  drawCentered(ctx, 'The Old and New Testaments', 880);
  ctx.font = '26px "Libre Baskerville", Georgia, serif';
  drawCentered(ctx, 'Public domain', 980);
  ctx.font = 'italic 24px "Libre Baskerville", Georgia, serif';
  ctx.fillStyle = '#8a6230';
  drawCentered(ctx, 'Open the Book. See the story. Meet Jesus.', 1120);
}

function drawColophon(ctx: CanvasRenderingContext2D, page: LaidPage) {
  paintPaper(ctx, page.index % 2 === 0 ? 'right' : 'left');
  ctx.fillStyle = '#c4a35a';
  ctx.fillRect(PAGE_W / 2 - 70, 560, 140, 2);
  ctx.fillStyle = '#5c3d2e';
  ctx.font = 'italic 42px "Libre Baskerville", Georgia, serif';
  drawCentered(ctx, 'The end of the Bible', 700);
  ctx.font = 'italic 32px "Libre Baskerville", Georgia, serif';
  ctx.fillStyle = '#8a6230';
  drawCentered(ctx, 'Glory to God alone.', 820);
  ctx.font = '24px "Libre Baskerville", Georgia, serif';
  ctx.fillStyle = '#6b5e52';
  drawCentered(ctx, 'World English Bible', 980);
  drawCentered(ctx, 'Public domain', 1024);
}

function drawScripture(ctx: CanvasRenderingContext2D, page: LaidPage) {
  paintPaper(ctx, page.index % 2 === 0 ? 'right' : 'left');
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#6e5336';
  ctx.font = HEADER_FONT;
  ctx.textAlign = 'left';
  ctx.fillText(page.headerLeft, MARGIN_X, 92);
  ctx.textAlign = 'right';
  ctx.fillText(page.headerRight, PAGE_W - MARGIN_X, 92);

  ctx.fillStyle = '#c4a35a';
  ctx.fillRect(MARGIN_X, 114, PAGE_W - MARGIN_X * 2, 3);

  page.lines.forEach((line, slot) => {
    const y = BODY_TOP + slot * LINE_H;
    if (line.kind === 'chapter') {
      ctx.textAlign = 'center';
      ctx.font = CHAPTER_FONT;
      ctx.fillStyle = '#5c3d2e';
      ctx.fillText(`Chapter ${line.chapter}`, PAGE_W / 2, y);
      return;
    }

    ctx.textAlign = 'left';
    if (line.first) {
      ctx.font = NUM_FONT;
      ctx.fillStyle = '#8a6230';
      ctx.fillText(String(line.verse), MARGIN_X, y - 10);
    }

    ctx.font = BODY_FONT;
    ctx.fillStyle = '#1a120c';
    ctx.fillText(line.text, MARGIN_X + NUM_COL, y);
  });

  ctx.textAlign = 'center';
  ctx.font = '22px "Libre Baskerville", Georgia, serif';
  ctx.fillStyle = '#8d7762';
  ctx.fillText(String(page.index + 1), PAGE_W / 2, PAGE_H - 64);
}

export function drawPage(ctx: CanvasRenderingContext2D, page: LaidPage | null) {
  ctx.clearRect(0, 0, PAGE_W, PAGE_H);
  ctx.textBaseline = 'alphabetic';
  if (!page) {
    paintPaper(ctx, 'left');
    return;
  }
  if (page.kind === 'frontispiece') {
    drawFrontispiece(ctx);
    return;
  }
  if (page.kind === 'title') {
    drawTitle(ctx);
    return;
  }
  if (page.kind === 'colophon') {
    drawColophon(ctx, page);
    return;
  }
  drawScripture(ctx, page);
}

/** Plain-text reading of a page, for the screen reader. */
export function pagePlainText(page: LaidPage | null): string {
  if (!page) return '';
  if (page.kind === 'frontispiece') {
    return 'Welcome. The Holy Bible is open on the desk. Turn the page to begin.';
  }
  if (page.kind === 'title') {
    return 'The Holy Bible. World English Bible. The Old and New Testaments. Public domain.';
  }
  if (page.kind === 'colophon') {
    return 'The end of the Bible. Glory to God alone. World English Bible. Public domain.';
  }
  const parts: string[] = [];
  for (const line of page.lines) {
    if (line.kind === 'chapter') {
      parts.push(`${line.bookName} chapter ${line.chapter}.`);
    } else if (line.first) {
      parts.push(`${line.verse} ${line.text}`);
    } else {
      parts.push(line.text);
    }
  }
  return parts.join(' ');
}

export function describeSpread(left: LaidPage | null, right: LaidPage | null): string {
  const chapters = chaptersOnSpread(left, right);
  if (chapters.length === 0) {
    const names = [left, right].map((page) => {
      if (!page) return null;
      if (page.kind === 'frontispiece') return 'Welcome';
      if (page.kind === 'title') return 'Title page';
      if (page.kind === 'colophon') return 'The end';
      return null;
    });
    const unique = names.filter((name, index) => name && names.indexOf(name) === index);
    return unique.join(' · ') || 'Holy Bible';
  }

  const parts: string[] = [];
  let index = 0;
  while (index < chapters.length) {
    const start = chapters[index];
    let end = start.chapter;
    let next = index + 1;
    while (
      next < chapters.length &&
      chapters[next].bookId === start.bookId &&
      chapters[next].chapter === end + 1
    ) {
      end = chapters[next].chapter;
      next += 1;
    }
    parts.push(end === start.chapter ? `${start.book} ${start.chapter}` : `${start.book} ${start.chapter}–${end}`);
    index = next;
  }
  return parts.join(' · ');
}

/** Leaf numbers for the open spread, counted the way a printed Bible counts pages. */
export function spreadPageLabel(spread: number, pageCount: number): string {
  const start = spread * 2 + 1;
  const end = Math.min(pageCount, start + 1);
  const total = pageCount.toLocaleString();
  if (start >= end) return `Page ${start.toLocaleString()} of ${total}`;
  return `Pages ${start.toLocaleString()}–${end.toLocaleString()} of ${total}`;
}
