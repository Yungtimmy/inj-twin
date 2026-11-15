import type { Post, PostType, Profile } from '@/lib/types';
import { DOMAIN_STOP, prettyToken, tokenize } from '@/lib/matching/text';

function keepBigram(left: string, right: string): boolean {
  if (DOMAIN_STOP.has(left) && DOMAIN_STOP.has(right)) return false;
  if (DOMAIN_STOP.has(right)) return false;
  return true;
}

function bestLabel(counts: Map<string, number>, fallback: string): string {
  let best = fallback;
  let n = -1;
  for (const [label, count] of counts) {
    if (count > n || (count === n && label.length > best.length)) {
      best = label;
      n = count;
    }
  }
  return best;
}

export function buildProfile(handle: string, posts: Post[]): Profile | null {
  if (posts.length === 0) return null;

  const typeCounts: Record<PostType, number> = { original: 0, reply: 0, quote: 0 };
  const hours = Array.from({ length: 24 }, () => 0);
  const termCounts = new Map<string, number>();
  const termPosts = new Map<string, Set<string>>();
  const labelCounts = new Map<string, Map<string, number>>();

  const bump = (term: string, label: string, postId: string) => {
    termCounts.set(term, (termCounts.get(term) ?? 0) + 1);
    const ids = termPosts.get(term) ?? new Set<string>();
    ids.add(postId);
    termPosts.set(term, ids);
    const labels = labelCounts.get(term) ?? new Map<string, number>();
    labels.set(label, (labels.get(label) ?? 0) + 1);
    labelCounts.set(term, labels);
  };

  for (const post of posts) {
    const type = post.type === 'reply' || post.type === 'quote' ? post.type : 'original';
    typeCounts[type] += 1;
    const hour = new Date(post.createdAt).getUTCHours();
    if (Number.isInteger(hour) && hour >= 0 && hour <= 23) hours[hour] += 1;

    const tokens = tokenize(post.text);
    for (let i = 0; i < tokens.length; i += 1) {
      const current = tokens[i]!;
      if (!DOMAIN_STOP.has(current.lemma)) {
        bump(current.lemma, prettyToken(current.lemma, current.surface), post.id);
      }
      const next = tokens[i + 1];
      if (!next || next.position !== current.position + 1 || !keepBigram(current.lemma, next.lemma)) continue;
      const term = `${current.lemma} ${next.lemma}`;
      const label = `${prettyToken(current.lemma, current.surface)} ${prettyToken(next.lemma, next.surface)}`;
      bump(term, label, post.id);
    }
  }

  const total = posts.length;
  const termCountRecord: Record<string, number> = {};
  const termPostRecord: Record<string, string[]> = {};
  const termLabelRecord: Record<string, string> = {};
  for (const [term, count] of termCounts) {
    termCountRecord[term] = count;
    termPostRecord[term] = [...(termPosts.get(term) ?? [])].sort();
    termLabelRecord[term] = bestLabel(labelCounts.get(term) ?? new Map(), term);
  }

  return {
    handle,
    typeVector: [
      typeCounts.original / total,
      typeCounts.reply / total,
      typeCounts.quote / total,
    ],
    hourVector: hours,
    termCounts: termCountRecord,
    termPosts: termPostRecord,
    termLabels: termLabelRecord,
  };
}
