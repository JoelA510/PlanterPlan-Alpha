/**
 * Wave-follow-up security helper — resource URL sanitization.
 *
 * Blocks stored-XSS via `javascript:` / `data:` / `vbscript:` schemes on
 * user-supplied `task_resources.resource_url` values. React escapes element
 * text but an anchor's `href` attribute is passed through verbatim; a click
 * on `<a href="javascript:alert(document.cookie)">` runs attacker JS in the
 * viewer's origin with session-cookie access. The `type="url"` input
 * validates at form submit time but can be bypassed by anyone with a
 * PostgREST client (e.g., `planter.entities.TaskResource.create(...)`),
 * so we sanitize at render time too.
 *
 * Returns a safe href string when the scheme is one of the allowed values,
 * or `'#'` for anything else (including malformed inputs, relative paths
 * that resolve to a disallowed scheme, etc.). Never throws.
 *
 * @param url Candidate URL string. Accepts `null`/`undefined`.
 * @returns A safe href string. `'#'` when the input is unsafe or invalid.
 */
export function safeUrl(url: string | null | undefined): string {
    if (typeof url !== 'string' || url.trim() === '') return '#';
    try {
        const parsed = new URL(url, window.location.origin);
        const allowed = new Set(['http:', 'https:', 'mailto:', 'tel:']);
        if (!allowed.has(parsed.protocol)) return '#';
        return parsed.toString();
    } catch {
        return '#';
    }
}
