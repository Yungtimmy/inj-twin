import type { Profile } from '@/lib/types';

export const WEIGHTS = {
  terms: 0.6,
  types: 0.2,
  hours: 0.2,
} as const;

export function cosine(a: number[], b: number[]): number {
  const length = Math.max(a.length, b.length);
  let dot = 0;
  let left = 0;
  let right = 0;
  for (let i = 0; i < length; i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    left += x * x;
    right += y * y;
  }
  if (left === 0 || right === 0) return 0;
  return dot / (Math.sqrt(left) * Math.sqrt(right));
}

export function sparseCosine(a: Record<string, number>, b: Record<string, number>): number {
  let dot = 0;
  let left = 0;
  let right = 0;
  for (const value of Object.values(a)) left += value * value;
  for (const value of Object.values(b)) right += value * value;
  for (const [term, value] of Object.entries(a)) {
    const other = b[term];
    if (other) dot += value * other;
  }
  if (left === 0 || right === 0) return 0;
  return dot / (Math.sqrt(left) * Math.sqrt(right));
}

/** Smoothed IDF across the pool, including the person searching. */
export function idfWeights(profiles: Profile[]): Map<string, number> {
  const documents = profiles.length;
  const df = new Map<string, number>();
  for (const profile of profiles) {
    for (const [term, count] of Object.entries(profile.termCounts)) {
      if (count > 0) df.set(term, (df.get(term) ?? 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  for (const [term, documentsWithTerm] of df) {
    idf.set(term, Math.log((documents + 1) / (documentsWithTerm + 1)) + 1);
  }
  return idf;
}

export function tfidfVector(profile: Profile, idf: Map<string, number>): Record<string, number> {
  const vector: Record<string, number> = {};
  for (const [term, count] of Object.entries(profile.termCounts)) {
    if (count <= 0) continue;
    const weight = idf.get(term) ?? 0;
    vector[term] = (1 + Math.log(count)) * weight;
  }
  return vector;
}

export function similarity(a: Profile, b: Profile, idf: Map<string, number>): number {
  const terms = sparseCosine(tfidfVector(a, idf), tfidfVector(b, idf));
  const types = cosine(a.typeVector, b.typeVector);
  const hours = cosine(a.hourVector, b.hourVector);
  const score = WEIGHTS.terms * terms + WEIGHTS.types * types + WEIGHTS.hours * hours;
  if (!Number.isFinite(score)) return 0;
  return Math.min(1, Math.max(0, score));
}

export function similarityPercent(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(100, Math.max(0, Math.round(score * 100)));
}
