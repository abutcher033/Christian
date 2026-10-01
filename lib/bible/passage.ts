import type { BibleCorpus } from './types';

export type PassageVerse = { n: number; text: string };

export type Passage = {
  ref: string;
  bookName: string;
  chapter: number;
  verses: PassageVerse[];
};

export function bookByName(corpus: BibleCorpus, name: string) {
  return corpus.books.find((book) => book.name === name);
}

export function bookById(corpus: BibleCorpus, id: string) {
  return corpus.books.find((book) => book.id === id);
}

/** WEB verses for an inclusive range. Omitted verse numbers are skipped. */
export function slicePassage(
  corpus: BibleCorpus,
  bookName: string,
  chapter: number,
  start: number,
  end: number,
): Passage | null {
  const book = bookByName(corpus, bookName);
  if (!book) return null;
  const versesInChapter = book.chapters[chapter - 1];
  if (!versesInChapter) return null;
  const from = Math.max(1, start);
  const to = Math.min(versesInChapter.length, Math.max(from, end));
  const verses: PassageVerse[] = [];
  for (let n = from; n <= to; n += 1) {
    const text = versesInChapter[n - 1];
    if (text) verses.push({ n, text });
  }
  const ref =
    from === to ? `${book.name} ${chapter}:${from}` : `${book.name} ${chapter}:${from}–${to}`;
  return { ref, bookName: book.name, chapter, verses };
}
