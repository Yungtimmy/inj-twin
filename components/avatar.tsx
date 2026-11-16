'use client';

import { useState } from 'react';

export function Avatar({
  url,
  initials,
  tone,
}: {
  url?: string | null;
  initials: string;
  tone: 'c' | 'l';
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(url) && !failed;
  return (
    <div className={`av ${tone}`} aria-hidden="true">
      {showImage ? (
        // Avatars are remote public profile images. next/image would need a host allowlist per CDN.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url!} alt="" onError={() => setFailed(true)} />
      ) : (
        initials
      )}
    </div>
  );
}
