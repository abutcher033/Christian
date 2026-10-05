/**
 * Christian — study notes are secondary annotations on the full WEB text.
 * Markers attach by book and chapter, not by a fixed demo page index.
 *
 * Added notes stay inside what Scripture says. Where a New Testament writer
 * quotes the Law, the Prophets, or the Psalms, the note follows that writer.
 */
import { APOSTLE_ENTRIES } from './study/apostles';
import { EPISTLE_ENTRIES } from './study/epistles';
import { NEW_TESTAMENT_ENTRIES } from './study/newTestament';
import { PSALM_ENTRIES } from './study/psalms';
import { QUOTED_ENTRIES } from './study/quoted';

export type StudyMediaType = 'note' | 'infographic' | 'map' | 'video' | 'timeline' | 'word-study';

export type StudyMedia = {
  type: StudyMediaType;
  src: string;
  caption: string;
  poster?: string;
};

export type StudyEntry = {
  id: string;
  type: StudyMediaType;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  title: string;
  summary: string;
  bodyMd: string;
  themes: string[];
  relatedIds: string[];
  prayerPrompt: string;
  apply: string;
  media?: StudyMedia;
  /** Legacy sample-page index from the scaffold. Lookup uses book + chapter. */
  pageIndex: number;
};

export const STUDY_ENTRIES: StudyEntry[] = [
  {
    id: 'john-3-16-gospel-note',
    type: 'note',
    book: 'John',
    chapter: 3,
    verseStart: 16,
    verseEnd: 18,
    title: 'God So Loved — The Heart of the Gospel',
    summary:
      'John 3:16–18 proclaims God’s love, the gift of the Son, and life through faith — not our works.',
    bodyMd:
      '**Read John 3:16–18 in the conversation with Nicodemus.** Jesus has already said the Son of Man must be lifted up, as Moses lifted up the serpent (John 3:14; Numbers 21:8–9). Then he says why. God loved the world. God gave his only begotten Son. Whoever believes in him does not perish, but has eternal life. The Son was not sent to condemn the world, but that the world should be saved through him. The one who believes is not condemned. The one who does not believe is condemned already, because he has not believed in the name of the Son.\n\nLife is a gift received by believing, not a wage. Condemnation in these verses is unbelief, not a failure to pile up good works. The law still shows our need (Romans 3:20). It does not add a second way beside the Son God gave.\n\nDo not shrink “whoever” and do not add a condition Jesus did not add. Believe in the Son, and have eternal life.',
    themes: ['gospel', 'faith', 'love of God', 'eternal life'],
    relatedIds: ['john-3-infographic-believe', 'john-3-16-believe-or-not', 'jn-3-lifted-note', 'num-21-serpent-note'],
    prayerPrompt:
      'Father, thank You for loving the world and giving Your Son. Help me trust Jesus alone for life.',
    apply:
      'Tell someone this week: eternal life is a gift received by believing in Jesus — not a wage we earn.',
    pageIndex: 1,
  },
  {
    id: 'john-3-infographic-believe',
    type: 'infographic',
    book: 'John',
    chapter: 3,
    verseStart: 16,
    verseEnd: 18,
    title: 'Believe → Live: Two Paths',
    summary: 'A simple picture of belief and life versus unbelief and judgment — centered on the Son.',
    bodyMd:
      '**After you read John 3:16–18**, use this visual: one door is faith in the Son (life); the other is rejecting Him (judgment already). No secret code — plain gospel.',
    themes: ['faith', 'judgment', 'gospel'],
    relatedIds: ['john-3-16-gospel-note', 'john-3-16-believe-or-not'],
    prayerPrompt: 'Lord Jesus, keep me walking in the light by trusting You, not myself.',
    apply: 'Sketch the two paths on paper and pray for one person who needs this hope.',
    media: {
      type: 'infographic',
      src: '/media/infographics/john-3-believe-paths.svg',
      caption: 'Believe in the Son and live; refuse Him and remain under judgment (Jn 3:16–18).',
    },
    pageIndex: 1,
  },
  {
    id: 'john-3-16-believe-or-not',
    type: 'video',
    book: 'John',
    chapter: 3,
    verseStart: 16,
    verseEnd: 18,
    title: 'Believe — Or Not',
    summary: 'What “believe” means here: trusting the Son God gave, not merely agreeing.',
    bodyMd:
      '**Watch after reading the verses.** Belief is not mere agreement; it is relying on Jesus, the One lifted up for us. Law shows our need; the gospel gives the Savior.',
    themes: ['faith', 'gospel', 'Son of God'],
    relatedIds: ['john-3-16-gospel-note', 'john-3-infographic-believe'],
    prayerPrompt: 'Holy Spirit, settle my heart on Christ alone — grace received by faith.',
    apply: 'Write one sentence: “Today I trust Jesus for ______.” Keep it honest and simple.',
    media: {
      type: 'video',
      src: '/media/videos/john-3-believe-or-not.mp4',
      poster: '/media/videos/john-3-believe-or-not-poster.jpg',
      caption: 'John 3:16–18. Believing means trusting the Son God gave.',
    },
    pageIndex: 1,
  },
  {
    id: 'gen-1-1-creator-note',
    type: 'note',
    book: 'Genesis',
    chapter: 1,
    verseStart: 1,
    verseEnd: 3,
    title: 'In the Beginning — God',
    summary: 'Genesis 1:1–3 opens Scripture with God as Creator who speaks light into darkness.',
    bodyMd:
      '**Read Gen 1:1–3 first.** Before anything else, there is God. He creates; He speaks; light answers His word. This is not myth to decode with numerology — it is revelation of the living God who later redeems in Christ, the true Light (see John 1).',
    themes: ['creation', 'word of God', 'sovereignty'],
    relatedIds: ['gen-1-map-creation-week', 'gen-1-video-let-there-be-light', 'john-1-word-note'],
    prayerPrompt:
      'Creator God, I praise You that You spoke light into darkness. Speak life into my heart through Your Word.',
    apply: 'Begin a reading day with Gen 1:1–3 aloud, then thank God for one good gift He made.',
    pageIndex: 2,
  },
  {
    id: 'gen-1-map-creation-week',
    type: 'map',
    book: 'Genesis',
    chapter: 1,
    verseStart: 1,
    verseEnd: 3,
    title: 'Creation Week Overview',
    summary: 'Map-style overview of the creation days — order and goodness under God’s word.',
    bodyMd:
      '**Use with the text open.** Days unfold by God’s command. This overview helps you see structure; it does not replace reading Genesis.',
    themes: ['creation', 'order', 'goodness'],
    relatedIds: ['gen-1-1-creator-note', 'gen-1-video-let-there-be-light'],
    prayerPrompt: 'Lord, teach me to rest in Your good order and to receive Your world with gratitude.',
    apply: 'List the days from memory, then check Genesis — notice how God’s word leads each step.',
    media: {
      type: 'map',
      src: '/media/maps/gen-1-creation-week.svg',
      caption: 'Creation week overview (Gen 1). Read the chapter beside it.',
    },
    pageIndex: 2,
  },
  {
    id: 'gen-1-video-let-there-be-light',
    type: 'video',
    book: 'Genesis',
    chapter: 1,
    verseStart: 1,
    verseEnd: 3,
    title: 'Let There Be Light',
    summary: 'God speaks light into the darkness, pointing forward to Christ the Light.',
    bodyMd:
      '**Read the verses, then watch.** God said, “Let there be light.” John’s Gospel will show the Word who was with God in the beginning. Creation and redemption rhyme.',
    themes: ['creation', 'light', 'word of God'],
    relatedIds: ['gen-1-1-creator-note', 'gen-1-map-creation-week', 'john-1-word-note'],
    prayerPrompt: 'Jesus, Light of the world, shine in any darkness in me and lead me in Your truth.',
    apply: 'Turn on a lamp and pray Gen 1:3 back to God — then read John 1:1–5 as a bridge.',
    media: {
      type: 'video',
      src: '/media/videos/gen-1-let-there-be-light.mp4',
      poster: '/media/videos/gen-1-let-there-be-light-poster.jpg',
      caption: 'Genesis 1:1–3. God said, “Let there be light.”',
    },
    pageIndex: 2,
  },
  {
    id: 'john-1-word-note',
    type: 'note',
    book: 'John',
    chapter: 1,
    verseStart: 1,
    verseEnd: 18,
    title: 'The Word Became Flesh',
    summary: 'John 1:1–18 — the eternal Word with God, made flesh, full of grace and truth.',
    bodyMd:
      '**Read John 1:1–18.** In the beginning was the Word. The Word was with God, and the Word was God. He was in the beginning with God. All things were made through him (see Genesis 1:1–3). The Word became flesh and lived among us, full of grace and truth. No one has seen God at any time. The only born Son, who is in the bosom of the Father, has declared him.\n\nThe Son is with God and is God. That is not a mode of one person, and it is not a creature. Grace and truth came through Jesus Christ, not through a second law beside Moses. “The law was given through Moses. Grace and truth were realized through Jesus Christ” (John 1:17). The law is God’s. The fullness is the Son. John the Baptist will point at him and say, “Behold, the Lamb of God” (John 1:29).\n\nDo not stop at a beautiful prologue. The Word who made all things is the Word who became flesh to take away sin.',
    themes: ['Word', 'incarnation', 'grace', 'Trinity'],
    relatedIds: ['john-1-word-study-logos', 'gen-1-1-creator-note', 'jn-1-lamb-note', 'col-1-image-note'],
    prayerPrompt: 'Lord Jesus, eternal Word, thank You for becoming flesh that we might know the Father.',
    apply: 'Read John 1:14 slowly twice; thank God that grace came near in a Person.',
    pageIndex: 0,
  },
  {
    id: 'john-1-word-study-logos',
    type: 'word-study',
    book: 'John',
    chapter: 1,
    verseStart: 1,
    verseEnd: 1,
    title: 'Word (Logos)',
    summary: 'Brief word study: “Word” — God’s self-expression; the Son who reveals the Father.',
    bodyMd:
      '**After reading Jn 1:1**, note: Logos here is personal. The Word was with God and was God. Avoid modalism — Father and Son together in the text.',
    themes: ['word study', 'Word', 'Christ'],
    relatedIds: ['john-1-word-note'],
    prayerPrompt: 'Father, thank You for speaking finally and fully in Your Son.',
    apply: 'When you hear “Word” this week, remember a Person — Jesus — not only a page.',
    pageIndex: 0,
  },
  ...QUOTED_ENTRIES,
  ...PSALM_ENTRIES,
  ...NEW_TESTAMENT_ENTRIES,
  ...APOSTLE_ENTRIES,
  ...EPISTLE_ENTRIES,
];

export function getEntryById(id: string): StudyEntry | undefined {
  return STUDY_ENTRIES.find((entry) => entry.id === id);
}

export function getEntriesForChapters(refs: { book: string; chapter: number }[]): StudyEntry[] {
  return STUDY_ENTRIES.filter((entry) =>
    refs.some((ref) => ref.book === entry.book && ref.chapter === entry.chapter),
  );
}

export function getEntriesForPage(pageIndex: number): StudyEntry[] {
  return STUDY_ENTRIES.filter((entry) => entry.pageIndex === pageIndex);
}
