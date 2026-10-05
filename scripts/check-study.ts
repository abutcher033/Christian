import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { STUDY_ENTRIES } from '../data/studyContent';

type Corpus = {
  books: { name: string; chapters: string[][] }[];
};

const corpus = JSON.parse(readFileSync(resolve('public/bible/web.json'), 'utf8')) as Corpus;
const books = Object.fromEntries(corpus.books.map((book) => [book.name, book]));
const ids = new Set<string>();
const problems: string[] = [];

for (const entry of STUDY_ENTRIES) {
  if (ids.has(entry.id)) problems.push(`duplicate id ${entry.id}`);
  ids.add(entry.id);
  const book = books[entry.book];
  if (!book) {
    problems.push(`${entry.id}: unknown book ${entry.book}`);
    continue;
  }
  if (entry.chapter < 1 || entry.chapter > book.chapters.length) {
    problems.push(`${entry.id}: chapter ${entry.chapter} out of range for ${entry.book}`);
    continue;
  }
  const verses = book.chapters[entry.chapter - 1];
  if (entry.verseStart < 1 || entry.verseEnd > verses.length || entry.verseStart > entry.verseEnd) {
    problems.push(
      `${entry.id}: ${entry.book} ${entry.chapter}:${entry.verseStart}-${entry.verseEnd} invalid (${verses.length} verses)`,
    );
  }
  if (!entry.title || !entry.summary || !entry.bodyMd) problems.push(`${entry.id}: missing text`);
  if (
    entry.media &&
    entry.media.type !== 'video' &&
    !existsSync(resolve(`public${entry.media.src}`))
  ) {
    problems.push(`${entry.id}: missing media ${entry.media.src}`);
  }
}

for (const entry of STUDY_ENTRIES) {
  for (const related of entry.relatedIds) {
    if (!ids.has(related)) problems.push(`${entry.id}: missing related ${related}`);
  }
}

const counts = new Map<string, number>();
for (const entry of STUDY_ENTRIES) counts.set(entry.book, (counts.get(entry.book) ?? 0) + 1);
console.log(`entries ${STUDY_ENTRIES.length}`);
for (const [name, count] of counts) console.log(`${name} ${count}`);
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('study entries ok');
