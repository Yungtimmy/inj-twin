import { clientIp, checkRateLimit } from '@/lib/rate-limit';
import { findTwin } from '@/lib/twin-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ status: 'error', message: 'Enter a valid X handle.' }, { status: 400 });
  }
  const handle =
    payload && typeof payload === 'object' && 'handle' in payload ? String((payload as { handle: unknown }).handle) : '';

  const limit = checkRateLimit(clientIp(request));
  if (!limit.ok) {
    return Response.json(
      { status: 'error', message: 'Too many searches from this network. Try again in a few minutes.' },
      { status: 429, headers: { 'retry-after': String(Math.max(1, Math.ceil(limit.retryAfterMs / 1000))) } },
    );
  }

  const result = await findTwin(handle);
  return Response.json(result.body, { status: result.http });
}
