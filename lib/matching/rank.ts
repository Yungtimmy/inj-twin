import type { Profile, StoredTrait } from '@/lib/types';
import { idfWeights, similarity, similarityPercent } from '@/lib/matching/score';
import { extractTraits } from '@/lib/matching/traits';

export type RankedCandidate = {
  handle: string;
  similarity: number;
  why: string;
  traits: StoredTrait[];
};

export function rankCandidates(searcher: Profile, pool: Profile[]): RankedCandidate[] {
  const corpus = [searcher, ...pool.filter((profile) => profile.handle !== searcher.handle)];
  const idf = idfWeights(corpus);
  return pool
    .filter((profile) => profile.handle !== searcher.handle)
    .map((profile) => {
      const traits = extractTraits(searcher, profile, idf);
      return {
        handle: profile.handle,
        similarity: similarityPercent(similarity(searcher, profile, idf)),
        why: traits[0]?.phrase ?? '',
        traits,
      };
    })
    .filter((candidate) => candidate.traits.length > 0)
    .sort((a, b) => b.similarity - a.similarity || a.handle.localeCompare(b.handle));
}
