import { Avatar } from '@/components/avatar';
import { PairDots } from '@/components/pair-dots';
import { siteHost } from '@/lib/config';

export type CardPerson = {
  initials: string;
  handle: string;
  avatarUrl?: string | null;
};

export function TwinCard({
  status,
  left,
  right,
  score,
  why,
}: {
  status: string;
  left: CardPerson;
  right: CardPerson | null;
  score: number | null;
  why: string;
}) {
  return (
    <article className="tcard">
      <div className="top">
        <div className="mark">
          <PairDots />
          INJ Twin
        </div>
        <span>{status}</span>
      </div>
      <div className="duo">
        <Avatar url={left.avatarUrl} initials={left.initials} tone="c" />
        {right ? (
          <Avatar url={right.avatarUrl} initials={right.initials} tone="l" />
        ) : (
          <div className="ghost" aria-hidden="true" />
        )}
      </div>
      {score === null ? (
        <div className="score-gap" />
      ) : (
        <p className="score">
          {score}
          <small>%</small>
        </p>
      )}
      <p className="handles">
        @{left.handle}
        <span className="amp">&</span>
        {right ? `@${right.handle}` : <span className="wait">waiting</span>}
      </p>
      <p className="why">{why}</p>
      <div className="foot">
        <span>{siteHost()}</span>
        <span>Built by @tebasv2</span>
      </div>
    </article>
  );
}
