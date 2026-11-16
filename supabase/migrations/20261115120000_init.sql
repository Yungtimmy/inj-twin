-- INJ Twin v1
-- Pairs are mutual and permanent. paired_handles.handle is unique, so a handle
-- can appear in at most one pair. claim_twin is the only writer that creates
-- pairs: one transaction, the searcher locked FOR UPDATE, the candidate locked
-- FOR UPDATE SKIP LOCKED.

create extension if not exists pgcrypto;

create table public.members (
  handle text primary key,
  display_name text not null default '',
  avatar_url text,
  post_count integer not null default 0,
  type_vector double precision[] not null,
  hour_vector double precision[] not null,
  term_counts jsonb not null,
  term_posts jsonb not null,
  term_labels jsonb not null default '{}'::jsonb,
  posts jsonb not null default '[]'::jsonb,
  status text not null default 'waiting',
  pair_id uuid,
  demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint members_handle_format check (handle ~ '^[a-z0-9_]{1,15}$'),
  constraint members_status check (status in ('waiting', 'paired')),
  constraint members_pair_status check (
    (status = 'waiting' and pair_id is null)
    or (status = 'paired' and pair_id is not null)
  ),
  constraint members_vectors check (
    cardinality(type_vector) = 3 and cardinality(hour_vector) = 24
  )
);

create table public.pairs (
  id uuid primary key default gen_random_uuid(),
  handle_a text not null references public.members (handle),
  handle_b text not null references public.members (handle),
  similarity integer not null,
  traits jsonb not null,
  why text not null,
  created_at timestamptz not null default now(),
  constraint pairs_order check (handle_a < handle_b),
  constraint pairs_distinct check (handle_a <> handle_b),
  constraint pairs_similarity check (similarity between 0 and 100),
  unique (handle_a),
  unique (handle_b)
);

alter table public.members
  add constraint members_pair_fk foreign key (pair_id) references public.pairs (id);

-- The uniqueness guarantee: each handle at most once among paired members.
create table public.paired_handles (
  handle text primary key references public.members (handle),
  pair_id uuid not null references public.pairs (id),
  created_at timestamptz not null default now()
);

create table public.x_reads (
  handle text primary key,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  constraint x_reads_handle_format check (handle ~ '^[a-z0-9_]{1,15}$')
);

create index members_waiting_idx on public.members (handle) where status = 'waiting';

comment on table public.paired_handles is
  'Each handle appears at most once among paired members.';

alter table public.members enable row level security;
alter table public.pairs enable row level security;
alter table public.paired_handles enable row level security;
alter table public.x_reads enable row level security;

-- No policies. anon and authenticated cannot read or write.
-- The service role bypasses RLS. claim_twin runs as its owner.

revoke all on table public.members from public;
revoke all on table public.pairs from public;
revoke all on table public.paired_handles from public;
revoke all on table public.x_reads from public;

create or replace function public.claim_twin(
  p_handle text,
  p_display_name text,
  p_avatar_url text,
  p_post_count integer,
  p_type_vector double precision[],
  p_hour_vector double precision[],
  p_term_counts jsonb,
  p_term_posts jsonb,
  p_term_labels jsonb,
  p_posts jsonb,
  p_demo boolean,
  p_candidates jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_self public.members%rowtype;
  v_other public.members%rowtype;
  v_existing public.pairs%rowtype;
  v_row record;
  v_cand jsonb;
  v_pair_id uuid;
  v_a text;
  v_b text;
begin
  if p_handle is null or p_handle !~ '^[a-z0-9_]{1,15}$' then
    raise exception 'invalid handle';
  end if;

  if cardinality(p_type_vector) <> 3 or cardinality(p_hour_vector) <> 24 then
    raise exception 'invalid profile vectors';
  end if;

  insert into public.members (
    handle, display_name, avatar_url, post_count, type_vector, hour_vector,
    term_counts, term_posts, term_labels, posts, status, demo
  ) values (
    p_handle,
    coalesce(p_display_name, ''),
    p_avatar_url,
    greatest(p_post_count, 0),
    p_type_vector,
    p_hour_vector,
    coalesce(p_term_counts, '{}'::jsonb),
    coalesce(p_term_posts, '{}'::jsonb),
    coalesce(p_term_labels, '{}'::jsonb),
    coalesce(p_posts, '[]'::jsonb),
    'waiting',
    coalesce(p_demo, false)
  )
  on conflict (handle) do nothing;

  select * into v_self
  from public.members
  where handle = p_handle
  for update;

  if not found then
    raise exception 'member missing after insert';
  end if;

  if v_self.status = 'paired' and v_self.pair_id is not null then
    select * into v_existing from public.pairs where id = v_self.pair_id;
    return jsonb_build_object(
      'status', 'paired',
      'pair_id', v_existing.id,
      'handle_a', v_existing.handle_a,
      'handle_b', v_existing.handle_b,
      'similarity', v_existing.similarity,
      'traits', v_existing.traits,
      'why', v_existing.why,
      'existing', true
    );
  end if;

  update public.members set
    display_name = coalesce(p_display_name, ''),
    avatar_url = p_avatar_url,
    post_count = greatest(p_post_count, 0),
    type_vector = p_type_vector,
    hour_vector = p_hour_vector,
    term_counts = coalesce(p_term_counts, '{}'::jsonb),
    term_posts = coalesce(p_term_posts, '{}'::jsonb),
    term_labels = coalesce(p_term_labels, '{}'::jsonb),
    posts = coalesce(p_posts, '[]'::jsonb),
    demo = coalesce(p_demo, false),
    updated_at = now()
  where handle = p_handle;

  for v_row in
    select value as cand
    from jsonb_array_elements(coalesce(p_candidates, '[]'::jsonb))
  loop
    v_cand := v_row.cand;
    if coalesce(v_cand->>'handle', '') = p_handle then
      continue;
    end if;
    if coalesce(v_cand->>'handle', '') !~ '^[a-z0-9_]{1,15}$' then
      continue;
    end if;
    if coalesce(v_cand->>'similarity', '') !~ '^[0-9]+$' then
      continue;
    end if;

    v_other := null;
    select * into v_other
    from public.members
    where handle = v_cand->>'handle'
      and status = 'waiting'
      and handle <> p_handle
    for update skip locked;

    if not found then
      continue;
    end if;

    if p_handle < v_other.handle then
      v_a := p_handle;
      v_b := v_other.handle;
    else
      v_a := v_other.handle;
      v_b := p_handle;
    end if;

    begin
      v_pair_id := gen_random_uuid();

      insert into public.pairs (id, handle_a, handle_b, similarity, traits, why)
      values (
        v_pair_id,
        v_a,
        v_b,
        least(100, greatest(0, (v_cand->>'similarity')::integer)),
        coalesce(v_cand->'traits', '[]'::jsonb),
        coalesce(v_cand->>'why', '')
      );

      insert into public.paired_handles (handle, pair_id)
      values (v_a, v_pair_id), (v_b, v_pair_id);

      update public.members
      set status = 'paired', pair_id = v_pair_id, updated_at = now()
      where handle in (p_handle, v_other.handle);

      return jsonb_build_object(
        'status', 'paired',
        'pair_id', v_pair_id,
        'handle_a', v_a,
        'handle_b', v_b,
        'similarity', least(100, greatest(0, (v_cand->>'similarity')::integer)),
        'traits', coalesce(v_cand->'traits', '[]'::jsonb),
        'why', coalesce(v_cand->>'why', ''),
        'existing', false
      );
    exception
      when unique_violation then
        -- The row lock should make this unreachable. If it happens, try the next candidate.
        null;
    end;
  end loop;

  return jsonb_build_object('status', 'waiting', 'handle', p_handle);
end;
$fn$;

revoke all on function public.claim_twin(
  text, text, text, integer, double precision[], double precision[], jsonb, jsonb, jsonb, jsonb, boolean, jsonb
) from public;

do $grants$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on table public.members from anon;
    revoke all on table public.pairs from anon;
    revoke all on table public.paired_handles from anon;
    revoke all on table public.x_reads from anon;
    revoke all on function public.claim_twin(
      text, text, text, integer, double precision[], double precision[], jsonb, jsonb, jsonb, jsonb, boolean, jsonb
    ) from anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on table public.members from authenticated;
    revoke all on table public.pairs from authenticated;
    revoke all on table public.paired_handles from authenticated;
    revoke all on table public.x_reads from authenticated;
    revoke all on function public.claim_twin(
      text, text, text, integer, double precision[], double precision[], jsonb, jsonb, jsonb, jsonb, boolean, jsonb
    ) from authenticated;
  end if;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant usage on schema public to service_role;
    grant select, insert, update, delete on table public.members to service_role;
    grant select, insert, update, delete on table public.pairs to service_role;
    grant select, insert, update, delete on table public.paired_handles to service_role;
    grant select, insert, update, delete on table public.x_reads to service_role;
    grant execute on function public.claim_twin(
      text, text, text, integer, double precision[], double precision[], jsonb, jsonb, jsonb, jsonb, boolean, jsonb
    ) to service_role;
  end if;
end;
$grants$;
