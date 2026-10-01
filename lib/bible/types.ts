export type Testament = 'OT' | 'NT';

export type BibleBook = {
  id: string;
  name: string;
  abbr: string;
  testament: Testament;
  /** Verse strings. Index 0 is verse 1. An empty string is an omitted number (for example Luke 17:36). */
  chapters: string[][];
};

export type BibleCorpus = {
  translation: 'WEB';
  name: string;
  canon: string;
  license: string;
  attribution: string;
  books: BibleBook[];
};

export type Place = {
  bookId: string;
  chapter: number;
  verse: number;
};
