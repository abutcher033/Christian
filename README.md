# Christian

**Open the Book. See the story. Meet Jesus.**

An evangelical interactive study Bible. The primary experience is a 3D Bible on a wooden table. Turn the pages and read the **World English Bible** — the full Protestant canon, Genesis through Revelation — on the paper itself. Study notes, a map, and an infographic are secondary annotations on a few familiar passages.

Family-safe. Warm, Christ-centered, and Bible-believing.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # production build
npm start       # serve the production build
```

No API keys are required.

## How to read

- Swipe the book, tap the left or right page, or use the Prev / Next buttons.
- Arrow keys and Page Up / Page Down turn one spread. Shift + arrow jumps a chapter.
- The reference in the center opens the book and chapter picker. You can also type `John 3:16` or `Psalm 23`.
- Your place is stored in this browser (`localStorage`).
- **Study this page** opens notes when the open chapters have them (Genesis 1, John 1, John 3 in this version). The Scripture on the page comes first.

## Scripture text

The reader uses the **World English Bible (WEB)**, a public-domain translation. You may copy and share the text. “World English Bible” is a trademark of [eBible.org](https://ebible.org/).

The corpus in `public/bible/web.json` is the 66-book Protestant canon (31,102 verse numbers, including a few numbers the WEB leaves blank, such as Luke 17:36). It was compiled from the public-domain WEB JSON distribution published at [github.com/TehShrike/world-english-bible](https://github.com/TehShrike/world-english-bible). To rebuild that file from a checkout of those book JSON files:

```bash
python3 scripts/ingest-web.py /path/to/json public/bible/web.json
```

NKJV is named in Settings as a preferred translation for a later release. **NKJV text is not included** — a license is still pending.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 14 (App Router) + TypeScript |
| 3D | React Three Fiber + drei |
| Styles | Plain CSS (`app/globals.css`) |
| Text | World English Bible, paged onto canvas textures on a turning sheet |
| Type | [Libre Baskerville](https://github.com/impallari/Libre-Baskerville) (SIL Open Font License) |

Page type is drawn into textures so the sheet can curl. Libre Baskerville is licensed under the SIL OFL; see `public/fonts/OFL.txt`.

## Project layout

```
app/                  App Router pages
components/bible/     Table, book, page turn, picker
components/study/     Notes, markers, media
components/reader/    Load, paginate, gestures, place
data/studyContent.ts  Sample study entries
lib/bible/            Corpus types, paging, references
public/bible/web.json Full WEB text
public/fonts/         Libre Baskerville
docs/                 Product brief and licensing notes
```
