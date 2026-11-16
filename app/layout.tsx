import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { siteUrl, usingFixtures } from '@/lib/config';
import './globals.css';

const sans = localFont({
  src: [
    { path: '../fonts/Geist-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../fonts/Geist-Medium.ttf', weight: '500', style: 'normal' },
    { path: '../fonts/Geist-SemiBold.ttf', weight: '600', style: 'normal' },
  ],
  variable: '--font-sans',
  display: 'swap',
});

const serif = localFont({
  src: '../fonts/InstrumentSerif-Regular.ttf',
  weight: '400',
  style: 'normal',
  variable: '--font-serif',
  display: 'swap',
});

const mono = localFont({
  src: '../fonts/GeistMono-Medium.ttf',
  weight: '500',
  style: 'normal',
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'INJ Twin',
    template: '%s · INJ Twin',
  },
  description:
    'Find the one person on X who posts about Injective like you. One twin each, locked for good.',
};

export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body>
        <div className="wrap">
          <SiteHeader demo={usingFixtures()} />
          {children}
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
