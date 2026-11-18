import ada from '@/fixtures/users/example_ada.json';
import kofi from '@/fixtures/users/example_kofi.json';
import { initials } from '@/lib/handles';
import { buildProfile } from '@/lib/matching/profile';
import { rankCandidates } from '@/lib/matching/rank';
import type { Post, PostType } from '@/lib/types';

type FixtureFile = {
  handle: string;
  posts: Array<{ id: string; text: string; createdAt: string; type: string }>;
};

function postsOf(file: FixtureFile): Post[] {
  return file.posts.map((post) => ({
    id: post.id,
    text: post.text,
    createdAt: post.createdAt,
    type: (post.type === 'reply' || post.type === 'quote' ? post.type : 'original') as PostType,
  }));
}

/**
 * Landing example. Ada and Kofi are scored against each other with the same
 * ranker a search uses when they are the whole pool, which is how the live pair was locked.
 */
export function examplePair() {
  const adaProfile = buildProfile(ada.handle, postsOf(ada));
  const kofiProfile = buildProfile(kofi.handle, postsOf(kofi));
  const match = adaProfile && kofiProfile ? rankCandidates(adaProfile, [kofiProfile])[0] : undefined;
  if (!adaProfile || !kofiProfile || !match || match.handle !== kofi.handle) {
    throw new Error('Example fixtures must pair example_ada with example_kofi.');
  }
  return {
    score: match.similarity,
    why: match.why,
    left: { initials: initials(adaProfile.handle), handle: adaProfile.handle },
    right: { initials: initials(kofiProfile.handle), handle: kofiProfile.handle },
  };
}
