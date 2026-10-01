import fs from 'fs';
import path from 'path';
import type { BibleCorpus } from './types';

let cached: BibleCorpus | null = null;

/** Server-side read of the shipped WEB corpus. Used by study pages. */
export function readCorpus(): BibleCorpus {
  if (!cached) {
    const file = path.join(process.cwd(), 'public', 'bible', 'web.json');
    cached = JSON.parse(fs.readFileSync(file, 'utf8')) as BibleCorpus;
  }
  return cached;
}
