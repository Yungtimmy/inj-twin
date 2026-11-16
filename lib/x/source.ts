import 'server-only';
import { XApiSource } from '@/lib/x/api-source';
import { FixtureSource } from '@/lib/x/fixture-source';
import type { XSource } from '@/lib/x/types';

export function getXSource(): XSource {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) return new FixtureSource();
  return new XApiSource(token);
}
