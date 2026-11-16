export const SUPABASE_CONFIG_MESSAGE =
  'The twin pool is not connected. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then try again.';

export class SupabaseConfigError extends Error {
  readonly code = 'config' as const;

  constructor() {
    super(SUPABASE_CONFIG_MESSAGE);
    this.name = 'SupabaseConfigError';
  }
}

export function isSupabaseConfigError(error: unknown): error is SupabaseConfigError {
  return error instanceof SupabaseConfigError || (error instanceof Error && error.name === 'SupabaseConfigError');
}
