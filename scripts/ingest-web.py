#!/usr/bin/env python3
"""Build a compact public-domain World English Bible corpus.

Source JSON is the verse-structured WEB distribution from
https://github.com/TehShrike/world-english-bible (public-domain text).
Deuterocanon is not included — Protestant 66-book canon only.

Usage:
  python3 scripts/ingest-web.py /tmp/web-src public/bible/web.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

# Protestant canon in traditional order. Filenames match TehShrike/world-english-bible.
BOOKS = [
    ("genesis", "GEN", "Genesis", "Gen", "OT"),
    ("exodus", "EXO", "Exodus", "Exod", "OT"),
    ("leviticus", "LEV", "Leviticus", "Lev", "OT"),
    ("numbers", "NUM", "Numbers", "Num", "OT"),
    ("deuteronomy", "DEU", "Deuteronomy", "Deut", "OT"),
    ("joshua", "JOS", "Joshua", "Josh", "OT"),
    ("judges", "JDG", "Judges", "Judg", "OT"),
    ("ruth", "RUT", "Ruth", "Ruth", "OT"),
    ("1samuel", "1SA", "1 Samuel", "1 Sam", "OT"),
    ("2samuel", "2SA", "2 Samuel", "2 Sam", "OT"),
    ("1kings", "1KI", "1 Kings", "1 Kgs", "OT"),
    ("2kings", "2KI", "2 Kings", "2 Kgs", "OT"),
    ("1chronicles", "1CH", "1 Chronicles", "1 Chr", "OT"),
    ("2chronicles", "2CH", "2 Chronicles", "2 Chr", "OT"),
    ("ezra", "EZR", "Ezra", "Ezra", "OT"),
    ("nehemiah", "NEH", "Nehemiah", "Neh", "OT"),
    ("esther", "EST", "Esther", "Esth", "OT"),
    ("job", "JOB", "Job", "Job", "OT"),
    ("psalms", "PSA", "Psalms", "Ps", "OT"),
    ("proverbs", "PRO", "Proverbs", "Prov", "OT"),
    ("ecclesiastes", "ECC", "Ecclesiastes", "Eccl", "OT"),
    ("songofsolomon", "SNG", "Song of Solomon", "Song", "OT"),
    ("isaiah", "ISA", "Isaiah", "Isa", "OT"),
    ("jeremiah", "JER", "Jeremiah", "Jer", "OT"),
    ("lamentations", "LAM", "Lamentations", "Lam", "OT"),
    ("ezekiel", "EZK", "Ezekiel", "Ezek", "OT"),
    ("daniel", "DAN", "Daniel", "Dan", "OT"),
    ("hosea", "HOS", "Hosea", "Hos", "OT"),
    ("joel", "JOL", "Joel", "Joel", "OT"),
    ("amos", "AMO", "Amos", "Amos", "OT"),
    ("obadiah", "OBA", "Obadiah", "Obad", "OT"),
    ("jonah", "JON", "Jonah", "Jonah", "OT"),
    ("micah", "MIC", "Micah", "Mic", "OT"),
    ("nahum", "NAM", "Nahum", "Nah", "OT"),
    ("habakkuk", "HAB", "Habakkuk", "Hab", "OT"),
    ("zephaniah", "ZEP", "Zephaniah", "Zeph", "OT"),
    ("haggai", "HAG", "Haggai", "Hag", "OT"),
    ("zechariah", "ZEC", "Zechariah", "Zech", "OT"),
    ("malachi", "MAL", "Malachi", "Mal", "OT"),
    ("matthew", "MAT", "Matthew", "Matt", "NT"),
    ("mark", "MRK", "Mark", "Mark", "NT"),
    ("luke", "LUK", "Luke", "Luke", "NT"),
    ("john", "JHN", "John", "John", "NT"),
    ("acts", "ACT", "Acts", "Acts", "NT"),
    ("romans", "ROM", "Romans", "Rom", "NT"),
    ("1corinthians", "1CO", "1 Corinthians", "1 Cor", "NT"),
    ("2corinthians", "2CO", "2 Corinthians", "2 Cor", "NT"),
    ("galatians", "GAL", "Galatians", "Gal", "NT"),
    ("ephesians", "EPH", "Ephesians", "Eph", "NT"),
    ("philippians", "PHP", "Philippians", "Phil", "NT"),
    ("colossians", "COL", "Colossians", "Col", "NT"),
    ("1thessalonians", "1TH", "1 Thessalonians", "1 Thess", "NT"),
    ("2thessalonians", "2TH", "2 Thessalonians", "2 Thess", "NT"),
    ("1timothy", "1TI", "1 Timothy", "1 Tim", "NT"),
    ("2timothy", "2TI", "2 Timothy", "2 Tim", "NT"),
    ("titus", "TIT", "Titus", "Titus", "NT"),
    ("philemon", "PHM", "Philemon", "Phlm", "NT"),
    ("hebrews", "HEB", "Hebrews", "Heb", "NT"),
    ("james", "JAS", "James", "Jas", "NT"),
    ("1peter", "1PE", "1 Peter", "1 Pet", "NT"),
    ("2peter", "2PE", "2 Peter", "2 Pet", "NT"),
    ("1john", "1JN", "1 John", "1 John", "NT"),
    ("2john", "2JN", "2 John", "2 John", "NT"),
    ("3john", "3JN", "3 John", "3 John", "NT"),
    ("jude", "JUD", "Jude", "Jude", "NT"),
    ("revelation", "REV", "Revelation", "Rev", "NT"),
]


def clean(text: str) -> str:
    return " ".join(text.replace("\u00a0", " ").split())


def book_from_tokens(tokens: list[dict]) -> list[list[str]]:
    """Join paragraph/line fragments into chapter arrays of verse strings."""
    verses: dict[tuple[int, int], list[str]] = {}
    order: list[tuple[int, int]] = []
    for token in tokens:
        kind = token.get("type")
        if kind not in ("paragraph text", "line text"):
            continue
        chapter = int(token["chapterNumber"])
        verse = int(token["verseNumber"])
        value = clean(token.get("value") or "")
        if not value:
            continue
        key = (chapter, verse)
        if key not in verses:
            verses[key] = []
            order.append(key)
        verses[key].append(value)

    if not order:
        raise RuntimeError("no verses parsed")

    chapters: list[list[str]] = []
    current_chapter = 0
    for chapter, verse in order:
        if chapter != current_chapter:
            if chapter != current_chapter + 1:
                raise RuntimeError(f"chapter gap {current_chapter} -> {chapter}")
            chapters.append([])
            current_chapter = chapter
        expected = len(chapters[-1]) + 1
        if verse < expected:
            raise RuntimeError(
                f"verse went backwards in chapter {chapter}: {verse} after {expected - 1}"
            )
        # Some public-domain editions omit a verse number (e.g. Luke 17:36).
        # Keep a blank slot so index+1 stays the real verse number.
        while expected < verse:
            chapters[-1].append("")
            print(f"  note: omitted verse number {current_chapter}:{expected}")
            expected += 1
        chapters[-1].append(clean(" ".join(verses[(chapter, verse)])))
    return chapters


def main() -> None:
    src = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/web-src")
    dest = Path(sys.argv[2] if len(sys.argv) > 2 else "public/bible/web.json")
    books_out = []
    total_verses = 0
    total_chapters = 0
    for filename, bid, name, abbr, testament in BOOKS:
        path = src / f"{filename}.json"
        tokens = json.loads(path.read_text(encoding="utf-8"))
        chapters = book_from_tokens(tokens)
        verse_count = sum(len(ch) for ch in chapters)
        total_verses += verse_count
        total_chapters += len(chapters)
        books_out.append(
            {
                "id": bid,
                "name": name,
                "abbr": abbr,
                "testament": testament,
                "chapters": chapters,
            }
        )
        print(f"{bid:4} {name:20} {len(chapters):3} ch  {verse_count:5} verses")

    payload = {
        "translation": "WEB",
        "name": "World English Bible",
        "canon": "protestant-66",
        "license": "public-domain",
        "attribution": (
            "Scripture text is the World English Bible (WEB), which is in the Public Domain. "
            "\"World English Bible\" is a trademark of eBible.org. "
            "Compiled for this app from the public-domain WEB JSON distribution."
        ),
        "books": books_out,
    }
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    size = dest.stat().st_size
    print(f"\n{len(books_out)} books, {total_chapters} chapters, {total_verses} verses")
    print(f"wrote {dest} ({size:,} bytes)")
    gen = books_out[0]["chapters"][0][0]
    rev = books_out[-1]["chapters"][-1][-1]
    jn = next(b for b in books_out if b["id"] == "JHN")
    print("GEN 1:1:", gen)
    print("JHN 1:1:", jn["chapters"][0][0])
    print("JHN 3:16:", jn["chapters"][2][15])
    print("REV last:", rev)


if __name__ == "__main__":
    main()
