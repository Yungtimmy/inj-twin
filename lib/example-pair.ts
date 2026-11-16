import ada from '@/fixtures/users/example_ada.json';
import kofi from '@/fixtures/users/example_kofi.json';
import mina from '@/fixtures/users/example_mina.json';
import { initials } from '@/lib/handles';
import { buildProfile } from '@/lib/matching/profile';
import { rankCandidates } from '@/lib/matching/rank';
import type { Post, PostType, Profile } from '@/lib/types';

type FixtureFile = {
  handle: string;
  posts: Array<{ id: string; text: string; createdAt: string; type: string }>;
};

// Ada, Kofi, and Mina are the sample walkthrough: Mina waits, then Ada and Kofi lock.
// IDF across that trio is what the stored pair score is measured against.
const SAMPLE: FixtureFile[] = [ada, kofi, mina];

function postsOf(file: FixtureFile): Post[] {
  return file.posts.map((post) => ({
    id: post.id,
    text: post.text,
    createdAt: post.createdAt,
    type: (post.type === 'reply' || post.type === 'quote' ? post.type : 'original') as PostType,
  }));
}

function sampleProfiles(): Profile[] {
  return SAMPLE.flatMap((file) => {
    const profile = buildProfile(file.handle, postsOf(file));
    return profile ? [profile] : [];
  });
}

/**
 * Landing example. Same posts and the same scorer as a search across the sample community.
 */
export function examplePair() {
  const profiles = sampleProfiles();
  const ada = profiles.find((profile) => profile.handle === 'example_ada');
  const others = profiles.filter((profile) => profile.handle !== 'example_ada');
  const match = ada ? rankCandidates(ada, others).find((candidate) => candidate.handle === 'example_kofi') : undefined;
  if (!ada || !match) {
    throw new Error('Example fixtures must pair example_ada with example_kofi.');
  }
  return {
    score: match.similarity,
    why: match.why,
    left: { initials: initials('example_ada'), handle: 'example_ada' },
    right: { initials: initials('example_kofi'), handle: 'example_kofi' },
  };
}
