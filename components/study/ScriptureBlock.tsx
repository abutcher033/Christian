import type { Passage } from '@/lib/bible/passage';

type Props = {
  passage: Passage | null;
  heading?: string;
};

export function ScriptureBlock({ passage, heading = 'Scripture first' }: Props) {
  if (!passage || passage.verses.length === 0) return null;
  return (
    <div className="verse-strip scripture-block">
      <strong>
        {heading} · {passage.ref}
      </strong>
      {passage.verses.map((verse) => (
        <p key={verse.n}>
          <sup>{verse.n}</sup> {verse.text}
        </p>
      ))}
    </div>
  );
}
