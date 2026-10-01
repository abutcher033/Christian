import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MediaPanel } from '@/components/study/MediaPanel';
import { ScriptureBlock } from '@/components/study/ScriptureBlock';
import { getEntryById, STUDY_ENTRIES } from '@/data/studyContent';
import { slicePassage } from '@/lib/bible/passage';
import { readCorpus } from '@/lib/bible/corpus.server';

type Props = { params: { entryId: string } };

export function generateStaticParams() {
  return STUDY_ENTRIES.map((entry) => ({ entryId: entry.id }));
}

function renderMd(body: string) {
  return body.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>');
}

export default function StudyEntryPage({ params }: Props) {
  const entry = getEntryById(params.entryId);
  if (!entry) notFound();
  const passage = slicePassage(
    readCorpus(),
    entry.book,
    entry.chapter,
    entry.verseStart,
    entry.verseEnd,
  );

  return (
    <main className="study-route">
      <p>
        <Link href="/">← Back to the Bible</Link>
      </p>
      <article className="study-card">
        <span className="badge">{entry.type}</span>
        <h1>{entry.title}</h1>
        <p className="muted-line">
          {entry.book} {entry.chapter}:{entry.verseStart}
          {entry.verseEnd !== entry.verseStart ? `–${entry.verseEnd}` : ''} · World English Bible
        </p>
        <ScriptureBlock passage={passage} />
        <p className="study-summary">{entry.summary}</p>
        <div className="study-body" dangerouslySetInnerHTML={{ __html: renderMd(entry.bodyMd) }} />
        <MediaPanel entry={entry} />
        <div className="response-box">
          <h4>Pray</h4>
          <p>{entry.prayerPrompt}</p>
          <h4>Apply</h4>
          <p>{entry.apply}</p>
        </div>
        {entry.relatedIds.length > 0 && (
          <section>
            <h2>Related</h2>
            <ul>
              {entry.relatedIds.map((id) => {
                const related = getEntryById(id);
                if (!related) return null;
                return (
                  <li key={id}>
                    <Link href={`/study/${id}`}>{related.title}</Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </article>
    </main>
  );
}
