import { planter } from '@/shared/api/planterClient';

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

interface ResolvedHandle {
    handle: string;
    user_id: string | null;
}

/**
 * Resolve @-handles to auth.users ids via the `resolve_user_handles` RPC
 * (SECURITY DEFINER, added in Wave 30 Task 3). The dispatch trigger
 * `trg_enqueue_comment_mentions` coerces `mentions[]` to uuid — unmatched
 * handles that fall through are silently dropped at cast time.
 *
 * Failure mode: if the RPC errors for any reason (offline, transient DB
 * issue, schema drift), pass the original handles through verbatim. This
 * keeps the composer write path non-throwing and preserves the Wave 26
 * test contract for `useTaskComments` — the trigger's bad-cast fallthrough
 * absorbs the pass-through payload without raising.
 */
export async function resolveMentions(handles: string[]): Promise<string[]> {
    if (handles.length === 0) return [];
    const { data, error } = await planter.rpc<ResolvedHandle[], { p_handles: string[] }>(
        'resolve_user_handles',
        { p_handles: handles },
    );
    if (error || !data) return handles;
    const ids = data
        .map((r) => r.user_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0);
    return ids;
}
