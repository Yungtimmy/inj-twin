export const SITE_HOST = 'injtwin.vercel.app';
export const CREDIT_HANDLE = 'tebasv2';

export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${SITE_HOST}`;
  return raw.replace(/\/$/, '');
}

export function siteHost(): string {
  try {
    return new URL(siteUrl()).host;
  } catch {
    return SITE_HOST;
  }
}

/** Fixture posts are the source when no X bearer token is configured. */
export function usingFixtures(): boolean {
  return !process.env.X_BEARER_TOKEN;
}
