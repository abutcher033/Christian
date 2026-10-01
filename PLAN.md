# Christian — Build Plan & Licensing

## Licensing (Scripture text)

- **ESV** (preferred UI label in Settings): requires a Crossway license for substantial quotation. Do **not** ship large ESV passages without that agreement.
- **Scaffold approach:** limited short quotes for demo + placeholder verse text labeled clearly. Prefer an **open-licensed reader** path (e.g. World English Bible / public domain) for full chapter display until ESV rights are secured.
- See Settings stub: Scripture version labeled “ESV (license pending)” or switchable to an open license for development.

## Content pipeline

1. Author / editor drafts a `StudyEntry` (type, refs, title, body, media, prayerPrompt, apply).
2. Theological review against PRODUCT.md guardrails (Scripture-first; grace through faith; no modalism; law with gospel).
3. Media placeholders → real assets (infographic SVG/PNG, map tiles, short video).
4. Wire entry IDs to page markers in `data/studyContent.ts`.
5. QA: empty states, large tap targets, family-safe copy.

## Scaffold page set

| Page index | Label        | Seed focus                          |
|-----------|--------------|-------------------------------------|
| 0         | John 1       | 1:1–18 Word made flesh              |
| 1         | John 3       | 3:1–21; sample pack 3:16–18         |
| 2         | Genesis 1    | 1:1–3; creation sample pack         |

## Next engineering steps

- Replace placeholder page meshes with texture-backed paper + readable type.
- Persist last page / last entry in localStorage.
- Capacitor wrap when web reader is solid.
- Accessibility pass: focus traps in overlays, `prefers-reduced-motion` for page turns.
