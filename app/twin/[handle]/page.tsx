import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PairActions, WaitingActions } from '@/components/pair-actions';
import { TwinCard } from '@/components/twin-card';
import { WaitingRefresh } from '@/components/waiting-refresh';
import { siteUrl, usingFixtures } from '@/lib/config';
import { initials, normalizeHandle } from '@/lib/handles';
import { ogWhy } from '@/lib/share';
import { requestOrigin } from '@/lib/origin';
import { readTwin } from '@/lib/twin-service';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { handle: raw } = await params;
  const handle = normalizeHandle(raw);
  if (!handle) return { title: 'INJ Twin' };
  const result = await readTwin(handle);
  const image = `/api/og/${handle}`;
  const canonical = `${siteUrl()}/twin/${handle}`;
  if (result.body.status === 'paired') {
    const { pair } = result.body;
    const title = `@${pair.you.handle} & @${pair.twin.handle}`;
    const description = `${pair.similarity}% · ${ogWhy(pair.why)}`;
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: { title, description, url: canonical, images: [{ url: image, width: 1200, height: 630 }] },
      twitter: { card: 'summary_large_image', title, description, images: [image] },
    };
  }
  if (result.body.status === 'waiting' || result.http === 404) {
    const title = `@${handle} is waiting for an INJ twin`;
    const description = "Your twin hasn't arrived yet.";
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: { title, description, url: canonical, images: [{ url: image, width: 1200, height: 630 }] },
      twitter: { card: 'summary_large_image', title, description, images: [image] },
    };
  }
  return { title: 'INJ Twin' };
}

export default async function TwinPage({ params }: RouteParams) {
  const { handle: raw } = await params;
  const handle = normalizeHandle(raw);
  if (!handle) notFound();
  if (raw !== handle) redirect(`/twin/${handle}`);

  const result = await readTwin(handle);
  const origin = await requestOrigin();

  if (result.body.status === 'paired') {
    const { pair } = result.body;
    return (
      <section className="split result">
        <div>
          <h1>Meet your twin</h1>
          <p className="lede">
            This pair is locked. When @{pair.twin.handle} searches, they&apos;ll see you, and neither of you gets matched again.
          </p>
          <PairActions
            origin={origin}
            youHandle={pair.you.handle}
            twinHandle={pair.twin.handle}
            similarity={pair.similarity}
            why={pair.why}
            traits={pair.traits}
            demo={pair.demo}
          />
        </div>
        <div>
          <TwinCard
            status="Locked pair"
            score={pair.similarity}
            why={pair.why}
            left={pair.you}
            right={pair.twin}
          />
        </div>
      </section>
    );
  }

  const waiting =
    result.body.status === 'waiting'
      ? result.body
      : result.http === 404
        ? {
            handle,
            initials: initials(handle),
            avatarUrl: null as string | null,
            demo: usingFixtures(),
          }
        : null;

  if (waiting) {
    return (
      <section className="split">
        <div>
          <h1>Your twin hasn&apos;t arrived yet</h1>
          <p className="lede">
            You&apos;re in the pool. When the next person who posts about Injective like you searches, you&apos;ll be paired and this page will show them.
          </p>
          <WaitingActions handle={waiting.handle} />
          {waiting.demo ? <p className="hint">Example data</p> : null}
          {result.body.status === 'waiting' ? <WaitingRefresh /> : null}
        </div>
        <div>
          <TwinCard
            status="In the pool"
            score={null}
            why="Your twin is the next person who posts like you"
            left={{ initials: waiting.initials, handle: waiting.handle, avatarUrl: waiting.avatarUrl }}
            right={null}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="split">
      <div>
        <h1>Twin pool is not connected</h1>
        <p className="lede">
          {result.body.status === 'error' ? result.body.message : 'The twin pool is not available right now. Please try again.'}
        </p>
        <div className="actions">
          <Link className="btn btn-lime" href="/">
            Find my twin
          </Link>
        </div>
      </div>
    </section>
  );
}
