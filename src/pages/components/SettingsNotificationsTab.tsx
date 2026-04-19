import { useMemo } from 'react';
import { Label } from '@/shared/ui/label';
import { Switch } from '@/shared/ui/switch';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/ui/select';
import {
    useNotificationPreferences,
    useUpdateNotificationPreferences,
    useNotificationLog,
} from '@/features/settings/hooks/useNotificationPreferences';
import type { NotificationPreferencesRow } from '@/shared/db/app.types';

const COMMON_TIMEZONES = [
    'UTC',
    'America/Los_Angeles',
    'America/Denver',
    'America/Chicago',
    'America/New_York',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Australia/Sydney',
];

/** Prefer the browser's full tz list when available (Chrome/Firefox); fall back to our curated list. */
function useTimezoneOptions(): string[] {
    return useMemo(() => {
        type IntlWithTz = typeof Intl & { supportedValuesOf?: (key: 'timeZone') => string[] };
        const intl = Intl as IntlWithTz;
        const runtime = typeof intl.supportedValuesOf === 'function' ? intl.supportedValuesOf('timeZone') : null;
        return runtime && runtime.length > 0 ? runtime : COMMON_TIMEZONES;
    }, []);
}

export default function SettingsNotificationsTab() {
    const { data: prefs, isLoading, isError } = useNotificationPreferences();
    const updateMutation = useUpdateNotificationPreferences();
    const logQuery = useNotificationLog({ limit: 20 });
    const timezoneOptions = useTimezoneOptions();

    // Placeholder for Task 2: browser push isn't wired yet, so the three push
    // toggles below are disabled with a tooltip until the subscription hook lands.
    const pushSubscribed = false;

    if (isLoading || !prefs) {
        return (
            <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-sm" data-testid="notif-loading">
                Loading preferences…
            </div>
        );
    }
    if (isError) {
        return (
            <div className="rounded-xl border border-border bg-card p-6 text-sm text-red-600 shadow-sm">
                Could not load notification preferences.
            </div>
        );
    }

    const patch = (p: Partial<NotificationPreferencesRow>) => updateMutation.mutate(p);

    return (
        <div className="space-y-6" data-testid="settings-notifications">
            <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                <h2 className="text-xl font-bold text-slate-900">Email</h2>
                <p className="text-sm text-slate-500 mt-1">Control which events produce an email.</p>

                <div className="mt-6 flex items-center justify-between gap-4">
                    <div>
                        <Label htmlFor="email-mentions" className="text-sm font-medium">Mentions</Label>
                        <p className="text-xs text-slate-500">Email me when someone `@`-mentions me in a task comment.</p>
                    </div>
                    <Switch
                        id="email-mentions"
                        checked={prefs.email_mentions}
                        onCheckedChange={(v) => patch({ email_mentions: v })}
                    />
                </div>

                <div className="mt-4 flex items-center justify-between gap-4">
                    <div>
                        <Label htmlFor="email-overdue-digest" className="text-sm font-medium">Overdue digest</Label>
                        <p className="text-xs text-slate-500">Scheduled summary of tasks past due.</p>
                    </div>
                    <Select
                        value={prefs.email_overdue_digest}
                        onValueChange={(v) => patch({ email_overdue_digest: v as 'off' | 'daily' | 'weekly' })}
                    >
                        <SelectTrigger id="email-overdue-digest" className="w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="off">Off</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="mt-4 flex items-center justify-between gap-4">
                    <div>
                        <Label htmlFor="email-assignment" className="text-sm font-medium">Task assignment</Label>
                        <p className="text-xs text-slate-500">Email me when a task is assigned to me.</p>
                    </div>
                    <Switch
                        id="email-assignment"
                        checked={prefs.email_assignment}
                        onCheckedChange={(v) => patch({ email_assignment: v })}
                    />
                </div>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Push</h2>
                        <p className="text-sm text-slate-500 mt-1">Browser push notifications via the service worker.</p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        disabled
                        title="Browser push subscription wiring ships in Wave 30 Task 2"
                        data-testid="enable-browser-push"
                    >
                        Enable browser push
                    </Button>
                </div>

                <div className="mt-6 space-y-4">
                    <ToggleRow
                        id="push-mentions"
                        label="Mentions"
                        description="Push me when someone `@`-mentions me."
                        checked={prefs.push_mentions}
                        disabled={!pushSubscribed}
                        disabledTooltip="Enable browser push first."
                        onChange={(v) => patch({ push_mentions: v })}
                    />
                    <ToggleRow
                        id="push-overdue"
                        label="Overdue digest"
                        description="Push me the daily overdue summary."
                        checked={prefs.push_overdue}
                        disabled={!pushSubscribed}
                        disabledTooltip="Enable browser push first."
                        onChange={(v) => patch({ push_overdue: v })}
                    />
                    <ToggleRow
                        id="push-assignment"
                        label="Task assignment"
                        description="Push me when a task is assigned to me."
                        checked={prefs.push_assignment}
                        disabled={!pushSubscribed}
                        disabledTooltip="Enable browser push first."
                        onChange={(v) => patch({ push_assignment: v })}
                    />
                </div>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                <h2 className="text-xl font-bold text-slate-900">Quiet hours</h2>
                <p className="text-sm text-slate-500 mt-1">Dispatchers skip sends when local-now is within this window.</p>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                        <Label htmlFor="quiet-start" className="text-sm font-medium">Start</Label>
                        <Input
                            id="quiet-start"
                            type="time"
                            value={prefs.quiet_hours_start ?? ''}
                            onChange={(e) => patch({ quiet_hours_start: e.target.value || null })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="quiet-end" className="text-sm font-medium">End</Label>
                        <Input
                            id="quiet-end"
                            type="time"
                            value={prefs.quiet_hours_end ?? ''}
                            onChange={(e) => patch({ quiet_hours_end: e.target.value || null })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="timezone" className="text-sm font-medium">Timezone</Label>
                        <Select
                            value={prefs.timezone}
                            onValueChange={(v) => patch({ timezone: v })}
                        >
                            <SelectTrigger id="timezone">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                                {timezoneOptions.map((tz) => (
                                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <details className="bg-card rounded-xl border border-border shadow-sm p-6">
                <summary className="cursor-pointer text-sm font-medium text-slate-700">
                    Recent notifications ({logQuery.data?.length ?? 0})
                </summary>
                <div className="mt-4 space-y-2" data-testid="notif-log">
                    {logQuery.isLoading ? (
                        <p className="text-xs text-slate-500">Loading recent sends…</p>
                    ) : (logQuery.data?.length ?? 0) === 0 ? (
                        <p className="text-xs text-slate-500">No notifications have been sent yet.</p>
                    ) : (
                        (logQuery.data ?? []).map((row) => (
                            <div key={row.id} className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 text-xs last:border-0">
                                <div>
                                    <p className="font-medium text-slate-700">{row.event_type}</p>
                                    <p className="text-slate-500">{row.channel} · {row.sent_at}</p>
                                </div>
                                {row.error ? (
                                    <span className="text-red-600">error</span>
                                ) : (
                                    <span className="text-emerald-700">sent</span>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </details>
        </div>
    );
}

interface ToggleRowProps {
    id: string;
    label: string;
    description: string;
    checked: boolean;
    disabled?: boolean;
    disabledTooltip?: string;
    onChange: (value: boolean) => void;
}

function ToggleRow({ id, label, description, checked, disabled, disabledTooltip, onChange }: ToggleRowProps) {
    return (
        <div
            className="flex items-center justify-between gap-4"
            title={disabled ? disabledTooltip : undefined}
        >
            <div>
                <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
                <p className="text-xs text-slate-500">{description}</p>
            </div>
            <Switch
                id={id}
                checked={checked}
                disabled={disabled}
                onCheckedChange={onChange}
            />
        </div>
    );
}
