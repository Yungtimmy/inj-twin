import { siteHost } from '@/lib/config';

const bg = '#0C0E15';
const text = '#ECEAE3';
const text2 = '#9C9BA6';
const text3 = '#64646F';
const cobalt = '#4A68FF';
const lime = '#C6F04D';

function Mark() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 26, fontWeight: 600, color: text }}>
      <div style={{ display: 'flex' }}>
        <div style={{ width: 28, height: 28, borderRadius: 14, background: cobalt }} />
        <div style={{ width: 28, height: 28, borderRadius: 14, background: lime, marginLeft: -10 }} />
      </div>
      <div style={{ display: 'flex' }}>INJ Twin</div>
    </div>
  );
}

function Footer() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        fontFamily: 'Geist Mono',
        fontSize: 20,
        fontWeight: 500,
        color: text3,
        lineHeight: 1.6,
        textAlign: 'right',
      }}
    >
      <div style={{ display: 'flex' }}>Find yours at {siteHost()}</div>
      <div style={{ display: 'flex' }}>Built by @tebasv2</div>
    </div>
  );
}

function Avatar({ initials, tone }: { initials: string; tone: 'c' | 'l' }) {
  return (
    <div
      style={{
        display: 'flex',
        width: 150,
        height: 150,
        borderRadius: 75,
        alignItems: 'center',
        justifyContent: 'center',
        background: tone === 'c' ? cobalt : lime,
        color: tone === 'c' ? text : bg,
        fontSize: 46,
        fontWeight: 600,
        border: `6px solid ${bg}`,
        marginLeft: tone === 'l' ? -30 : 0,
      }}
    >
      {initials}
    </div>
  );
}

export function OgCard({
  kind,
  score,
  handleA,
  handleB,
  initialsA,
  initialsB,
  why,
}: {
  kind: 'paired' | 'waiting' | 'empty';
  score?: number;
  handleA?: string;
  handleB?: string;
  initialsA?: string;
  initialsB?: string;
  why?: string;
}) {
  const paired = kind === 'paired';
  return (
    <div
      style={{
        width: 1200,
        height: 630,
        display: 'flex',
        padding: 64,
        background: bg,
        justifyContent: 'space-between',
        fontFamily: 'Geist',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <Mark />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {paired ? (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', fontFamily: 'Instrument Serif', fontSize: 200, color: text, lineHeight: 0.9 }}>{score}</div>
              <div style={{ display: 'flex', width: 28, height: 28 }} />
              <div style={{ display: 'flex', fontFamily: 'Instrument Serif', fontSize: 96, color: text2, marginBottom: 16 }}>%</div>
            </div>
          ) : (
            <div style={{ display: 'flex', fontFamily: 'Instrument Serif', fontSize: 92, color: text, letterSpacing: '-0.03em' }}>
              {kind === 'waiting' ? 'Waiting' : 'Find your twin'}
            </div>
          )}
          <div style={{ display: 'flex', marginTop: 28, fontSize: 32, fontWeight: 500, color: text }}>
            {paired ? <div style={{ display: 'flex' }}>@{handleA}</div> : null}
            {paired ? <div style={{ display: 'flex', color: text3, margin: '0 12px' }}>&</div> : null}
            {paired ? <div style={{ display: 'flex' }}>@{handleB}</div> : null}
            {!paired && kind === 'waiting' ? <div style={{ display: 'flex' }}>@{handleA} is in the pool</div> : null}
            {kind === 'empty' ? <div style={{ display: 'flex' }}>One twin each. Locked for good.</div> : null}
          </div>
          <div style={{ display: 'flex', marginTop: 14, fontSize: 24, color: text2 }}>
            {paired ? why : kind === 'waiting' ? "Your twin hasn't arrived yet" : 'Posts about Injective, matched once'}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex' }}>
          {kind === 'empty' ? null : <Avatar initials={initialsA ?? 'IN'} tone="c" />}
          {paired ? <Avatar initials={initialsB ?? 'TW'} tone="l" /> : kind === 'waiting' ? (
            <div
              style={{
                display: 'flex',
                width: 150,
                height: 150,
                borderRadius: 75,
                marginLeft: -30,
                border: '3px dashed #64646F',
              }}
            />
          ) : null}
        </div>
        <Footer />
      </div>
    </div>
  );
}
