import 'server-only';
import { cache } from 'react';
import { usingFixtures } from '@/lib/config';
import { initials, normalizeHandle } from '@/lib/handles';
import { buildProfile } from '@/lib/matching/profile';
import { rankCandidates } from '@/lib/matching/rank';
import { getSupabase } from '@/lib/supabase';
import type { Post, PostType, Profile, PublicMember, PublicPair, PublicTrait, StoredTrait, TwinBody } from '@/lib/types';
import { isSupabaseConfigError, SUPABASE_CONFIG_MESSAGE } from '@/lib/supabase-config';
import { loadPerson } from '@/lib/x/cache';
import { UnknownHandleError, XRateLimitError, XSourceError } from '@/lib/x/errors';

type MemberRow = {
  handle: string;
  display_name: string;
  avatar_url: string | null;
  post_count: number;
  type_vector: unknown;
  hour_vector: unknown;
  term_counts: Record<string, number> | null;
  term_posts: Record<string, string[]> | null;
  term_labels: Record<string, string> | null;
  posts: Post[] | null;
  status: 'waiting' | 'paired';
  pair_id: string | null;
  demo: boolean;
};

type PairRow = {
  id: string;
  handle_a: string;
  handle_b: string;
  similarity: number;
  traits: StoredTrait[] | null;
  why: string;
};

const SAMPLE_HINT = 'Try @example_ada, @example_kofi, @example_mina, or @example_jonas.';
const NO_POSTS = (handle: string) =>
  `We couldn't find recent posts about Injective from @${handle}. Post about Injective, then try again.`;

function asNumbers(value: unknown): number[] {
  if (Array.isArray(value)) return value.map((item) => Number(item) || 0);
  if (typeof value === 'string') {
    return value
      .replace(/[{}]/g, '')
      .split(',')
      .filter(Boolean)
      .map((item) => Number(item) || 0);
  }
  return [];
}

function asVector(value: unknown, length: number): number[] {
  const numbers = asNumbers(value);
  return Array.from({ length }, (_, index) => numbers[index] ?? 0);
}

function rowToProfile(row: MemberRow): Profile {
  const types = asVector(row.type_vector, 3);
  return {
    handle: row.handle,
    typeVector: [types[0] ?? 0, types[1] ?? 0, types[2] ?? 0],
    hourVector: asVector(row.hour_vector, 24),
    termCounts: row.term_counts ?? {},
    termPosts: row.term_posts ?? {},
    termLabels: row.term_labels ?? {},
  };
}

function memberPublic(row: Pick<MemberRow, 'handle' | 'display_name' | 'avatar_url'>): PublicMember {
  return {
    handle: row.handle,
    displayName: row.display_name || row.handle,
    avatarUrl: row.avatar_url,
    initials: initials(row.handle),
  };
}

function clip(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= 180) return clean;
  return `${clean.slice(0, 177).trimEnd()}…`;
}

function traitForViewer(
  trait: StoredTrait,
  you: string,
  twin: string,
  postsByHandle: Map<string, Post[]>,
): PublicTrait {
  const youEvidence = trait.evidence?.[you] ?? { count: 0, postIds: [] };
  const twinEvidence = trait.evidence?.[twin] ?? { count: 0, postIds: [] };
  const excerpts = [you, twin].flatMap((handle) => {
    const ids = trait.evidence?.[handle]?.postIds ?? [];
    const posts = new Map((postsByHandle.get(handle) ?? []).map((post) => [post.id, post]));
    return ids.slice(0, 2).flatMap((postId) => {
      const post = posts.get(postId);
      if (!post) return [];
      return [{ handle, postId, text: clip(post.text) }];
    });
  });
  return {
    term: trait.term,
    label: trait.label,
    phrase: trait.phrase,
    youCount: youEvidence.count,
    twinCount: twinEvidence.count,
    evidenceLabel: `${youEvidence.count} posts · ${twinEvidence.count} posts`,
    excerpts,
  };
}

function storedPosts(posts: Post[]): Post[] {
  return posts.slice(0, 100).map((post) => ({
    id: String(post.id),
    text: post.text.slice(0, 500),
    createdAt: post.createdAt,
    type: (post.type === 'reply' || post.type === 'quote' ? post.type : 'original') as PostType,
  }));
}

async function getMember(handle: string): Promise<MemberRow | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('members').select('*').eq('handle', handle).maybeSingle();
  if (error) throw error;
  return (data as MemberRow | null) ?? null;
}

async function listWaiting(except: string): Promise<MemberRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('members').select('*').eq('status', 'waiting').neq('handle', except);
  if (error) throw error;
  return (data as MemberRow[] | null) ?? [];
}

function waitingBody(row: MemberRow): TwinBody {
  return {
    status: 'waiting',
    handle: row.handle,
    displayName: row.display_name || row.handle,
    avatarUrl: row.avatar_url,
    initials: initials(row.handle),
    demo: row.demo || usingFixtures(),
  };
}

export async function loadPair(handle: string): Promise<PublicPair | null> {
  const you = await getMember(handle);
  if (!you || you.status !== 'paired' || !you.pair_id) return null;
  const supabase = getSupabase();
  const { data, error } = await supabase.from('pairs').select('*').eq('id', you.pair_id).maybeSingle();
  if (error) throw error;
  const pair = data as PairRow | null;
  if (!pair) return null;
  const otherHandle = pair.handle_a === handle ? pair.handle_b : pair.handle_a;
  const twin = await getMember(otherHandle);
  if (!twin) return null;
  const postsByHandle = new Map<string, Post[]>([
    [you.handle, you.posts ?? []],
    [twin.handle, twin.posts ?? []],
  ]);
  return {
    similarity: pair.similarity,
    why: pair.why,
    demo: you.demo || twin.demo || usingFixtures(),
    you: memberPublic(you),
    twin: memberPublic(twin),
    traits: (pair.traits ?? []).map((trait) => traitForViewer(trait, you.handle, twin.handle, postsByHandle)),
  };
}

export const readTwin = cache(async (rawHandle: string): Promise<{ http: number; body: TwinBody }> => {
  const handle = normalizeHandle(rawHandle);
  if (!handle) return { http: 400, body: { status: 'error', message: 'Enter a valid X handle.' } };
  try {
    const member = await getMember(handle);
    if (!member) return { http: 404, body: { status: 'error', message: `No twin yet for @${handle}.` } };
    if (member.status === 'paired') {
      const pair = await loadPair(handle);
      if (!pair) return { http: 404, body: { status: 'error', message: `No twin yet for @${handle}.` } };
      return { http: 200, body: { status: 'paired', pair } };
    }
    return { http: 200, body: waitingBody(member) };
  } catch (error) {
    if (isSupabaseConfigError(error)) {
      return { http: 503, body: { status: 'error', code: 'config', message: SUPABASE_CONFIG_MESSAGE } };
    }
    console.error('readTwin failed', error instanceof Error ? error.message : 'unknown');
    return { http: 500, body: { status: 'error', message: 'Could not load this twin. Please try again.' } };
  }
});

export async function findTwin(rawHandle: string): Promise<{ http: number; body: TwinBody }> {
  const handle = normalizeHandle(rawHandle);
  if (!handle) return { http: 400, body: { status: 'error', message: 'Enter a valid X handle.' } };

  try {
    const existing = await getMember(handle);
    if (existing?.status === 'paired') {
      const pair = await loadPair(handle);
      if (pair) return { http: 200, body: { status: 'paired', pair } };
    }

    const record = await loadPerson(handle);
    if (record.person.posts.length === 0) {
      if (existing?.status === 'waiting') return { http: 200, body: waitingBody(existing) };
      return { http: 200, body: { status: 'no_posts', handle, message: NO_POSTS(handle) } };
    }

    const profile = buildProfile(handle, record.person.posts);
    if (!profile) {
      return { http: 200, body: { status: 'no_posts', handle, message: NO_POSTS(handle) } };
    }

    const waiting = await listWaiting(handle);
    const ranked = rankCandidates(profile, waiting.map(rowToProfile));
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('claim_twin', {
      p_handle: handle,
      p_display_name: record.person.displayName,
      p_avatar_url: record.person.avatarUrl,
      p_post_count: record.person.posts.length,
      p_type_vector: profile.typeVector,
      p_hour_vector: profile.hourVector,
      p_term_counts: profile.termCounts,
      p_term_posts: profile.termPosts,
      p_term_labels: profile.termLabels,
      p_posts: storedPosts(record.person.posts),
      p_demo: record.demo,
      p_candidates: ranked,
    });
    if (error) {
      console.error('claim_twin failed', error.message);
      return { http: 500, body: { status: 'error', message: 'Could not lock a twin just now. Please try again.' } };
    }

    const payload = typeof data === 'string' ? (JSON.parse(data) as { status?: string }) : (data as { status?: string } | null);
    if (payload?.status === 'paired') {
      const pair = await loadPair(handle);
      if (!pair) {
        return { http: 500, body: { status: 'error', message: 'The pair was saved but could not be read back. Please try again.' } };
      }
      return { http: 200, body: { status: 'paired', pair } };
    }

    const member = await getMember(handle);
    if (!member) {
      return { http: 500, body: { status: 'error', message: 'Could not save your place in the pool. Please try again.' } };
    }
    return { http: 200, body: waitingBody(member) };
  } catch (error) {
    if (error instanceof XRateLimitError) return { http: 429, body: { status: 'error', message: error.message } };
    if (error instanceof UnknownHandleError) {
      const message = usingFixtures()
        ? `No sample posts for @${handle}. ${SAMPLE_HINT}`
        : `We couldn't find @${handle} on X.`;
      return { http: 404, body: { status: 'error', message } };
    }
    if (error instanceof XSourceError) return { http: 502, body: { status: 'error', message: error.message } };
    if (isSupabaseConfigError(error)) {
      return { http: 503, body: { status: 'error', code: 'config', message: SUPABASE_CONFIG_MESSAGE } };
    }
    console.error('findTwin failed', error instanceof Error ? error.message : 'unknown');
    return { http: 500, body: { status: 'error', message: 'Something went wrong while reading posts. Please try again.' } };
  }
}
