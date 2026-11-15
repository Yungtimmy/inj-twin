import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildProfile } from '@/lib/matching/profile';
import { rankCandidates } from '@/lib/matching/rank';
import { cosine, idfWeights, similarity, WEIGHTS } from '@/lib/matching/score';
import { PRICE_TERMS, stem, tokenize } from '@/lib/matching/text';
import { extractTraits } from '@/lib/matching/traits';
import type { Post, Profile } from '@/lib/types';

function profile(handle: string, overrides: Partial<Profile> = {}): Profile {
  return {
    handle,
    typeVector: [1, 0, 0],
    hourVector: Array.from({ length: 24 }, (_, hour) => (hour === 10 ? 4 : 0)),
    termCounts: { burn: 3, auction: 2 },
    termPosts: { burn: ['1', '2', '3'], auction: ['1', '2'] },
    termLabels: { burn: 'burns', auction: 'auctions' },
    ...overrides,
  };
}

function loadPosts(handle: string): Post[] {
  const file = JSON.parse(readFileSync(path.join(process.cwd(), 'fixtures', 'users', `${handle}.json`), 'utf8')) as {
    posts: Post[];
  };
  return file.posts;
}

describe('tokenize', () => {
  it('drops urls, mentions, cashtags, stopwords, and price talk', () => {
    const tokens = tokenize('Burn details https://t.co/abc $INJ @someone #Injective pump the price to the moon').map(
      (token) => token.lemma,
    );
    expect(tokens).toContain('burn');
    expect(tokens).toContain('injective');
    expect(tokens).toContain('detail');
    expect(tokens.join(' ')).not.toMatch(/http|someone|moon|pump|price/);
    for (const term of PRICE_TERMS) expect(tokens).not.toContain(term);
  });

  it('stems a trailing plural s', () => {
    expect(stem('burns')).toBe('burn');
    expect(stem('auctions')).toBe('auction');
    expect(stem('inj')).toBe('inj');
    expect(stem('tokenomics')).toBe('tokenomics');
  });
});

describe('profiles and traits', () => {
  it('builds hour bins, type mix, and an INJ burns label from real text', () => {
    const built = buildProfile('ada', [
      {
        id: '1',
        text: 'INJ burns are not a price pump or a moon target entry',
        createdAt: '2026-11-14T14:30:00.000Z',
        type: 'reply',
      },
    ]);
    expect(built).not.toBeNull();
    expect(built!.hourVector[14]).toBe(1);
    expect(built!.typeVector).toEqual([0, 1, 0]);
    expect(built!.termCounts.price).toBeUndefined();
    expect(built!.termCounts.moon).toBeUndefined();
    expect(built!.termCounts.pump).toBeUndefined();
    expect(built!.termCounts.target).toBeUndefined();
    expect(built!.termCounts.entry).toBeUndefined();
    expect(built!.termLabels['inj burn']).toBe('INJ burns');
    expect(built!.termPosts['inj burn']).toEqual(['1']);
  });

  it('does not profile a handle with zero posts', () => {
    expect(buildProfile('lurker', [])).toBeNull();
  });

  it('keeps price-only posts out of the trait vocabulary', () => {
    const built = buildProfile('rio', loadPosts('example_rio'));
    expect(built).not.toBeNull();
    for (const term of Object.keys(built!.termCounts)) {
      for (const part of term.split(' ')) expect(PRICE_TERMS.has(part)).toBe(false);
    }
  });

  it('scores identical profiles at 1 and disjoint topics on type and hours only', () => {
    const left = profile('a');
    const right = profile('b');
    const idf = idfWeights([left, right]);
    expect(similarity(left, right, idf)).toBeCloseTo(1, 5);
    expect(cosine([1, 0], [0, 1])).toBe(0);
    expect(WEIGHTS.terms + WEIGHTS.types + WEIGHTS.hours).toBeCloseTo(1, 5);

    const other = profile('c', {
      termCounts: { governance: 4 },
      termPosts: { governance: ['9'] },
      termLabels: { governance: 'governance' },
    });
    const split = idfWeights([left, other]);
    expect(similarity(left, other, split)).toBeCloseTo(0.4, 5);
    expect(extractTraits(left, other, split)).toEqual([]);
  });

  it('pairs example_ada with example_kofi on shared burn evidence', () => {
    const ada = buildProfile('example_ada', loadPosts('example_ada'));
    const kofi = buildProfile('example_kofi', loadPosts('example_kofi'));
    const mina = buildProfile('example_mina', loadPosts('example_mina'));
    const jonas = buildProfile('example_jonas', loadPosts('example_jonas'));
    const rio = buildProfile('example_rio', loadPosts('example_rio'));
    expect(ada && kofi && mina && jonas && rio).toBeTruthy();

    const ranked = rankCandidates(ada!, [kofi!, mina!, jonas!, rio!]);
    expect(ranked[0]?.handle).toBe('example_kofi');
    expect(ranked[0]!.traits.some((trait) => /burn/i.test(trait.label))).toBe(true);
    expect(ranked[0]!.why).toMatch(/INJ burns/i);
    for (const trait of ranked[0]!.traits) {
      expect(trait.term).not.toMatch(/price|pump|moon|target|entry/);
      const adaIds = trait.evidence.example_ada?.postIds ?? [];
      const kofiIds = trait.evidence.example_kofi?.postIds ?? [];
      expect(adaIds.length).toBeGreaterThan(0);
      expect(kofiIds.length).toBeGreaterThan(0);
      expect(adaIds.length).toBe(trait.evidence.example_ada?.count);
      expect(adaIds.every((id) => loadPosts('example_ada').some((post) => post.id === id))).toBe(true);
      expect(kofiIds.every((id) => loadPosts('example_kofi').some((post) => post.id === id))).toBe(true);
    }
    const minaRank = ranked.find((candidate) => candidate.handle === 'example_mina');
    if (minaRank) expect(ranked[0]!.similarity).toBeGreaterThan(minaRank.similarity);
    expect(ranked[0]!.similarity).toBeGreaterThan(50);
  });
});
