'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { TwinCard } from '@/components/twin-card';
import type { TwinBody } from '@/lib/types';

const STEPS = ['Reading your Injective posts', 'Comparing with people waiting', 'Locking your pair'];

export function HomeFinder({ demo }: { demo: boolean }) {
  const router = useRouter();
  const [handle, setHandle] = useState('');
  const [phase, setPhase] = useState<'idle' | 'searching'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (phase !== 'searching') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const first = window.setTimeout(() => setStep(1), 700);
    const second = window.setTimeout(() => setStep(2), 1400);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(second);
    };
  }, [phase]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = handle.trim().replace(/^@+/, '');
    if (!next) {
      setMessage('Enter a valid X handle.');
      return;
    }
    setMessage(null);
    setStep(0);
    setPhase('searching');
    try {
      const response = await fetch('/api/twin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ handle: next }),
      });
      const body = (await response.json()) as TwinBody;
      if (body.status === 'paired' || body.status === 'waiting') {
        router.push(`/twin/${body.status === 'paired' ? body.pair.you.handle : body.handle}`);
        return;
      }
      setPhase('idle');
      setMessage(body.status === 'no_posts' || body.status === 'error' ? body.message : 'Something went wrong. Please try again.');
    } catch {
      setPhase('idle');
      setMessage('Something went wrong while searching. Please try again.');
    }
  }

  if (phase === 'searching') {
    return (
      <section className="center" aria-live="polite">
        <h1 className="title-search">Finding your twin</h1>
        <ol className="steps">
          {STEPS.map((label, index) => {
            const state = index < step ? 'done' : index === step ? 'now' : '';
            return (
              <li key={label} className={state}>
                {label}
                <span className="meta">{state === 'done' ? 'done' : state === 'now' ? 'now' : ''}</span>
              </li>
            );
          })}
        </ol>
        {demo ? <p className="hint">Example data</p> : null}
      </section>
    );
  }

  return (
    <section className="split">
      <div>
        <h1>
          The one person on X who posts about Injective <span className="nowrap">like you</span>
        </h1>
        <p className="lede">
          Type your handle. We read your recent public Injective posts and pair you with your closest match. One twin each, locked for good.
        </p>
        <form className="find" onSubmit={onSubmit}>
          <span aria-hidden="true">@</span>
          <input
            aria-label="X handle"
            placeholder="yourhandle"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={20}
            value={handle}
            onChange={(event) => setHandle(event.target.value)}
          />
          <button className="btn btn-lime" type="submit">
            Find my twin
          </button>
        </form>
        {message ? (
          <p className="alert" role="alert">
            {message}
          </p>
        ) : null}
        <p className="hint">Public posts only. Nothing is posted from your account</p>
      </div>
      <div>
        <p className="label">Example pair</p>
        <TwinCard
          status="Locked pair"
          score={87}
          why="Both of you post about INJ burns"
          left={{ initials: 'EA', handle: 'example_ada' }}
          right={{ initials: 'EK', handle: 'example_kofi' }}
        />
      </div>
    </section>
  );
}
