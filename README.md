# INJ Twin

Find the one person on X who posts about Injective like you. You each get one twin, locked for good.

Type a handle. INJ Twin reads recent public posts, replies, and quotes that mention Injective, @injective, or $INJ, and pairs you with the community member whose posting looks most like yours. If nobody suitable is waiting, you stay in the pool until the next person who posts like you searches.

The app never posts on your behalf. Share on X opens an `x.com/intent/post` link with the text filled in.

Built by [@tebasv2](https://x.com/tebasv2). Community-built, not affiliated with Injective.

Design polish via unslop by [@heydamir](https://x.com/heydamir).

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL. The browser never calls Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-only service role key. Do not prefix it with `NEXT_PUBLIC_`. |
| `X_BEARER_TOKEN` | no | X API v2 app-only bearer token. When it is unset, searches read `fixtures/users` and the UI shows a Demo data badge. |
| `NEXT_PUBLIC_SITE_URL` | no | Public site URL used in share text. Defaults to `https://injtwin.vercel.app`. |
| `DATABASE_URL` | tests | Postgres connection string for `npm test`. The concurrency test drops and recreates the `public` schema on this database. |

Copy `.env.example` to `.env.local` and fill in the Supabase values.

`lib/supabase.ts` imports `server-only`, so the service role key cannot be bundled into client code. Row level security is enabled on every table. There are no policies for `anon` or `authenticated`, and those roles are revoked from the tables and from `claim_twin`.

## Migrations

SQL lives in `supabase/migrations`. Apply it with the Supabase CLI:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Or run the file yourself:

```bash
psql "$DATABASE_URL" -f supabase/migrations/20261115120000_init.sql
```

`paired_handles.handle` is the primary key that keeps each handle in at most one pair. `claim_twin` is a `SECURITY DEFINER` function. The app calls it with `supabase.rpc` inside one transaction: the searcher row is locked with `FOR UPDATE`, and each candidate is locked with `FOR UPDATE SKIP LOCKED`. Searching again returns the existing pair.

## Local checks

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run build
npm run dev
```

Point `DATABASE_URL` at an empty database before `npm test`. The default in `.env.example` is a local Postgres database named `injtwin_test`. Do not point it at production. The test applies the migration itself.

With `X_BEARER_TOKEN` unset, try `@example_ada`, `@example_kofi`, `@example_mina`, `@example_jonas`, `@example_rio`, and `@example_lurker`. Ada and Kofi post about the same topics. Mina is still waiting if she searches before anyone who posts like her. Lurker has no Injective posts and is not added to the pool.

## Matching

A profile is three pieces, all from posts the handle actually wrote:

- the mix of original posts, replies, and quotes
- topic terms weighted by TF-IDF across the waiting pool, with stopwords, URLs, mentions, cashtags, and price words removed (price, pump, moon, target, entry, and similar)
- a 24-bin histogram of posting hours in UTC

Similarity is a weighted cosine: terms 0.6, post types 0.2, hours 0.2. The card shows that score as a percentage. A trait is a term both people used. The database stores the post ids behind it. The "See why you match" dialog shows the counts, for example `5 posts · 4 posts`, and the post text those ids point at.

## X data

`XSource` has two implementations.

- `XApiSource` calls X API v2 recent search (about a 7-day window) with `from:<handle> (injective OR @injective OR $INJ OR #injective) -is:retweet`, and the user lookup for the display name and avatar.
- `FixtureSource` reads `fixtures/users` when `X_BEARER_TOKEN` is unset. Those files are sample data.

Reads are cached in `x_reads` for 24 hours. A 429 from X becomes a retry message. `POST /api/twin` allows 10 searches per 10 minutes per IP.

## API

- `POST /api/twin` with `{ "handle": "example_ada" }` returns `{ "status": "paired", "pair" }`, `{ "status": "waiting" }`, `{ "status": "no_posts" }`, or `{ "status": "error" }`.
- `GET /api/twin/[handle]` returns the pair from either handle.
- `GET /api/og/[handle]` returns the 1200×630 share card. The UI uses the fonts in `fonts/`. `fonts/satori` is the same families with layout tables removed so `next/og` can draw them.
