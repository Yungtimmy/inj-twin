import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { OgCard } from '@/lib/og-card';
import { normalizeHandle } from '@/lib/handles';
import { ogWhy } from '@/lib/share';
import { readTwin } from '@/lib/twin-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Fonts = { serif: Buffer; sans: Buffer; semi: Buffer; mono: Buffer };

let fonts: Fonts | null = null;

async function loadFonts(): Promise<Fonts> {
  if (fonts) return fonts;
  // fonts/satori drops GSUB/GPOS. next/og cannot read those tables in the full files.
  const dir = path.join(process.cwd(), 'fonts', 'satori');
  const [serif, sans, semi, mono] = await Promise.all([
    readFile(path.join(dir, 'InstrumentSerif-Regular.ttf')),
    readFile(path.join(dir, 'Geist-Medium.ttf')),
    readFile(path.join(dir, 'Geist-SemiBold.ttf')),
    readFile(path.join(dir, 'GeistMono-Medium.ttf')),
  ]);
  fonts = { serif, sans, semi, mono };
  return fonts;
}

export async function GET(_request: Request, context: { params: Promise<{ handle: string }> }) {
  const { handle: raw } = await context.params;
  const handle = normalizeHandle(raw) ?? '';
  const loaded = await loadFonts();
  const fontConfig = [
    { name: 'Instrument Serif', data: loaded.serif, weight: 400 as const, style: 'normal' as const },
    { name: 'Geist', data: loaded.sans, weight: 500 as const, style: 'normal' as const },
    { name: 'Geist', data: loaded.semi, weight: 600 as const, style: 'normal' as const },
    { name: 'Geist Mono', data: loaded.mono, weight: 500 as const, style: 'normal' as const },
  ];

  let card = <OgCard kind="empty" />;
  if (handle) {
    const result = await readTwin(handle);
    if (result.body.status === 'paired') {
      const { pair } = result.body;
      card = (
        <OgCard
          kind="paired"
          score={pair.similarity}
          handleA={pair.you.handle}
          handleB={pair.twin.handle}
          initialsA={pair.you.initials}
          initialsB={pair.twin.initials}
          why={ogWhy(pair.why)}
        />
      );
    } else if (result.body.status === 'waiting') {
      card = (
        <OgCard
          kind="waiting"
          handleA={result.body.handle}
          initialsA={result.body.initials}
        />
      );
    }
  }

  return new ImageResponse(card, {
    width: 1200,
    height: 630,
    fonts: fontConfig,
    headers: { 'cache-control': 'public, max-age=60' },
  });
}
