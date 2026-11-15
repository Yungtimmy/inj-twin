import type { Profile, StoredTrait } from '@/lib/types';
import { tfidfVector } from '@/lib/matching/score';

function chooseLabel(term: string, a: Profile, b: Profile): string {
  const labels = [a.termLabels[term], b.termLabels[term]].filter((label): label is string => Boolean(label));
  if (labels.length === 0) return term;
  labels.sort((left, right) => right.length - left.length || left.localeCompare(right));
  return labels[0]!;
}

function traitScore(term: string, left: Record<string, number>, right: Record<string, number>): number {
  const base = (left[term] ?? 0) + (right[term] ?? 0);
  return term.includes(' ') ? base * 1.15 : base;
}

/** Shared terms both people used, best phrase first. Price words never reach this list. */
export function extractTraits(a: Profile, b: Profile, idf: Map<string, number>, limit = 3): StoredTrait[] {
  const left = tfidfVector(a, idf);
  const right = tfidfVector(b, idf);
  const shared = Object.keys(left).filter((term) => {
    if ((right[term] ?? 0) <= 0) return false;
    if ((a.termCounts[term] ?? 0) <= 0 || (b.termCounts[term] ?? 0) <= 0) return false;
    const postsA = a.termPosts[term] ?? [];
    const postsB = b.termPosts[term] ?? [];
    return postsA.length > 0 && postsB.length > 0;
  });

  const bigramParts = new Set(shared.filter((term) => term.includes(' ')).flatMap((term) => term.split(' ')));
  const ranked = shared
    .filter((term) => term.includes(' ') || !bigramParts.has(term))
    .sort((x, y) => traitScore(y, left, right) - traitScore(x, left, right) || x.localeCompare(y));

  return ranked.slice(0, limit).map((term) => {
    const label = chooseLabel(term, a, b);
    const postsA = a.termPosts[term] ?? [];
    const postsB = b.termPosts[term] ?? [];
    return {
      term,
      label,
      phrase: `Both of you post about ${label}`,
      evidence: {
        [a.handle]: { count: postsA.length, postIds: postsA },
        [b.handle]: { count: postsB.length, postIds: postsB },
      },
    };
  });
}
