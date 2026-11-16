import type { Post } from '@/lib/types';

export type XPerson = {
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  posts: Post[];
};

export type PersonRecord = {
  demo: boolean;
  person: XPerson;
};

export interface XSource {
  readonly demo: boolean;
  fetchUser(handle: string): Promise<XPerson>;
}
