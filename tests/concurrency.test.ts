import { readFileSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/injtwin_test';
const pool = new Pool({ connectionString: databaseUrl, max: 16 });
const hours = Array.from({ length: 24 }, (_, hour) => (hour === 12 ? 1 : 0));

type ClaimResult = {
  status: string;
  pair_id?: string;
  existing?: boolean;
  handle_a?: string;
  handle_b?: string;
};

async function applyMigration() {
  const client = await pool.connect();
  try {
    await client.query('drop schema if exists public cascade');
    await client.query('create schema public');
    await client.query('grant all on schema public to public');
    const sql = readFileSync(path.join(process.cwd(), 'supabase/migrations/20261115120000_init.sql'), 'utf8');
    await client.query(sql);
  } finally {
    client.release();
  }
}

async function seedWaiting(handle: string) {
  await pool.query(
    `insert into public.members (
       handle, display_name, post_count, type_vector, hour_vector,
       term_counts, term_posts, term_labels, posts, status, demo
     ) values (
       $1, $1, 1, $2::float8[], $3::float8[],
       '{"burn":1}'::jsonb, '{"burn":["p1"]}'::jsonb, '{"burn":"burns"}'::jsonb,
       '[]'::jsonb, 'waiting', false
     )`,
    [handle, [1, 0, 0], hours],
  );
}

async function claim(
  handle: string,
  candidates: Array<{ handle: string; similarity: number; why: string; traits: unknown[] }>,
): Promise<ClaimResult> {
  const client = await pool.connect();
  try {
    const result = await client.query<{ result: ClaimResult }>(
      `select public.claim_twin(
         $1::text, $2::text, null::text, 4,
         $3::float8[], $4::float8[],
         $5::jsonb, $6::jsonb, $7::jsonb, '[]'::jsonb,
         false, $8::jsonb
       ) as result`,
      [
        handle,
        handle,
        [0.6, 0.2, 0.2],
        hours,
        JSON.stringify({ burn: 2 }),
        JSON.stringify({ burn: ['p1', 'p2'] }),
        JSON.stringify({ burn: 'burns' }),
        JSON.stringify(candidates),
      ],
    );
    return result.rows[0]!.result;
  } finally {
    client.release();
  }
}

async function expectNoDoublePairs() {
  const dupes = await pool.query(
    `select handle, count(*)::int as n from (
       select handle_a as handle from public.pairs
       union all
       select handle_b from public.pairs
     ) sides
     group by handle
     having count(*) > 1`,
  );
  const broken = await pool.query<{ n: number }>(
    `select count(*)::int as n
     from public.pairs p
     join public.members a on a.handle = p.handle_a
     join public.members b on b.handle = p.handle_b
     where a.pair_id is distinct from p.id
        or b.pair_id is distinct from p.id
        or a.status <> 'paired'
        or b.status <> 'paired'
        or not exists (
          select 1 from public.paired_handles ph where ph.handle = p.handle_a and ph.pair_id = p.id
        )
        or not exists (
          select 1 from public.paired_handles ph where ph.handle = p.handle_b and ph.pair_id = p.id
        )`,
  );
  const orphans = await pool.query<{ n: number }>(
    `select count(*)::int as n
     from public.paired_handles ph
     where not exists (
       select 1 from public.pairs p
       where p.id = ph.pair_id and (p.handle_a = ph.handle or p.handle_b = ph.handle)
     )`,
  );
  expect(dupes.rows).toEqual([]);
  expect(broken.rows[0]!.n).toBe(0);
  expect(orphans.rows[0]!.n).toBe(0);
}

describe('claim_twin concurrency', () => {
  beforeAll(async () => {
    await applyMigration();
  });

  beforeEach(async () => {
    await pool.query('truncate public.members, public.pairs, public.paired_handles, public.x_reads cascade');
  });

  afterAll(async () => {
    await pool.end();
  });

  it('is security definer and locks candidates with skip locked', async () => {
    const result = await pool.query<{ prosecdef: boolean; prosrc: string }>(
      `select prosecdef, prosrc from pg_proc where proname = 'claim_twin'`,
    );
    expect(result.rows[0]?.prosecdef).toBe(true);
    expect(result.rows[0]?.prosrc.toLowerCase()).toContain('for update skip locked');
    const key = await pool.query(
      `select count(*)::int as n from pg_constraint
       where conrelid = 'public.paired_handles'::regclass and contype = 'p'`,
    );
    expect(key.rows[0]?.n).toBe(1);
  });

  it('gives each waiting member to at most one concurrent searcher', async () => {
    await seedWaiting('w1');
    await seedWaiting('w2');
    await seedWaiting('w3');
    const candidates = [
      { handle: 'w1', similarity: 90, why: 'Both of you post about burns', traits: [] },
      { handle: 'w2', similarity: 80, why: 'Both of you post about burns', traits: [] },
      { handle: 'w3', similarity: 70, why: 'Both of you post about burns', traits: [] },
    ];
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, index) => claim(`s${index}`, candidates)),
    );
    const paired = results.filter((result) => result.status === 'paired');
    const waiting = results.filter((result) => result.status === 'waiting');
    expect(paired).toHaveLength(3);
    expect(waiting).toHaveLength(5);
    expect(new Set(paired.map((result) => result.pair_id)).size).toBe(3);

    const counts = await pool.query<{ status: string; n: number }>(
      `select status, count(*)::int as n from public.members group by status`,
    );
    const byStatus = Object.fromEntries(counts.rows.map((row) => [row.status, row.n]));
    expect(byStatus.paired).toBe(6);
    expect(byStatus.waiting).toBe(5);
    const seeds = await pool.query<{ n: number }>(
      `select count(*)::int as n from public.members where handle like 'w%' and status = 'paired'`,
    );
    expect(seeds.rows[0]!.n).toBe(3);
    await expectNoDoublePairs();
  });

  it('returns the locked pair on a later search and refuses a second twin', async () => {
    await seedWaiting('w1');
    const first = await claim('s1', [{ handle: 'w1', similarity: 88, why: 'Both of you post about burns', traits: [] }]);
    expect(first.status).toBe('paired');
    const again = await claim('s1', [{ handle: 'w1', similarity: 1, why: 'nope', traits: [] }]);
    expect(again).toMatchObject({ status: 'paired', pair_id: first.pair_id, existing: true });
    const outsider = await claim('s2', [{ handle: 'w1', similarity: 99, why: 'Both of you post about burns', traits: [] }]);
    expect(outsider.status).toBe('waiting');
    const twin = await claim('w1', [{ handle: 's2', similarity: 99, why: 'nope', traits: [] }]);
    expect(twin.pair_id).toBe(first.pair_id);
    const pairs = await pool.query<{ n: number }>('select count(*)::int as n from public.pairs');
    expect(pairs.rows[0]!.n).toBe(1);
    await expectNoDoublePairs();
  });

  it('does not create two pairs when two members claim each other together', async () => {
    await seedWaiting('a1');
    await seedWaiting('b1');
    await Promise.all([
      claim('a1', [{ handle: 'b1', similarity: 77, why: 'Both of you post about burns', traits: [] }]),
      claim('b1', [{ handle: 'a1', similarity: 77, why: 'Both of you post about burns', traits: [] }]),
    ]);
    const pairs = await pool.query<{ n: number; handle_a: string; handle_b: string }>(
      'select handle_a, handle_b, count(*) over ()::int as n from public.pairs',
    );
    expect(pairs.rowCount ?? 0).toBeLessThanOrEqual(1);
    if ((pairs.rowCount ?? 0) === 1) {
      const row = pairs.rows[0]!;
      expect([row.handle_a, row.handle_b].sort()).toEqual(['a1', 'b1']);
    }
    await expectNoDoublePairs();
  });
});
