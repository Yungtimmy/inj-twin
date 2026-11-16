const HANDLE = /^[a-z0-9_]{1,15}$/;

/** Strip a leading @ and lowercase. Returns null when the handle is not a public X handle. */
export function normalizeHandle(input: string): string | null {
  const stripped = input.trim().replace(/^@+/, '').trim().toLowerCase();
  if (!HANDLE.test(stripped)) return null;
  return stripped;
}

/** Two-letter mark used on the twin card. example_ada → EA. */
export function initials(handle: string): string {
  const parts = handle.split(/_+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return handle.slice(0, 2).toUpperCase();
}
