import Link from "next/link";

import { Card, DomainTag } from "@/components/ui";
import { formatMinutes, formatSessionDate } from "@/lib/dates";
import { domainMeta } from "@/lib/domains";
import type { SessionWithDetail } from "@/db/queries";

/**
 * One sitting. The stacked bar shows how the time split across domains, which
 * is the thing worth seeing at a glance — a 90 minute session that was all one
 * domain reads very differently from one that covered four.
 */
export function SessionCard({
  session,
  today,
  labels,
}: {
  session: SessionWithDetail;
  today: string;
  labels: { instruments: Map<number, string>; genres: Map<number, string>; epTracks: Map<number, string> };
}) {
  const total = session.segments.reduce((sum, segment) => sum + segment.minutes, 0);

  return (
    <Card className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-medium">{formatSessionDate(session.occurredOn, today)}</h3>
        <div className="flex items-baseline gap-3">
          <span className="text-sm tabular-nums text-ink-muted">{formatMinutes(total)}</span>
          <Link
            href={`/sessions/${session.id}/edit`}
            className="text-sm text-ink-faint underline-offset-4 hover:text-ink hover:underline"
          >
            Edit
          </Link>
        </div>
      </div>

      {total > 0 ? (
        <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
          {session.segments
            .filter((segment) => segment.minutes > 0)
            .map((segment) => (
              <span
                key={segment.id}
                className="h-full"
                style={{
                  width: `${(segment.minutes / total) * 100}%`,
                  background: domainMeta(segment.domain).color,
                }}
              />
            ))}
        </div>
      ) : null}

      <ul className="space-y-1.5">
        {session.segments.map((segment) => {
          const detail =
            (segment.instrumentId ? labels.instruments.get(segment.instrumentId) : null) ??
            (segment.genreId ? labels.genres.get(segment.genreId) : null) ??
            (segment.epTrackId ? labels.epTracks.get(segment.epTrackId) : null);

          return (
            <li key={segment.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <DomainTag domain={segment.domain} minutes={segment.minutes} />
              {detail ? <span className="text-xs text-ink-faint">· {detail}</span> : null}
              {segment.notes ? (
                <span className="w-full text-sm text-ink-muted">{segment.notes}</span>
              ) : null}
            </li>
          );
        })}
      </ul>

      {session.journal ? (
        <dl className="space-y-2 border-t border-line pt-3 text-sm">
          {session.journal.whatWorked ? (
            <div>
              <dt className="text-xs text-ink-faint">Worked</dt>
              <dd className="text-ink-muted">{session.journal.whatWorked}</dd>
            </div>
          ) : null}
          {session.journal.whatDidnt ? (
            <div>
              <dt className="text-xs text-ink-faint">Didn&apos;t</dt>
              <dd className="text-ink-muted">{session.journal.whatDidnt}</dd>
            </div>
          ) : null}
          {session.journal.focusNext ? (
            <div>
              <dt className="text-xs text-ink-faint">Next</dt>
              <dd className="text-ink-muted">{session.journal.focusNext}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </Card>
  );
}
