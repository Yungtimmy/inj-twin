import 'server-only';
import { headers } from 'next/headers';
import { siteUrl } from '@/lib/config';

export async function requestOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host');
  if (!host) return siteUrl();
  const forwarded = headerList.get('x-forwarded-proto');
  const proto = forwarded ?? (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https');
  return `${proto}://${host}`;
}
