export type PostType = 'original' | 'reply' | 'quote';

export type Post = {
  id: string;
  text: string;
  createdAt: string;
  type: PostType;
};

export type Profile = {
  handle: string;
  typeVector: [number, number, number];
  hourVector: number[];
  termCounts: Record<string, number>;
  termPosts: Record<string, string[]>;
  termLabels: Record<string, string>;
};

export type TraitEvidence = {
  count: number;
  postIds: string[];
};

export type StoredTrait = {
  term: string;
  label: string;
  phrase: string;
  evidence: Record<string, TraitEvidence>;
};

export type PublicMember = {
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  initials: string;
};

export type PublicExcerpt = {
  handle: string;
  postId: string;
  text: string;
};

export type PublicTrait = {
  term: string;
  label: string;
  phrase: string;
  youCount: number;
  twinCount: number;
  evidenceLabel: string;
  excerpts: PublicExcerpt[];
};

export type PublicPair = {
  similarity: number;
  why: string;
  demo: boolean;
  you: PublicMember;
  twin: PublicMember;
  traits: PublicTrait[];
};

export type TwinBody =
  | { status: 'paired'; pair: PublicPair }
  | {
      status: 'waiting';
      handle: string;
      displayName: string;
      avatarUrl: string | null;
      initials: string;
      demo: boolean;
    }
  | { status: 'no_posts'; handle: string; message: string }
  | { status: 'error'; message: string };
