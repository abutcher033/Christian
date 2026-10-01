# Christian — Product Plan

**Promise:** Open the Book. See the story. Meet Jesus.

An evangelical interactive 3D study Bible for believers and seekers. Family-safe. Warm, Christ-centered, Bible-believing. Scripture-first study — a book you open, not a game and not a footnote dump.

This pull request is the plan only. The Next.js app scaffold (pages, React Three Fiber scene, and seed content module) lands in a later change. Do not paste long ESV text into the repo.

Product tone and theological guardrails are summarized below and spelled out in [PRODUCT.md](PRODUCT.md).

## Stack (locked)

| Layer | Choice |
|-------|--------|
| Framework | **Next.js 14** App Router + **TypeScript** |
| 3D | **React Three Fiber** (`@react-three/fiber`) + **@react-three/drei** (including `Html` overlays) |
| Styles | Plain **CSS** (`app/globals.css`). Tailwind is optional later. |
| Platform | **Web-first**. Wrap with **Capacitor** later for iOS/Android. |
| Content | Typed study entries and sample pages in **`data/studyContent.ts`** |

No secrets are required for the local 3D scaffold. Optional env keys (`NEXT_PUBLIC_MEDIA_BASE_URL`, `NEXT_PUBLIC_ANALYTICS_ID`) stay empty in dev.

## Experience

A 3D Bible rests on a wooden table. Readers turn pages with swipe, buttons, or arrow keys. Tap a page or a marker to open a study overlay: the entry list for that page, then a single entry. Deep links live at `/study/[entryId]`. Settings stays Scripture-first, with large tap targets (minimum 48px).

Study flow:

1. **Read** the verse or passage
2. **Context** — who, when, where
3. **Meaning** — what the text says and teaches
4. **Response** — `prayerPrompt` and `apply`

Empty states invite the reader to read the verse before study media.

## File map

When the scaffold is added, these paths are the map. This plan does not add them.

| Path | Role |
|------|------|
| `.env.example` | Optional media base URL and analytics id |
| `.gitignore` | Next.js, env, and editor ignores |
| `README.md` | Promise, stack, how to run |
| `app/globals.css` | Plain CSS: parchment, wood, gold, 48px taps |
| `app/layout.tsx` | Shell, promise line, Bible / Settings nav |
| `app/page.tsx` | 3D reader, verse strip, page turns, study overlay |
| `app/settings/page.tsx` | Settings route |
| `app/study/[entryId]/page.tsx` | Deep link for one study entry |
| `components/bible/BibleBook.tsx` | Open book meshes, page label, study markers |
| `components/bible/BibleScene.tsx` | R3F canvas, lights, table, book, gestures |
| `components/bible/CameraRig.tsx` | Seated view of the open Bible |
| `components/bible/PageTurnControls.tsx` | Prev / next and page label |
| `components/bible/Table.tsx` | Wooden table |
| `components/settings/SettingsPanel.tsx` | Version label, Scripture-first, motion |
| `components/study/MediaPanel.tsx` | Note-less media frame: infographic, map, video |
| `components/study/StudyEntryMarker.tsx` | Tappable marker on the page (`Html`) |
| `components/study/StudyOverlay.tsx` | Entry list and single-entry overlay |
| `data/studyContent.ts` | `StudyEntry`, `BiblePage`, seeds, lookups |
| `docs/PLAN.md` | Scaffold copy of licensing and pipeline (this file is canonical until then) |
| `docs/PRODUCT.md` | Scaffold copy of the product brief |
| `hooks/usePageGestures.ts` | Swipe, keys, turn animation state |
| `next.config.mjs` | Strict mode; transpile `three`, fiber, drei |
| `package.json` | Next 14.2, React 18, R3F, drei, three |
| `public/media/README.md` | Where final infographic, map, and video files go |
| `public/media/infographics/john-3-believe-paths.svg` | John 3 infographic stub |
| `public/media/maps/gen-1-creation-week.svg` | Genesis 1 map stub |
| `tsconfig.json` | Strict TypeScript, `@/*` paths |

Routes:

| Route | Role |
|-------|------|
| `/` | 3D Bible, verse strip, page turns, study overlay |
| `/settings` | Version label, Scripture-first, large taps, reduced motion |
| `/study/[entryId]` | Full study page for one entry; static params from `STUDY_ENTRIES` |

## StudyEntry model

Defined in `data/studyContent.ts`. Bodies stay short. No long copyrighted Scripture.

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
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  title: string;
  summary: string;
  /** Short markdown body — keep brief; no long copyrighted Scripture */
  bodyMd: string;
  themes: string[];
  relatedIds: string[];
  prayerPrompt: string;
  apply: string;
  media?: StudyMedia;
  /** Page index in the 3D sample set (0 = John 1, 1 = John 3, 2 = Genesis 1) */
  pageIndex: number;
};

type BiblePage = {
  index: number;
  label: string;
  book: string;
  chapter: number;
  /** Short open-license / limited demo line — not a full ESV chapter */
  versePreview: string;
  entryIds: string[];
};
```

Lookups on that module: `getEntryById`, `getEntriesForPage`, `getPage`, and `PAGE_COUNT`.

## Study overlays

Page tap opens the entry list for the current page. A marker or list row opens one entry. `MediaPanel` renders `entry.media` when present.

| Overlay | `type` | v1 seed |
|---------|--------|---------|
| Note | `note` | John 1 Word made flesh; John 3:16–18 gospel note; Genesis 1:1–3 Creator note |
| Infographic | `infographic` | John 3 “Believe → Live” (`/media/infographics/john-3-believe-paths.svg`) |
| Map | `map` | Genesis 1 creation week (`/media/maps/gen-1-creation-week.svg`) |
| Video | `video` | John 3 “Believe — Or Not”; Genesis 1 “Let There Be Light” (placeholder mp4 + poster under `/media/videos/`) |

The model also allows `timeline` and `word-study`. The John 1 seed includes a Logos `word-study` so page 0 is not empty. Those two types are not required for the first overlay pass beyond that marker.

## Seed pages

Fixed sample set in the 3D Bible:

| Page index | Label | Seed focus | Entry ids |
|-----------:|-------|------------|-----------|
| 0 | John 1 | 1:1–18 Word made flesh | `john-1-word-note`, `john-1-word-study-logos` |
| 1 | John 3 | 3:1–21; sample pack 3:16–18 | `john-3-16-gospel-note`, `john-3-infographic-believe`, `john-3-16-believe-or-not` |
| 2 | Genesis 1 | 1:1–3 creation sample pack | `gen-1-1-creator-note`, `gen-1-map-creation-week`, `gen-1-video-let-there-be-light` |

Verse previews in the HUD are short, clearly labeled demo lines (John 1:1, John 3:16, Genesis 1:1). They are not full chapters.

Broader v1 passages, after these three sample pages:

- **Primary:** Gospel of John (1:1–18; 3:1–21; 14–17; 19–20)
- **Also:** Genesis 1–3, 12, 15, 22
- **Later (optional):** Luke 15, Romans

## Licensing (Scripture text)

- **ESV** is the preferred Settings label. Substantial quotation needs a Crossway license. Do not ship large ESV passages without that agreement.
- **Scaffold approach:** limited short quotes, clearly labeled, plus placeholder verse text. Prefer an open-licensed reader (World English Bible or public domain) for full chapter display until ESV rights are secured.
- Settings stub options: “ESV (license pending — limited quotes only)” or “World English Bible (open license — full reader OK)”.

## Content pipeline

1. Author or editor drafts a `StudyEntry` (type, refs, title, body, media, `prayerPrompt`, `apply`).
2. Theological review against the guardrails below (Scripture-first; grace through faith; no modalism; law with gospel).
3. Replace media placeholders with real assets (infographic SVG/PNG, map, short video).
4. Wire entry ids to page markers in `data/studyContent.ts`.
5. QA: empty states, large tap targets, family-safe copy.

## Guardrails

- Do not imply baptism causes salvation.
- No modalism. The Son is distinct from the Father and truly God.
- No law without gospel. Grace alone, through faith alone, in Christ alone.
- No numerology or secret codes.
- No long copyrighted Scripture without a license.
- No dark patterns, streaks, or clickbait.
- Do not dunk on denominations.

## Next engineering steps

1. Land the scaffold from the file map above in a separate change. Keep the R3F Bible, gestures, and the three seed pages.
2. Replace placeholder page meshes with texture-backed paper and readable type.
3. Persist last page and last entry in `localStorage`.
4. Accessibility: focus trap in overlays; honor `prefers-reduced-motion` for page turns.
5. Capacitor wrap after the web reader is solid.
