const SAVED_EMAIL_CAP = 5;

/** Pure helper: prepend `address` (case-insensitive de-dupe), cap at 5. */
export function mergeSavedEmailAddress(existing: string[], address: string): string[] {
  const trimmed = address.trim();
  if (!trimmed) return existing;
  const lower = trimmed.toLowerCase();
  const filtered = existing.filter((e) => typeof e === 'string' && e.toLowerCase() !== lower);
  return [trimmed, ...filtered].slice(0, SAVED_EMAIL_CAP);
}
