import 'server-only';
import { getSupabase } from '@/lib/supabase';
import { getXSource } from '@/lib/x/source';
import type { PersonRecord, XPerson } from '@/lib/x/types';

const DAY_MS = 24 * 60 * 60 * 1000;

function isPerson(value: unknown): value is XPerson {
  if (!value || typeof value !== 'object') return false;
  const person = value as XPerson;
  return typeof person.handle === 'string' && Array.isArray(person.posts);
}

export async function loadPerson(handle: string): Promise<PersonRecord> {
  const supabase = getSupabase();
  const source = getXSource();
  const { data, error } = await supabase
    .from('x_reads')
    .select('payload, fetched_at')
    .eq('handle', handle)
    .maybeSingle();
  if (error) throw error;

  const payload = data?.payload as PersonRecord | undefined;
  if (data?.fetched_at && payload && isPerson(payload.person) && payload.demo === source.demo) {
    const age = Date.now() - new Date(data.fetched_at).getTime();
    if (age >= 0 && age < DAY_MS) return payload;
  }

  const person = await source.fetchUser(handle);
  const record: PersonRecord = { demo: source.demo, person };
  const { error: upsertError } = await supabase.from('x_reads').upsert({
    handle,
    payload: record,
    fetched_at: new Date().toISOString(),
  });
  if (upsertError) throw upsertError;
  return record;
}
