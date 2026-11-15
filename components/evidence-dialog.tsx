'use client';

import { useEffect, useRef } from 'react';
import type { PublicTrait } from '@/lib/types';

export function EvidenceDialog({
  traits,
  youHandle,
  twinHandle,
  onClose,
}: {
  traits: PublicTrait[];
  youHandle: string;
  twinHandle: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
  }, []);

  return (
    <dialog ref={ref} className="panel" aria-labelledby="why-title" onClose={onClose}>
      <div className="panel-body">
        <h2 id="why-title">Why you match</h2>
        <p className="sub">
          @{youHandle} and @{twinHandle}. Counts are posts you each wrote that use the term.
        </p>
        {traits.map((trait) => (
          <section className="trait" key={trait.term}>
            <h3>{trait.label}</h3>
            <p className="meta">{trait.evidenceLabel}</p>
            {trait.excerpts.map((excerpt) => (
              <p className="excerpt" key={`${excerpt.handle}-${excerpt.postId}`}>
                <b>@{excerpt.handle}</b> {excerpt.text}
              </p>
            ))}
          </section>
        ))}
        <div className="actions">
          <button type="button" className="btn btn-quiet" onClick={() => ref.current?.close()}>
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}
