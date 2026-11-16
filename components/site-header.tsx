import Link from 'next/link';
import { PairDots } from '@/components/pair-dots';

export function SiteHeader({ demo }: { demo: boolean }) {
  return (
    <nav>
      <Link href="/" className="mark">
        <PairDots />
        INJ Twin
        {demo ? <span className="badge">Demo data</span> : null}
      </Link>
      <span className="credit">
        Built by{' '}
        <b>
          <a href="https://x.com/tebasv2" target="_blank" rel="noopener noreferrer">
            @tebasv2
          </a>
        </b>
      </span>
    </nav>
  );
}
