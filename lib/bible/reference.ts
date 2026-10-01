import type { BibleBook, Place } from './types';

/** Extra ways readers type a book name. Canonical name and abbreviation are always included. */
const EXTRA_ALIASES: Record<string, string[]> = {
  GEN: ['gn', 'ge'],
  EXO: ['ex'],
  LEV: ['lv'],
  NUM: ['nm', 'nb'],
  DEU: ['dt'],
  JOS: ['josh'],
  JDG: ['jgs', 'jg'],
  RUT: ['ru'],
  '1SA': ['1 sam', '1sam'],
  '2SA': ['2 sam', '2sam'],
  '1KI': ['1 kgs', '1kgs', '1 kings'],
  '2KI': ['2 kgs', '2kgs', '2 kings'],
  '1CH': ['1 chr', '1chr', '1 chron'],
  '2CH': ['2 chr', '2chr', '2 chron'],
  EZR: ['ezr'],
  NEH: ['ne'],
  EST: ['est'],
  JOB: ['jb'],
  PSA: ['psalm', 'psa', 'psalm'],
  PRO: ['prv', 'pr'],
  ECC: ['ec', 'qoheleth'],
  SNG: ['song of songs', 'canticles', 'canticle of canticles', 'sos'],
  ISA: ['is'],
  JER: ['je'],
  LAM: ['la'],
  EZK: ['ez', 'ezek'],
  DAN: ['dn', 'da'],
  HOS: ['ho'],
  JOL: ['jl'],
  AMO: ['am'],
  OBA: ['ob'],
  JON: ['jnh'],
  MIC: ['mi'],
  NAM: ['na'],
  HAB: ['hb'],
  ZEP: ['zp'],
  HAG: ['hg'],
  ZEC: ['zec', 'zach'],
  MAL: ['ml'],
  MAT: ['mt', 'matt'],
  MRK: ['mk', 'mr'],
  LUK: ['lk'],
  JHN: ['jn', 'joh'],
  ACT: ['ac'],
  ROM: ['ro', 'rm'],
  '1CO': ['1 cor', '1cor'],
  '2CO': ['2 cor', '2cor'],
  GAL: ['ga'],
  EPH: ['ep'],
  PHP: ['php', 'pp'],
  COL: ['co'],
  '1TH': ['1 thess', '1thess', '1 th'],
  '2TH': ['2 thess', '2thess', '2 th'],
  '1TI': ['1 tim', '1tim'],
  '2TI': ['2 tim', '2tim'],
  TIT: ['ti'],
  PHM: ['philem', 'pm'],
  HEB: ['hb'],
  JAS: ['jm', 'jas'],
  '1PE': ['1 pet', '1pet', '1 pt'],
  '2PE': ['2 pet', '2pet', '2 pt'],
  '1JN': ['1 jn', '1jn', '1 john'],
  '2JN': ['2 jn', '2jn', '2 john'],
  '3JN': ['3 jn', '3jn', '3 john'],
  JUD: ['jd'],
  REV: ['revelations', 'rv', 'apoc'],
};

function labelsFor(book: BibleBook): string[] {
  const base = [
    book.name.toLowerCase(),
    book.abbr.toLowerCase().replace(/\./g, ''),
    ...(EXTRA_ALIASES[book.id] ?? []),
  ];
  const all = new Set<string>();
  for (const label of base) {
    const cleaned = label.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
    if (!cleaned) continue;
    all.add(cleaned);
    all.add(cleaned.replace(/\s+/g, ''));
  }
  return Array.from(all);
}

/**
 * Parse a reader-typed reference such as "John 3:16", "Jn 3", "Psalm 23", or "1 Cor 13".
 * Returns null when the book or chapter is not in the Protestant canon.
 */
export function parseReference(input: string, books: BibleBook[]): Place | null {
  const raw = input.trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
  if (!raw) return null;

  const candidates: { book: BibleBook; label: string }[] = [];
  for (const book of books) {
    for (const label of labelsFor(book)) {
      candidates.push({ book, label });
    }
  }
  candidates.sort((a, b) => b.label.length - a.label.length);

  for (const { book, label } of candidates) {
    if (!raw.startsWith(label)) continue;
    const boundary = raw.charAt(label.length);
    if (boundary && /[a-z]/i.test(boundary)) continue;
    const rest = raw.slice(label.length).trim();
    if (rest && !/^[\d:\s\-–]+$/.test(rest)) continue;
    const nums = rest.match(/\d+/g) ?? [];
    const chapter = nums[0] ? Number.parseInt(nums[0], 10) : 1;
    const verse = nums[1] ? Number.parseInt(nums[1], 10) : 1;
    const chapterText = book.chapters[chapter - 1];
    if (!chapterText) return null;
    const maxVerse = Math.max(1, chapterText.length);
    return {
      bookId: book.id,
      chapter,
      verse: Math.min(Math.max(1, verse), maxVerse),
    };
  }
  return null;
}
