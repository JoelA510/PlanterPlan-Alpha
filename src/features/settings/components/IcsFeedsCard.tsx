import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { planter } from '@/shared/api/planterClient';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { formatDisplayDate } from '@/shared/lib/date-engine';
import type { IcsFeedTokenRow } from '@/shared/db/app.types';
import { Copy, Trash2, Plus, RotateCw } from 'lucide-react';
import { useConfirm } from '@/shared/ui/confirm-dialog';

/**
 * Wave 35 Task 1 — Settings → Integrations → Calendar feeds.
 *
 * Lists the caller's ICS tokens (active + revoked), exposes "Generate new
 * feed" + per-row Copy-URL + Revoke controls. Revocation is soft so the row
 * stays visible for audit; a revoked row's URL is disabled.
 *
 * The feed URL includes the Supabase project URL + the ICS edge function path
 * + the opaque token. The token is the credential; no additional auth is
 * required at fetch time.
 */
export default function IcsFeedsCard() {
    const queryClient = useQueryClient();
    const confirm = useConfirm();
    const tokens = useQuery<IcsFeedTokenRow[]>({
        queryKey: ['icsFeedTokens'],
        queryFn: () => planter.integrations.listIcsFeedTokens(),
    });

    const [label, setLabel] = useState('');
    const [rotatingId, setRotatingId] = useState<string | null>(null);

    const createMutation = useMutation({
        mutationFn: (input: { label: string | null }) =>
            planter.integrations.createIcsFeedToken({ label: input.label, project_filter: null }),
        onSuccess: () => {
            toast.success('ICS feed created.');
            setLabel('');
            void queryClient.invalidateQueries({ queryKey: ['icsFeedTokens'] });
        },
        onError: (err: unknown) => toast.error((err as Error).message || 'Failed to create feed.'),
    });

    const revokeMutation = useMutation({
        mutationFn: (id: string) => planter.integrations.revokeIcsFeedToken(id),
        onSuccess: () => {
            toast.success('ICS feed revoked.');
            void queryClient.invalidateQueries({ queryKey: ['icsFeedTokens'] });
        },
        onError: (err: unknown) => toast.error((err as Error).message || 'Failed to revoke.'),
    });

    /**
     * Atomic rotate: revoke the old token, create a new one with the same
     * label, copy the new URL to the clipboard. The UX audit flagged the
     * manual revoke → create → re-label → copy dance as error-prone when
     * a user fears token exposure. This collapses it into one click.
     */
    const handleRotate = async (feed: IcsFeedTokenRow) => {
        const ok = await confirm({
            title: 'Rotate feed token?',
            description:
                'This revokes the current token and generates a new one with the same label. You will need to re-paste the new URL into any calendar client that subscribes to this feed.',
            confirmText: 'Rotate',
        });
        if (!ok) return;
        setRotatingId(feed.id);
        try {
            // Order matters: revoke old first, then create new. If creation
            // fails, the user is left with one revoked feed rather than two
            // active ones (safer default).
            await planter.integrations.revokeIcsFeedToken(feed.id);
            const created = await planter.integrations.createIcsFeedToken({
                label: feed.label ?? null,
                project_filter: feed.project_filter ?? null,
            });
            await queryClient.invalidateQueries({ queryKey: ['icsFeedTokens'] });
            const url = feedUrlFor(created.token);
            if (url) {
                try {
                    await navigator.clipboard.writeText(url);
                    toast.success('Token rotated. New feed URL copied to clipboard.');
                } catch {
                    toast.success('Token rotated. New feed URL is in the list below.');
                }
            } else {
                toast.success('Token rotated. New feed URL is in the list below.');
            }
        } catch (err) {
            toast.error('Failed to rotate token', { description: (err as Error)?.message });
        } finally {
            setRotatingId(null);
        }
    };

    const supabaseUrl = useMemo(() => import.meta.env.VITE_SUPABASE_URL ?? '', []);
    const feedUrlFor = (token: string) =>
        supabaseUrl ? `${supabaseUrl.replace(/\/$/, '')}/functions/v1/ics-feed?token=${encodeURIComponent(token)}` : '';

    const handleCopy = async (token: string) => {
        const url = feedUrlFor(token);
        if (!url) {
            toast.error('Missing Supabase URL.');
            return;
        }
        try {
            await navigator.clipboard.writeText(url);
            toast.success('Feed URL copied.');
        } catch {
            toast.error('Could not copy to clipboard.');
        }
    };

    return (
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm" data-testid="ics-feeds-card">
            <header className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Calendar feeds (ICS)</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Subscribe to your assigned tasks in Google Calendar, Outlook, or Apple Calendar.
                    Anyone with the feed URL can read your upcoming tasks — revoke if exposed.
                </p>
            </header>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    createMutation.mutate({ label: label.trim() || null });
                }}
                className="mb-6 flex items-end gap-3"
                data-testid="ics-feeds-create-form"
            >
                <div className="flex-1">
                    <label className="block text-xs font-medium text-muted-foreground" htmlFor="ics-feed-label">
                        Label (optional)
                    </label>
                    <Input
                        id="ics-feed-label"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder="e.g. Work calendar"
                        className="mt-1"
                        data-testid="ics-feeds-label-input"
                    />
                </div>
                <Button type="submit" disabled={createMutation.isPending} data-testid="ics-feeds-create-btn">
                    <Plus className="mr-2 h-4 w-4" />
                    {createMutation.isPending ? 'Creating…' : 'Generate feed'}
                </Button>
            </form>

            {tokens.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading feeds…</p>
            ) : tokens.error instanceof Error ? (
                <p className="text-sm text-red-600">{tokens.error.message}</p>
            ) : (tokens.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No feeds yet. Generate one above.</p>
            ) : (
                <ul className="divide-y divide-border" data-testid="ics-feeds-list">
                    {(tokens.data ?? []).map((feed) => {
                        const isRevoked = feed.revoked_at !== null;
                        return (
                            <li key={feed.id} className="flex items-center justify-between gap-4 py-3" data-testid={`ics-feed-row-${feed.id}`}>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-slate-900">
                                        {feed.label ?? <span className="text-muted-foreground">(unlabeled)</span>}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        Created {formatDisplayDate(feed.created_at)}
                                        {feed.last_accessed_at ? ` · Last accessed ${formatDisplayDate(feed.last_accessed_at)}` : ''}
                                        {isRevoked ? ' · Revoked' : ''}
                                    </p>
                                </div>
                                <div className="flex flex-shrink-0 gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => handleCopy(feed.token)}
                                        disabled={isRevoked}
                                        data-testid={`ics-feed-copy-${feed.id}`}
                                    >
                                        <Copy className="mr-1 h-3 w-3" />
                                        Copy URL
                                    </Button>
                                    {!isRevoked && (
                                        <>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleRotate(feed)}
                                                disabled={rotatingId === feed.id}
                                                data-testid={`ics-feed-rotate-${feed.id}`}
                                                aria-label={`Rotate ${feed.label ?? 'feed'} token`}
                                            >
                                                <RotateCw aria-hidden="true" className={`mr-1 h-3 w-3 ${rotatingId === feed.id ? 'animate-spin' : ''}`} />
                                                Rotate
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => revokeMutation.mutate(feed.id)}
                                                disabled={revokeMutation.isPending}
                                                data-testid={`ics-feed-revoke-${feed.id}`}
                                            >
                                                <Trash2 aria-hidden="true" className="mr-1 h-3 w-3" />
                                                Revoke
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
