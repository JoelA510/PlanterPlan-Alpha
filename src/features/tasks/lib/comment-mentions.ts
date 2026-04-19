/**
 * Extract @-mentions from a comment body.
 *
 * Wave 26 stores raw handles (the literal text after '@'); Wave 30 resolves
 * each handle to an auth.users row id and writes the uuid array. The two-step
 * design lets the comment composer ship before the notification stack exists.
 *
 * @param body Raw comment text.
 * @returns Unique handles, lowercased, trimmed of trailing punctuation, in
 *   first-occurrence order.
 */
export function extractMentions(body: string): string[] {
    const matches = body.matchAll(/@([a-zA-Z0-9_.-]+)/g);
    const handles: string[] = [];
    const seen = new Set<string>();
    for (const m of matches) {
        const h = m[1].replace(/[._-]+$/, '').toLowerCase();
        if (h.length === 0) continue;
        if (seen.has(h)) continue;
        seen.add(h);
        handles.push(h);
    }
    return handles;
}
