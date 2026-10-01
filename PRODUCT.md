# Christian — Product Brief

**Promise line:** Open the Book. See the story. Meet Jesus.

## Who it is for

Believers and seekers. Family-safe. Scripture-first reading and study for anyone who wants to open the Bible, read it as a book, understand context and meaning, and respond in faith — not a game.

## Tone

Warm, Christ-centered, Bible-believing. We hold the authority of Scripture and the good news of grace alone through faith alone in Christ alone. We do not dunk on denominations. Clear gospel-centered wording without being corny.

## What it is

A physical Bible on a wooden table. The reader flips real pages through the **whole Protestant Bible** (66 books), every verse, in order. That flippable book is the product. Study notes, infographics, maps, and videos are optional annotations on a passage. They are not a substitute for the text. See [PLAN.md](PLAN.md) for pagination, page-turn behavior, and licensing.

The preferred translation label is **NKJV (license pending)**. The New King James Version is copyrighted by Thomas Nelson, so v1 does not put NKJV on the page. The reading text is a full public-domain Bible: the World English Bible by default, or the King James Version. v1 does not wait on an NKJV license and does not ship NKJV excerpts instead of the book.

## What is in the book (v1)

- **Canon:** 66 books, Protestant order, Genesis through Revelation. No Apocrypha.
- **Preferred label:** NKJV (license pending). Not the text on the page.
- **Text:** World English Bible, Protestant Edition (WEBP), verbatim. Public-domain KJV is an allowed alternate. Not NKJV.
- **Pages:** Flowing multi-verse pages you turn continuously. A chapter may cross a page. A book starts on a right-hand page.
- **Seek:** Jump to a book, chapter, and verse, then keep turning.

## Study flow (Scripture-first, secondary to the text)

1. **Read** the verses on the page
2. **Context** — who, when, where
3. **Meaning** — what the text says and teaches
4. **Response** — prayer prompt and apply

The first annotations (not a limit on the canon) may cover John 1, John 3, and Genesis 1, then later John 14–17 and 19–20, Genesis 1–3, 12, 15, 22, and optionally Luke 15 and Romans. Empty states invite the reader to read the page. Closing an overlay leaves the verses in place.

## Guardrails (do not)

- Imply baptism causes salvation
- Modalism
- Law without gospel
- Numerology / secret codes
- Copyrighted Scripture without a license. NKJV included. WEB or public-domain KJV verbatim text is the v1 book.
- Change WEB wording and still call it the World English Bible
- Call the on-page text NKJV while the pages are WEB or KJV
- Dark patterns, streaks, or clickbait

## Platform

Web-first 3D (Next.js 14 + TypeScript + React Three Fiber / drei). Can be wrapped later with Capacitor for mobile.
