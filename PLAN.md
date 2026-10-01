# Christian — Product Plan

**Promise:** Open the Book. See the story. Meet Jesus.

An evangelical interactive 3D study Bible for believers and seekers. Family-safe. Warm, Christ-centered, Bible-believing. The product is the Bible itself: a physical book on a wooden table whose pages turn through **every verse of every book**. Study overlays annotate that text. They do not replace it.

This pull request is the plan only. It does not vendor the corpus and does not add the Next.js app. The implementation that follows this plan must build a real flippable full Bible, not a three-page demo.

Product tone and theological guardrails are summarized below and spelled out in [PRODUCT.md](PRODUCT.md).

## Primary requirement

Owner direction, and the bar for v1:

**The whole Protestant Bible, line for line, is a physical book on the table with real flippable pages.** The reader turns through Scripture the way they would turn a printed Bible: Genesis through Revelation, every verse, in order. Summary cards, short quote strips, and a fixed sample of three passages are not the product.

A build that only opens John 1, John 3, and Genesis 1 with preview lines has not met this plan.

1. **Full corpus.** 66 books, Protestant canon, evangelical use. Old Testament 39 books and New Testament 27 books, in standard Protestant order. No Deuterocanon / Apocrypha.
2. **Real pages.** Each page face shows real chapter and verse text. Pagination is the flowing multi-verse layout locked below. Page-turn UX is continuous from the first verse to the last.
3. **Legal full text in v1.** Ship the **World English Bible, Protestant Edition (WEBP)**. It is public domain. ESV is optional later, only with a Crossway license. Do not block, shorten, or stub the book while waiting on ESV.
4. **Study overlays are secondary.** Infographics, maps, videos, notes, timelines, and word studies annotate a verse range on the page. The Bible text is the product. A page with no overlay is complete.
5. **Stack stays locked.** Next.js 14 + TypeScript + React Three Fiber / drei, web-first.

## Stack (locked)

| Layer | Choice |
|-------|--------|
| Framework | **Next.js 14** App Router + **TypeScript** |
| 3D | **React Three Fiber** (`@react-three/fiber`) + **@react-three/drei** (including `Html` overlays) |
| Styles | Plain **CSS** (`app/globals.css`). Tailwind is optional later. |
| Platform | **Web-first**. Wrap with **Capacitor** later for iOS/Android. |
| Scripture | **WEBP** full text in `data/bible/web/`, paginated into `data/bible/pages.json` |
| Notes | Typed study entries in `data/studyContent.ts`, anchored to verse references |

No secrets are required for the local 3D reader. Optional env keys (`NEXT_PUBLIC_MEDIA_BASE_URL`, `NEXT_PUBLIC_ANALYTICS_ID`) stay empty in dev.

## Canon

Protestant order, USFM book ids. The ingest and the verify script both use this list. Book count is 66. Anything else (including Tobit, Wisdom, Sirach, Baruch, 1–2 Maccabees, additions to Esther or Daniel) is out of the book.

**Old Testament (39):** GEN, EXO, LEV, NUM, DEU, JOS, JDG, RUT, 1SA, 2SA, 1KI, 2KI, 1CH, 2CH, EZR, NEH, EST, JOB, PSA, PRO, ECC, SNG, ISA, JER, LAM, EZK, DAN, HOS, JOL, AMO, OBA, JON, MIC, NAM, HAB, ZEP, HAG, ZEC, MAL.

**New Testament (27):** MAT, MRK, LUK, JHN, ACT, ROM, 1CO, 2CO, GAL, EPH, PHP, COL, 1TH, 2TH, 1TI, 2TI, TIT, PHM, HEB, JAS, 1PE, 2PE, 1JN, 2JN, 3JN, JUD, REV.

Display names are the ordinary English names (Genesis … Revelation, Song of Solomon, Psalm). Ids stay USFM.

## Scripture text (WEBP)

v1 text is the **World English Bible, Protestant Edition** published by eBible.org:

- Edition id: `engwebp` (U.S. spelling; divine name rendered LORD / GOD as in that edition).
- Corpus page: <https://ebible.org/engwebp/>
- Public-domain notice: <https://ebible.org/engwebp/copyright.htm>
- Scope: the 66-book Protestant subset only. Do not ingest a WEB edition that includes the Deuterocanon.

WEBP is in the public domain. The full verse text may be committed, displayed, and shipped. "World English Bible" is a trademark of eBible.org and may be used only on a faithful copy. Store and render verse wording **verbatim**. Do not paraphrase, abridge, modernize, or "sample" it. If the wording changes, stop calling it the World English Bible.

Translator footnotes (NU / TR and similar) may be omitted in v1. They must not be required to ship, and they must not replace verse text.

In-app credit, on the title face and in Settings: "Scripture is from the World English Bible (public domain)."

**ESV** stays a possible later translation in Settings, behind a Crossway license for substantial quotation. Until that license exists:

- Do not commit ESV text.
- Do not present ESV as the reading text.
- A disabled "ESV (license required)" control is allowed. Choosing it must not blank or truncate the WEBP book.

Absence of an ESV license is not a reason to ship excerpts.

## Pagination (locked)

The 3D book does not use one card per chapter and does not use one chapter per spread. Chapters range from 2 verses (Psalm 117) to 176 (Psalm 119). One-chapter-per-spread either leaves a nearly empty sheet or overflows the page.

v1 pagination is a **flowing multi-verse Bible**:

- Every verse appears **exactly once**, in canon order.
- Several verses share a page face. A chapter may begin mid-page and may continue onto the next page, as in a printed Bible.
- A new **book** always starts on a fresh **recto** (right-hand page). If the previous Scripture face was a recto, insert one blank verso so the next book opens on the right. Blank faces contain no verses. They exist only for that recto rule (and the non-Scripture title faces below).
- Verse text is wrapped to the page measure. The paginator and the page renderer use the **same** constants so the texture matches the index.

Constants (change them only by regenerating `data/bible/pages.json` in the same change):

| Constant | Value | Role |
|----------|------:|------|
| `CHARS_PER_LINE` | 42 | Wrap width of a verse line, in characters |
| `PAGE_LINE_BUDGET` | 28 | Maximum body lines on one page face |
| Chapter heading | 2 lines | `Chapter N`, charged against the budget |
| Book heading | 3 lines | Book name on its opening recto, charged against the budget |

Rules:

1. A verse line-count is the wrapped length of `"{verseNumber} {verseText}"` at `CHARS_PER_LINE`, minimum 1. The verse number is part of the line, not a separate column that can be dropped.
2. If the verse does not fit in the lines remaining on the page, the whole verse starts the next page.
3. Split a verse across pages only when that verse alone exceeds `PAGE_LINE_BUDGET`. Split on wrapped line boundaries. The continuation page marks the verse as continued and still counts as that same verse (the verse id is not duplicated in the coverage check).
4. A new chapter starts on the current page only when the heading plus the first three lines of verse 1 fit. Otherwise the chapter starts the next page.
5. After a book heading, chapter 1 follows on that same recto when rule 4 allows it.
6. Running headers (book name and chapter) sit in the margin and are **not** part of `PAGE_LINE_BUDGET`.
7. Page index `0` is the first Scripture face: Genesis, beginning at Genesis 1:1. The last Scripture face ends at Revelation 22:21.

Do not hardcode a page count. `PAGE_COUNT` is `pages.json.length` after pagination. A full WEBP at this density is on the order of a few thousand faces. That count is an output of the script, then committed.

Spot-checks the verifier must enforce even before a full visual pass: Genesis 1 has 31 verses, John 3 has 36, Psalm 119 has 176, Revelation 22 has 21, and those verses are present verbatim.

## Physical book and continuous page turns

The reader sees one open book on the table. Turning a leaf is the primary way to move.

**Faces and leaves**

- `pageIndex` 0 is the first Scripture recto (Genesis 1:1).
- Leaf `k` front (recto) = page `2k`. Leaf `k` back (verso) = page `2k + 1`.
- Spread 0: left face is front matter (title: The Holy Bible / World English Bible, public-domain line). Right face is page 0.
- Spread `s` (`s ≥ 1`): left = page `2s - 1`, right = page `2s`. Past the last Scripture face, the remaining side is the inside back cover, not a fake verse.
- A forward turn on spread `s` curls **leaf `s`** (the leaf whose front is the current right page). When the curl finishes, that leaf's back is the new left page and the next leaf's front is the new right page.
- A backward turn curls the current left leaf back the other way.

**What the reader can do**

- Drag a page corner, swipe, use on-screen previous/next, or press ArrowLeft / ArrowRight (and PageUp / PageDown).
- Turns may queue. Holding or repeating the control keeps flipping. From the opening spread the reader can reach Revelation 22:21 by turning alone, and can turn back to Genesis 1:1.
- The HUD names the passage on the open spread (book, chapter, verse range), not "page 2 of 3".
- **Go to book / chapter / verse** seeks to the spread whose faces contain that verse, then leaves the reader in the same book. Seeking is a jump to a page. It is not a second mode made of summary cards. After the seek, turning still moves verse by verse through the canon.
- `prefers-reduced-motion`: skip the curl and swap the spread. The destination page is the same.

**What gets meshed**

Do not create one mesh per page of the corpus.

- Resident geometry: covers, a left-hand page block, a right-hand page block, and the single leaf being turned (front and back). At most those leaf faces are real sheets.
- Unread and already-read bulk is a thickness block on each side, scaled to how many faces remain. It sells a physical book without thousands of sheets.
- Each visible face is a texture drawn from that page's laid-out lines (canvas to a three.js texture, or an equivalent text-to-texture path). Verse text must be readable at the default seated camera without a zoom requirement. If Genesis 1:1 cannot be read there, reduce the line budget or enlarge the book in the scene, regenerate `pages.json`, and ship both together.
- Cache a small LRU of page textures (about 16) and prefetch the next forward leaf and the previous backward leaf.
- During the curl, both sides of the turning leaf show the correct pages.

There is no alternate "card" renderer for chapters that are not the seed set. Every book uses this path.

## Study overlays (secondary)

Overlays annotate the open page. They never stand in for missing text.

Flow when the reader asks for study:

1. **Read** the verses already on the page
2. **Context** — who, when, where
3. **Meaning** — what the text says and teaches
4. **Response** — `prayerPrompt` and `apply`

Empty states invite the reader to keep reading the page. They must not imply that the verse is unavailable.

The first annotations may be the existing seeds, **attached by reference** to whatever page holds that verse after pagination:

| Anchor | Focus | Entry ids |
|--------|-------|-----------|
| John 1:1 | Word made flesh | `john-1-word-note`, `john-1-word-study-logos` |
| John 3:16 | Gospel note and media | `john-3-16-gospel-note`, `john-3-infographic-believe`, `john-3-16-believe-or-not` |
| Genesis 1:1 | Creator note and media | `gen-1-1-creator-note`, `gen-1-map-creation-week`, `gen-1-video-let-there-be-light` |

Those entries are optional. v1 can ship the full book with zero overlays. Page tap may open the entry list **for verses on that page**. A marker (`Html`) is shown only when the anchored verse is on a visible face. Closing the overlay leaves the same verses in place.

| Overlay | `type` | v1 seed |
|---------|--------|---------|
| Note | `note` | John 1 Word made flesh; John 3:16–18 gospel note; Genesis 1:1–3 Creator note |
| Infographic | `infographic` | John 3 “Believe → Live” (`/media/infographics/john-3-believe-paths.svg`) |
| Map | `map` | Genesis 1 creation week (`/media/maps/gen-1-creation-week.svg`) |
| Video | `video` | John 3 “Believe — Or Not”; Genesis 1 “Let There Be Light” (placeholder mp4 + poster under `/media/videos/`) |

`timeline` and `word-study` remain in the model. The John 1 Logos `word-study` may ship with the seeds. No other overlay type is required for the full-text book.

Broader study passages (John 1:1–18; 3:1–21; 14–17; 19–20; Genesis 1–3, 12, 15, 22; later Luke 15 and Romans) are **where to write notes next**, not a limit on which Scripture is in the book.

## File map

When the app is added, these paths are the map. This plan does not add them.

| Path | Role |
|------|------|
| `.env.example` | Optional media base URL and analytics id |
| `.gitignore` | Next.js, env, and editor ignores |
| `README.md` | Promise, stack, how to run |
| `app/globals.css` | Plain CSS: parchment, wood, gold, 48px taps |
| `app/layout.tsx` | Shell, promise line, Bible / Settings nav |
| `app/page.tsx` | 3D reader, passage label, page turns, optional study overlay |
| `app/settings/page.tsx` | Settings route |
| `app/study/[entryId]/page.tsx` | Deep link for one study entry |
| `components/bible/BibleBook.tsx` | Open book: covers, thickness, visible leaves, page textures |
| `components/bible/BibleScene.tsx` | R3F canvas, lights, table, book, gestures |
| `components/bible/CameraRig.tsx` | Seated view of the open Bible; verses readable here |
| `components/bible/PageTurnControls.tsx` | Prev / next and the passage label for the open spread |
| `components/bible/PassageJump.tsx` | Book / chapter / verse seek into the same book |
| `components/bible/Table.tsx` | Wooden table |
| `components/settings/SettingsPanel.tsx` | WEBP label, Scripture-first, motion, disabled ESV |
| `components/study/MediaPanel.tsx` | Note-less media frame: infographic, map, video |
| `components/study/StudyEntryMarker.tsx` | Tappable marker on a verse that has an entry (`Html`) |
| `components/study/StudyOverlay.tsx` | Entry list and single-entry overlay |
| `data/bible/canon.ts` | The 66 USFM ids, order, and English names |
| `data/bible/web/manifest.json` | Ingested WEBP: book ids, chapter counts, verse counts |
| `data/bible/web/books/<id>.json` | Verbatim chapters and verses for one book |
| `data/bible/pages.json` | Generated page faces (script output, committed) |
| `data/studyContent.ts` | `StudyEntry` seeds and lookups; anchors are verse refs |
| `docs/PLAN.md` | Scaffold copy of this plan (this file is canonical until then) |
| `docs/PRODUCT.md` | Scaffold copy of the product brief |
| `hooks/usePageGestures.ts` | Swipe, keys, turn queue, reduced motion |
| `lib/bible/paginate.ts` | The locked pagination rules |
| `lib/bible/renderPage.ts` | Draw one page face to a texture using the same wrap |
| `lib/bible/spread.ts` | Leaf and spread index math |
| `next.config.mjs` | Strict mode; transpile `three`, fiber, drei |
| `package.json` | Next 14.2, React 18, R3F, drei, three |
| `public/media/README.md` | Where final infographic, map, and video files go |
| `public/media/infographics/john-3-believe-paths.svg` | John 3 infographic stub |
| `public/media/maps/gen-1-creation-week.svg` | Genesis 1 map stub |
| `scripts/ingest-web.ts` | Download or read a local WEBP export into `data/bible/web/` |
| `scripts/paginate-bible.ts` | Write `data/bible/pages.json` from the corpus |
| `scripts/verify-bible.ts` | Coverage check below; fails the build on a miss |
| `tsconfig.json` | Strict TypeScript, `@/*` paths |

Routes:

| Route | Role |
|-------|------|
| `/` | 3D Bible, full WEBP page turns, passage label, optional study overlay |
| `/settings` | World English Bible (public domain), Scripture-first, large taps, reduced motion; ESV disabled until licensed |
| `/study/[entryId]` | Full study page for one entry; static params from `STUDY_ENTRIES` |

## Data model

Corpus files hold verbatim WEBP. Page files hold layout only. Study files hold annotations.

```ts
type BibleVerse = {
  /** Verse number as in WEBP */
  v: number;
  /** Verbatim WEBP verse text, no added wording */
  t: string;
};

type BibleChapter = { verses: BibleVerse[] };

type BibleBookFile = {
  id: string; // USFM id, e.g. "JHN"
  name: string;
  chapters: BibleChapter[];
};

type PageLine =
  | { type: 'book-title'; text: string }
  | { type: 'chapter'; n: number }
  | {
      type: 'verse';
      bookId: string;
      chapter: number;
      verse: number;
      /** The slice of verbatim text on this line (a whole verse, or a budget overflow slice) */
      text: string;
      continuation?: boolean;
    }
  | { type: 'blank' };

type BiblePage = {
  index: number;
  kind: 'scripture' | 'blank' | 'front-matter' | 'back-matter';
  bookId?: string;
  chapterStart?: number;
  verseStart?: number;
  chapterEnd?: number;
  verseEnd?: number;
  lines: PageLine[];
};
```

`StudyEntry` no longer stores a sample-page slot. The page is resolved from the verse anchor against `pages.json`.

```ts
type StudyMediaType =
  | 'note'
  | 'infographic'
  | 'map'
  | 'video'
  | 'timeline'
  | 'word-study';

type StudyMedia = {
  type: StudyMediaType;
  /** Stub path under /public — replace when assets land */
  src: string;
  caption: string;
  poster?: string;
};

type StudyEntry = {
  id: string;
  type: StudyMediaType;
  bookId: string; // USFM id
  chapter: number;
  verseStart: number;
  verseEnd: number;
  title: string;
  summary: string;
  /** Short markdown. Do not paste copyrighted Scripture. WEBP verses are read from the page, not copied here. */
  bodyMd: string;
  themes: string[];
  relatedIds: string[];
  prayerPrompt: string;
  apply: string;
  media?: StudyMedia;
};
```

Lookups: `getEntryById`, `getEntriesForVerseRange`, `getPage`, `getSpreadForVerse`, and `PAGE_COUNT` from the page index.

## Verification

`scripts/verify-bible.ts` must fail unless all of the following hold:

- Manifest book ids equal the 66-id canon list, in that order.
- No Deuterocanon id is present.
- Every verse in `data/bible/web/` appears on exactly one scripture page, in order.
- Overflow continuations still map to that one verse id.
- Page 0 begins with Genesis 1:1, and the text matches the corpus string.
- The last scripture verse is Revelation 22:21, matching the corpus string.
- John 3:16 and Psalm 119:1 and Psalm 119:176 are present and match.
- Blank and matter faces contain no verse lines.
- Book-title lines occur only on recto indices (`index % 2 === 0`).

A reader check, once the scene exists: from spread 0, programmatic forward turns land on the faces that contain John 1:1, John 3:16, and Revelation 22:21, and the rendered string equals the WEBP verse. Turning backward from Revelation returns toward Genesis without a mode switch.

## Content pipeline

1. Ingest WEBP (`engwebp`) into `data/bible/web/` with verbatim verse text.
2. Run pagination and commit `pages.json`.
3. Run `verify-bible`. Do not merge a corpus change the script rejects.
4. Render those pages on the 3D leaves and wire continuous turns plus passage seek.
5. Author a `StudyEntry` only as an annotation (type, refs, title, body, media, `prayerPrompt`, `apply`).
6. Theological review against the guardrails below.
7. Replace media placeholders when real assets exist.
8. QA: verse readability at the default camera, empty overlay states, 48px targets, family-safe copy, reduced motion.

## Guardrails

- Do not imply baptism causes salvation.
- No modalism. The Son is distinct from the Father and truly God.
- No law without gospel. Grace alone, through faith alone, in Christ alone.
- No numerology or secret codes.
- No copyrighted Scripture (including ESV) without a license. WEBP verbatim text is allowed.
- No dark patterns, streaks, or clickbait.
- Do not dunk on denominations.
- Do not alter WEBP wording and still call it the World English Bible.

## Done when

The implementation is done for this requirement when:

- The app opens on a 3D book resting on a table.
- The first Scripture page starts at Genesis 1:1 in WEBP, readable without zooming.
- Flipping pages walks the canon in order and can reach Revelation 22:21, every verse represented on some face.
- `verify-bible` passes on the committed corpus and page index.
- Study overlays, if present, sit on top of that text and can be dismissed.
- The book does not depend on an ESV license.

## Next engineering steps

1. Ingest and paginate WEBP. Land `canon.ts`, the `data/bible/web/` JSON, `pages.json`, and `verify-bible`. This is the first code change, before visual polish.
2. Land the Next.js 14 + R3F scaffold from the file map: table, seated camera, virtualized leaves, textures from `pages.json`, continuous turns, passage seek.
3. Attach the three seed study entries by verse anchor. Confirm the underlying verses remain when the overlay closes.
4. Persist last spread and last entry in `localStorage`.
5. Accessibility: focus trap in overlays; honor `prefers-reduced-motion`.
6. Capacitor wrap only after the web book can be flipped from Genesis to Revelation.
