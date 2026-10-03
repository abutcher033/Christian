'use client';

import { useEffect, useMemo, useState } from 'react';
import { parseReference } from '@/lib/bible/reference';
import type { BibleBook, BibleCorpus, Place } from '@/lib/bible/types';

type Props = {
  open: boolean;
  corpus: BibleCorpus;
  current: Place | null;
  onClose: () => void;
  onJump: (place: Place) => void;
};

export function BookPicker({ open, corpus, current, onClose, onJump }: Props) {
  const [testament, setTestament] = useState<'OT' | 'NT'>('OT');
  const [bookId, setBookId] = useState<string | null>(current?.bookId ?? null);
  const [query, setQuery] = useState('');
  const [hint, setHint] = useState('');

  useEffect(() => {
    if (!open) return;
    setBookId(current?.bookId ?? null);
    setHint('');
    setQuery('');
    const book = corpus.books.find((item) => item.id === current?.bookId);
    if (book) setTestament(book.testament);
  }, [open, current, corpus.books]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const books = useMemo(
    () => corpus.books.filter((book) => book.testament === testament),
    [corpus.books, testament],
  );
  const selected = corpus.books.find((book) => book.id === bookId) ?? null;

  if (!open) return null;

  function submitQuery(event: React.FormEvent) {
    event.preventDefault();
    const place = parseReference(query, corpus.books);
    if (!place) {
      setHint('Try a reference like John 3:16, Psalm 23, or Genesis 1.');
      return;
    }
    onJump(place);
  }

  function chooseBook(book: BibleBook) {
    setBookId(book.id);
    setHint('');
  }

  return (
    <div className="overlay-backdrop" role="dialog" aria-modal="true" aria-label="Choose a book and chapter" onClick={onClose}>
      <div className="overlay-panel picker-panel" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span className="badge">World English Bible</span>
            <h2>Find a passage</h2>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <form className="ref-form" onSubmit={submitQuery}>
          <label htmlFor="reference">Type a verse</label>
          <div className="ref-row">
            <input
              id="reference"
              name="reference"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="John 3:16"
              autoComplete="off"
            />
            <button type="submit">Go</button>
          </div>
          {hint && <p className="settings-note">{hint}</p>}
        </form>

        <div className="testament-toggle" role="tablist" aria-label="Testament">
          <button type="button" aria-selected={testament === 'OT'} onClick={() => { setTestament('OT'); setBookId(null); }}>
            Old Testament
          </button>
          <button type="button" aria-selected={testament === 'NT'} onClick={() => { setTestament('NT'); setBookId(null); }}>
            New Testament
          </button>
        </div>

        {!selected && (
          <ul className="book-grid">
            {books.map((book) => {
              const active = current?.bookId === book.id;
              return (
                <li key={book.id}>
                  <button type="button" className={active ? 'is-current' : undefined} onClick={() => chooseBook(book)}>
                    {book.name}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {selected && (
          <div>
            <button type="button" className="text-button" onClick={() => setBookId(null)}>
              ← All {testament === 'OT' ? 'Old Testament' : 'New Testament'} books
            </button>
            <h3 className="chapter-heading">{selected.name}</h3>
            <ul className="chapter-grid">
              {selected.chapters.map((_, index) => {
                const chapter = index + 1;
                const active = current?.bookId === selected.id && current.chapter === chapter;
                return (
                  <li key={chapter}>
                    <button
                      type="button"
                      className={active ? 'is-current' : undefined}
                      onClick={() => onJump({ bookId: selected.id, chapter, verse: 1 })}
                    >
                      {chapter}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
