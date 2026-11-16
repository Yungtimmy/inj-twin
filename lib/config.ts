/** Public site URL. Override with NEXT_PUBLIC_SITE_URL. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://twininj.vercel.app').replace(/\/$/, '');
export const CREDIT_HANDLE = 'tebasv2';

export function siteUrl(): string {
  return SITE_URL;
}

export function siteHost(): string {
  try {
    return new URL(SITE_URL).host;
  } catch {
    return 'twininj.vercel.app';
  }
}

/** Fixture posts are the source when no X bearer token is configured. */
export function usingFixtures(): boolean {
  return !process.env.X_BEARER_TOKEN;
}
