'use client';

type Props = {
  label: string;
  pageLabel: string;
  canGoNext: boolean;
  canGoPrev: boolean;
  canChapterNext: boolean;
  canChapterPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
  onChapterNext: () => void;
  onChapterPrev: () => void;
  onOpenPicker: () => void;
};

export function PageTurnControls({
  label,
  pageLabel,
  canGoNext,
  canGoPrev,
  canChapterNext,
  canChapterPrev,
  onNext,
  onPrev,
  onChapterNext,
  onChapterPrev,
  onOpenPicker,
}: Props) {
  return (
    <div className="page-controls">
      <button type="button" className="chapter-jump" onClick={onChapterPrev} disabled={!canChapterPrev}>
        Previous chapter
      </button>
      <button type="button" onClick={onPrev} disabled={!canGoPrev} aria-label="Previous page">
        Previous page
      </button>
      <button
        type="button"
        className="label label-button"
        onClick={onOpenPicker}
        aria-label={`${label}. ${pageLabel}. Choose a book and chapter.`}
      >
        <span className="label-ref">{label}</span>
        <span className="label-count">{pageLabel}</span>
      </button>
      <button type="button" onClick={onNext} disabled={!canGoNext} aria-label="Next page">
        Next page
      </button>
      <button type="button" className="chapter-jump" onClick={onChapterNext} disabled={!canChapterNext}>
        Next chapter
      </button>
    </div>
  );
}
