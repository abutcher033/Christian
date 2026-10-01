# Christian — Build Plan & Licensing

## Licensing (Scripture text)

- **Shipped text:** World English Bible (WEB), public domain. Full Protestant canon in `public/bible/web.json`. “World English Bible” is a trademark of eBible.org.
- **NKJV** is the preferred translation to offer later. Do **not** ship NKJV text until a license is in place. Settings may name it as pending; the selector does not load NKJV wording.
- **ESV** and other copyrighted translations stay out of the repo until a publisher agreement exists.

The page textures are generated in the browser from that WEB file. They are not a separate translation.

## Study notes

Sample entries live in `data/studyContent.ts` and attach by book and chapter:

| Passage | Notes |
| --- | --- |
| John 1 | The Word made flesh; Logos word study |
| John 3 | Gospel note, believe/live infographic, video placeholder |
| Genesis 1 | Creator note, creation-week map, video placeholder |

New notes should stay Scripture-first: read, context, meaning, response.

## Engineering notes

- Pagination targets a readable sheet (about two dozen lines) so type holds up on the 3D page.
- Neighboring pages are textured ahead of a turn. The texture cache stays small.
- Last place and reader settings are in `localStorage`.
- `npm run build` must succeed before a release. Do not add a hosting deploy unless asked.
