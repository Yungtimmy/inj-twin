'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Re-read the pair while this handle is still waiting. Motion stays still. */
export function WaitingRefresh() {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => router.refresh(), 8000);
    return () => window.clearInterval(id);
  }, [router]);
  return null;
}
