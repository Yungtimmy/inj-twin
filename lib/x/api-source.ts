import type { Post, PostType } from '@/lib/types';
import { UnknownHandleError, XRateLimitError, XSourceError } from '@/lib/x/errors';
import { recentSearchQuery } from '@/lib/x/query';
import type { XPerson, XSource } from '@/lib/x/types';

const API = 'https://api.x.com/2';

type XTweet = {
  id?: string;
  text?: string;
  created_at?: string;
  referenced_tweets?: Array<{ type?: string; id?: string }>;
};

type XUser = {
  name?: string;
  username?: string;
  profile_image_url?: string;
};

function postType(tweet: XTweet): PostType | null {
  const refs = tweet.referenced_tweets ?? [];
  if (refs.some((ref) => ref.type === 'retweeted')) return null;
  if (refs.some((ref) => ref.type === 'replied_to')) return 'reply';
  if (refs.some((ref) => ref.type === 'quoted')) return 'quote';
  return 'original';
}

function mapTweet(tweet: XTweet): Post | null {
  if (!tweet.id || !tweet.text) return null;
  const type = postType(tweet);
  if (!type) return null;
  return {
    id: tweet.id,
    text: tweet.text,
    createdAt: tweet.created_at ?? new Date(0).toISOString(),
    type,
  };
}

export class XApiSource implements XSource {
  readonly demo = false;

  constructor(private readonly token: string) {}

  async fetchUser(handle: string): Promise<XPerson> {
    const headers = { Authorization: `Bearer ${this.token}` };
    const search = new URL(`${API}/tweets/search/recent`);
    search.searchParams.set('query', recentSearchQuery(handle));
    search.searchParams.set('max_results', '100');
    search.searchParams.set('tweet.fields', 'created_at,referenced_tweets,author_id');

    const userUrl = new URL(`${API}/users/by/username/${encodeURIComponent(handle)}`);
    userUrl.searchParams.set('user.fields', 'name,username,profile_image_url');

    let userRes: Response;
    let searchRes: Response;
    try {
      [userRes, searchRes] = await Promise.all([
        fetch(userUrl, { headers, signal: AbortSignal.timeout(12_000) }),
        fetch(search, { headers, signal: AbortSignal.timeout(12_000) }),
      ]);
    } catch {
      throw new XSourceError('X did not respond. Try again in a few minutes.');
    }

    if (userRes.status === 429 || searchRes.status === 429) throw new XRateLimitError();
    if (userRes.status === 404) throw new UnknownHandleError(handle);
    if (!userRes.ok) throw new XSourceError('X could not look up that handle. Try again in a few minutes.');
    if (!searchRes.ok) throw new XSourceError('X could not return posts just now. Try again in a few minutes.');

    const userJson = (await userRes.json()) as { data?: XUser };
    const searchJson = (await searchRes.json()) as { data?: XTweet[] };
    if (!userJson.data) throw new UnknownHandleError(handle);

    const posts = (searchJson.data ?? []).flatMap((tweet) => {
      const post = mapTweet(tweet);
      return post ? [post] : [];
    });

    return {
      handle,
      displayName: userJson.data.name?.trim() || handle,
      avatarUrl: userJson.data.profile_image_url ?? null,
      posts: posts.slice(0, 100),
    };
  }
}
