'use client';

import { useState } from 'react';
import { EvidenceDialog } from '@/components/evidence-dialog';
import { SITE_URL } from '@/lib/config';
import { pairShareText, waitingShareText, xIntentUrl } from '@/lib/share';
import type { PublicTrait } from '@/lib/types';

export function PairActions({
  origin,
  youHandle,
  twinHandle,
  similarity,
  why,
  traits,
  demo,
}: {
  origin: string;
  youHandle: string;
  twinHandle: string;
  similarity: number;
  why: string;
  traits: PublicTrait[];
  demo: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const pageUrl = `${origin}/twin/${youHandle}`;
  const share = xIntentUrl(pairShareText({ twinHandle, similarity, why, url: `${SITE_URL}/twin/${youHandle}` }));

  async function copy() {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <div className="actions">
        <a className="btn btn-lime" href={share} target="_blank" rel="noopener noreferrer">
          Share on X
        </a>
        <button type="button" className="btn btn-quiet" onClick={() => setOpen(true)}>
          See why you match
        </button>
      </div>
      <p className="hint">
        {demo ? 'Example data · ' : null}
        <button type="button" className="text-button" onClick={copy}>
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </p>
      {open ? (
        <EvidenceDialog
          traits={traits}
          youHandle={youHandle}
          twinHandle={twinHandle}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

export function WaitingActions({ handle }: { handle: string }) {
  const share = xIntentUrl(waitingShareText(`${SITE_URL}/twin/${handle}`));
  return (
    <div className="actions">
      <a className="btn btn-lime" href={share} target="_blank" rel="noopener noreferrer">
        Share so they find you
      </a>
    </div>
  );
}
