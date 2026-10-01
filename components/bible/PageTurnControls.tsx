'use client';

type Props = {
  label: string;
  spread: number;
  spreadCount: number;
  canGoNext: boolean;
  canGoPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
  onOpenPicker: () => void;
};

export function PageTurnControls({
  label,
  spread,
  spreadCount,
  canGoNext,
  canGoPrev,
  onNext,
  onPrev,
  onOpenPicker,
}: Props) {
  return (
    <div className="page-controls" role="group" aria-label="Page turns">
      <button type="button" onClick={onPrev} disabled={!canGoPrev} aria-label="Previous page">
        ← Prev
      </button>
      <button type="button" className="label label-button" onClick={onOpenPicker}>
        <span className="label-ref">{label}</span>
        <span className="label-count">
          {spread + 1} / {spreadCount}
        </span>
      </button>
      <button type="button" onClick={onNext} disabled={!canGoNext} aria-label="Next page">
        Next →
      </button>
    </div>
  );
}
