import { describe, expect, it } from 'vitest';
import { initials, normalizeHandle } from '@/lib/handles';
import { ogWhy, pairShareText, waitingShareText, xIntentUrl } from '@/lib/share';
import { recentSearchQuery } from '@/lib/x/query';

describe('handles', () => {
  it('normalizes case and a leading @', () => {
    expect(normalizeHandle('  @Example_Ada ')).toBe('example_ada');
    expect(normalizeHandle('EXAMPLE_KOFI')).toBe('example_kofi');
    expect(normalizeHandle('@a')).toBe('a');
  });

  it('rejects blanks and handles X would not accept', () => {
    expect(normalizeHandle('')).toBeNull();
    expect(normalizeHandle('@')).toBeNull();
    expect(normalizeHandle('nope space')).toBeNull();
    expect(normalizeHandle('waytoolonghandle1')).toBeNull();
    expect(normalizeHandle('user.name')).toBeNull();
  });

  it('builds the card initials', () => {
    expect(initials('example_ada')).toBe('EA');
    expect(initials('example_kofi')).toBe('EK');
  });
});

describe('share links', () => {
  it('opens an intent URL and never a post endpoint', () => {
    const text = pairShareText({
      twinHandle: 'example_kofi',
      similarity: 87,
      why: 'Both of you post about INJ burns',
      url: 'https://injtwin.vercel.app/twin/example_ada',
    });
    const url = xIntentUrl(text);
    expect(url.startsWith('https://x.com/intent/post?text=')).toBe(true);
    expect(url).not.toContain('/2/tweets');
    expect(decodeURIComponent(url)).toContain('@example_kofi');
    expect(waitingShareText('https://injtwin.vercel.app/twin/example_mina')).toContain('Waiting for my INJ twin');
    expect(ogWhy('Both of you post about INJ burns')).toBe('Both post about INJ burns');
  });

  it('builds the recent search from the handle and the Injective terms', () => {
    const query = recentSearchQuery('example_ada');
    expect(query).toContain('from:example_ada');
    expect(query).toContain('(injective OR @injective OR $INJ OR #injective)');
  });
});
