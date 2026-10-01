import type { BibleCorpus } from './types';

let pending: Promise<BibleCorpus> | null = null;

export function loadBible(): Promise<BibleCorpus> {
  if (!pending) {
    pending = fetch('/bible/web.json').then(async (response) => {
      if (!response.ok) {
        throw new Error('Could not load the World English Bible.');
      }
      const data = (await response.json()) as BibleCorpus;
      if (!data.books || data.books.length !== 66) {
        throw new Error('The Bible file is incomplete.');
      }
      return data;
    });
  }
  return pending;
}

export async function loadBibleFonts(): Promise<void> {
  if (typeof FontFace === 'undefined') return;
  const specs: { weight: string; style: string; url: string }[] = [
    { weight: '400', style: 'normal', url: '/fonts/LibreBaskerville-Regular.ttf' },
    { weight: '700', style: 'normal', url: '/fonts/LibreBaskerville-Bold.ttf' },
    { weight: '400', style: 'italic', url: '/fonts/LibreBaskerville-Italic.ttf' },
  ];
  const faces = specs.map(
    (spec) =>
      new FontFace('Libre Baskerville', `url(${spec.url})`, {
        weight: spec.weight,
        style: spec.style,
      }),
  );
  const loaded = await Promise.all(faces.map((face) => face.load()));
  for (const face of loaded) document.fonts.add(face);
}
