import { readTwin } from '@/lib/twin-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ handle: string }> }) {
  const { handle } = await context.params;
  const result = await readTwin(handle);
  return Response.json(result.body, { status: result.http });
}
