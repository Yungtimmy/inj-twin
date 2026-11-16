import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import type { Post, PostType } from '@/lib/types';
import { UnknownHandleError, XSourceError } from '@/lib/x/errors';
import type { XPerson, XSource } from '@/lib/x/types';

type FixtureFile = {
  handle: string;
  displayName?: string;
  avatarUrl?: string | null;
  posts?: Array<{
    id?: string;
    text?: string;
    createdAt?: string;
    type?: string;
  }>;
};

function asType(value: string | undefined): PostType {
  if (value === 'reply' || value === 'quote' || value === 'original') return value;
  return 'original';
}

export class FixtureSource implements XSource {
  readonly demo = true;

  constructor(private readonly dir = path.join(process.cwd(), 'fixtures', 'users')) {}

  async fetchUser(handle: string): Promise<XPerson> {
    let raw: string;
    try {
      raw = await readFile(path.join(this.dir, `${handle}.json`), 'utf8');
    } catch {
      throw new UnknownHandleError(handle);
    }
    let parsed: FixtureFile;
    try {
      parsed = JSON.parse(raw) as FixtureFile;
    } catch {
      throw new XSourceError(`Sample data for @${handle} could not be read.`);
    }
    const posts: Post[] = (parsed.posts ?? []).flatMap((post) => {
      if (!post.id || !post.text || !post.createdAt) return [];
      return [{ id: post.id, text: post.text, createdAt: post.createdAt, type: asType(post.type) }];
    });
    return {
      handle,
      displayName: parsed.displayName?.trim() || handle,
      avatarUrl: parsed.avatarUrl ?? null,
      posts,
    };
  }

  async listHandles(): Promise<string[]> {
    const files = await readdir(this.dir);
    return files.filter((file) => file.endsWith('.json')).map((file) => file.slice(0, -5)).sort();
  }
}
