import type { BibleBook, BibleCorpus, Place } from './types';

export const PAGE_W = 1200;
export const PAGE_H = 1700;
export const MARGIN_X = 86;
export const BODY_TOP = 172;
export const LINE_H = 52;
export const BODY_BOTTOM = 1588;
export const MAX_LINES = Math.floor((BODY_BOTTOM - BODY_TOP) / LINE_H);
/** Left column reserved for verse numbers, so every line of a verse shares one measure. */
export const NUM_COL = 78;

const BODY_FONT = '36px "Libre Baskerville", Georgia, serif';
const NUM_FONT = '700 22px "Libre Baskerville", Georgia, serif';
const HEADER_FONT = '700 26px "Libre Baskerville", Georgia, serif';
const CHAPTER_FONT = 'italic 700 34px "Libre Baskerville", Georgia, serif';

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
      headerRight: 'WEB',
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

function paintPaper(ctx: CanvasRenderingContext2D) {
  const wash = ctx.createLinearGradient(0, 0, PAGE_W, PAGE_H);
  wash.addColorStop(0, '#fbf7f0');
  wash.addColorStop(0.55, '#f6f0e4');
  wash.addColorStop(1, '#efe4d2');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  const glow = ctx.createRadialGradient(
    PAGE_W * 0.5,
    PAGE_H * 0.42,
    PAGE_W * 0.1,
    PAGE_W * 0.5,
    PAGE_H * 0.5,
    PAGE_W * 0.78,
  );
  glow.addColorStop(0, 'rgba(255, 252, 245, 0.35)');
  glow.addColorStop(1, 'rgba(120, 84, 48, 0.07)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  ctx.save();
  for (let i = 0; i < 1400; i += 1) {
    const x = Math.random() * PAGE_W;
    const y = Math.random() * PAGE_H;
    ctx.globalAlpha = Math.random() * 0.045;
    ctx.fillStyle = Math.random() > 0.5 ? '#8a6844' : '#fffaf2';
    ctx.fillRect(x, y, 1 + Math.random() * 1.6, 0.7);
  }
  ctx.restore();

  ctx.strokeStyle = 'rgba(140, 104, 62, 0.28)';
  ctx.lineWidth = 2;
  ctx.strokeRect(34, 34, PAGE_W - 68, PAGE_H - 68);
}

function drawCentered(ctx: CanvasRenderingContext2D, text: string, y: number) {
  ctx.textAlign = 'center';
  ctx.fillText(text, PAGE_W / 2, y);
}

function drawFrontispiece(ctx: CanvasRenderingContext2D) {
  paintPaper(ctx);
  ctx.fillStyle = '#c4a35a';
  ctx.fillRect(PAGE_W / 2 - 70, 470, 140, 2);
  ctx.fillStyle = '#5c3d2e';
  ctx.font = 'italic 700 58px "Libre Baskerville", Georgia, serif';
  drawCentered(ctx, 'Open the Book.', 620);
  drawCentered(ctx, 'See the story.', 710);
  drawCentered(ctx, 'Meet Jesus.', 800);
  ctx.fillStyle = '#c4a35a';
  ctx.fillRect(PAGE_W / 2 - 70, 880, 140, 2);
  ctx.font = '28px "Libre Baskerville", Georgia, serif';
  ctx.fillStyle = '#6e5336';
  drawCentered(ctx, 'Christian', 960);
}

function drawTitle(ctx: CanvasRenderingContext2D) {
  paintPaper(ctx);
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
  drawCentered(ctx, 'Containing the Old and New Testaments', 880);
  ctx.font = '26px "Libre Baskerville", Georgia, serif';
  drawCentered(ctx, 'Public Domain', 980);
  ctx.font = 'italic 24px "Libre Baskerville", Georgia, serif';
  ctx.fillStyle = '#8a6230';
  drawCentered(ctx, 'Open the Book. See the story. Meet Jesus.', 1120);
}

function drawColophon(ctx: CanvasRenderingContext2D) {
  paintPaper(ctx);
  ctx.fillStyle = '#c4a35a';
  ctx.fillRect(PAGE_W / 2 - 70, 560, 140, 2);
  ctx.fillStyle = '#5c3d2e';
  ctx.font = 'italic 42px "Libre Baskerville", Georgia, serif';
  drawCentered(ctx, 'Here ends', 680);
  drawCentered(ctx, 'the reading.', 760);
  ctx.font = 'italic 32px "Libre Baskerville", Georgia, serif';
  ctx.fillStyle = '#8a6230';
  drawCentered(ctx, 'Soli Deo gloria', 900);
  ctx.font = '24px "Libre Baskerville", Georgia, serif';
  ctx.fillStyle = '#6b5e52';
  drawCentered(ctx, 'World English Bible', 1040);
  drawCentered(ctx, 'Public Domain', 1084);
}

function drawScripture(ctx: CanvasRenderingContext2D, page: LaidPage) {
  paintPaper(ctx);
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
    ctx.fillStyle = '#1c140f';
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
    paintPaper(ctx);
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
    drawColophon(ctx);
    return;
  }
  drawScripture(ctx, page);
}

/** Plain-text reading of a page, for the screen reader. */
export function pagePlainText(page: LaidPage | null): string {
  if (!page) return '';
  if (page.kind === 'frontispiece') {
    return 'Open the Book. See the story. Meet Jesus. Christian.';
  }
  if (page.kind === 'title') {
    return 'The Holy Bible. World English Bible. Public Domain. Containing the Old and New Testaments.';
  }
  if (page.kind === 'colophon') {
    return 'Here ends the reading. Soli Deo gloria. World English Bible. Public Domain.';
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
  const label = (page: LaidPage | null) => {
    if (!page) return null;
    if (page.kind === 'frontispiece') return 'Open the Book';
    if (page.kind === 'title') return 'Holy Bible';
    if (page.kind === 'colophon') return 'End';
    if (page.headerRight) return `${page.headerLeft} ${page.headerRight}`;
    return page.headerLeft;
  };
  const a = label(left);
  const b = label(right);
  if (a && b && a !== b) return `${a}  ·  ${b}`;
  return a || b || 'Holy Bible';
}
