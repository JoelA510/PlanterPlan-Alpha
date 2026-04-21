import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/shared/ui/label';
import { Switch } from '@/shared/ui/switch';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { formatDate } from '@/shared/lib/date-engine';
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
import { usePushSubscription } from '@/features/settings/hooks/usePushSubscription';
import type { NotificationPreferencesRow } from '@/shared/db/app.types';

/** Turns `mention_pending` into `Mention Pending` for user-facing display. */
function humanizeEventType(eventType: string): string {
    return eventType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

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
    const { t } = useTranslation();
    const { data: prefs, isLoading, isError } = useNotificationPreferences();
    const updateMutation = useUpdateNotificationPreferences();
    const logQuery = useNotificationLog({ limit: 20 });
    const timezoneOptions = useTimezoneOptions();

    // Wave 30 Task 2: real browser push subscription state. When the browser
    // lacks the APIs (Safari without PWA install, server render), `isSupported`
    // is false and the Enable button is disabled with an explanatory tooltip.
    const push = usePushSubscription();
    const pushSubscribed = Boolean(push.subscription);

    if (isLoading || !prefs) {
        return (
            <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-sm" data-testid="notif-loading">
                {t('notifications.loading_preferences')}
            </div>
        );
    }
    if (isError) {
        return (
            <div className="rounded-xl border border-border bg-card p-6 text-sm text-red-600 shadow-sm">
                {t('notifications.could_not_load_preferences')}
            </div>
        );
    }

    const patch = (p: Partial<NotificationPreferencesRow>) => updateMutation.mutate(p);

    return (
        <div className="space-y-6" data-testid="settings-notifications">
            <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                <h2 className="text-xl font-bold text-slate-900">{t('notifications.email.title')}</h2>
                <p className="text-sm text-slate-600 mt-1">{t('notifications.email.description')}</p>

                <div className="mt-6 flex items-center justify-between gap-4">
                    <div>
                        <Label htmlFor="email-mentions" className="text-sm font-medium">{t('notifications.email.mentions_label')}</Label>
                        <p className="text-xs text-slate-600">{t('notifications.email.mentions_description')}</p>
                    </div>
                    <Switch
                        id="email-mentions"
                        checked={prefs.email_mentions}
                        onCheckedChange={(v) => patch({ email_mentions: v })}
                    />
                </div>

                <div className="mt-4 flex items-center justify-between gap-4">
                    <div>
                        <Label htmlFor="email-overdue-digest" className="text-sm font-medium">{t('notifications.email.overdue_digest_label')}</Label>
                        <p className="text-xs text-slate-600">{t('notifications.email.overdue_digest_description')}</p>
                    </div>
                    <Select
                        value={prefs.email_overdue_digest}
                        onValueChange={(v) => patch({ email_overdue_digest: v as 'off' | 'daily' | 'weekly' })}
                    >
                        <SelectTrigger id="email-overdue-digest" className="w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="off">{t('common.off')}</SelectItem>
                            <SelectItem value="daily">{t('common.daily')}</SelectItem>
                            <SelectItem value="weekly">{t('common.weekly')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="mt-4 flex items-center justify-between gap-4">
                    <div>
                        <Label htmlFor="email-assignment" className="text-sm font-medium">{t('notifications.email.assignment_label')}</Label>
                        <p className="text-xs text-slate-600">{t('notifications.email.assignment_description')}</p>
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
                        <h2 className="text-xl font-bold text-slate-900">{t('notifications.push.title')}</h2>
                        <p className="text-sm text-slate-600 mt-1">{t('notifications.push.description')}</p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            if (pushSubscribed) void push.unsubscribe();
                            else void push.subscribe();
                        }}
                        disabled={!push.isSupported || push.isSubscribing}
                        title={push.isSupported
                            ? (push.permissionState === 'denied'
                                ? t('notifications.push.blocked')
                                : undefined)
                            : t('notifications.push.not_supported')}
                        data-testid="enable-browser-push"
                    >
                        {push.isSubscribing
                            ? t('common.working')
                            : pushSubscribed
                                ? t('notifications.push.disable')
                                : t('notifications.push.enable')}
                    </Button>
                </div>

                <div className="mt-6 space-y-4">
                    <ToggleRow
                        id="push-mentions"
                        label={t('notifications.push.mentions_label')}
                        description={t('notifications.push.mentions_description')}
                        checked={prefs.push_mentions}
                        disabled={!pushSubscribed}
                        disabledTooltip={t('notifications.push.requires_enable_tooltip')}
                        onChange={(v) => patch({ push_mentions: v })}
                    />
                    <ToggleRow
                        id="push-overdue"
                        label={t('notifications.push.overdue_label')}
                        description={t('notifications.push.overdue_description')}
                        checked={prefs.push_overdue}
                        disabled={!pushSubscribed}
                        disabledTooltip={t('notifications.push.requires_enable_tooltip')}
                        onChange={(v) => patch({ push_overdue: v })}
                    />
                    <ToggleRow
                        id="push-assignment"
                        label={t('notifications.push.assignment_label')}
                        description={t('notifications.push.assignment_description')}
                        checked={prefs.push_assignment}
                        disabled={!pushSubscribed}
                        disabledTooltip={t('notifications.push.requires_enable_tooltip')}
                        onChange={(v) => patch({ push_assignment: v })}
                    />
                </div>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                <h2 className="text-xl font-bold text-slate-900">{t('notifications.quiet_hours.title')}</h2>
                <p className="text-sm text-slate-600 mt-1">{t('notifications.quiet_hours.description')}</p>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                        <Label htmlFor="quiet-start" className="text-sm font-medium">{t('notifications.quiet_hours.start_label')}</Label>
                        <Input
                            id="quiet-start"
                            type="time"
                            value={prefs.quiet_hours_start ?? ''}
                            onChange={(e) => patch({ quiet_hours_start: e.target.value || null })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="quiet-end" className="text-sm font-medium">{t('notifications.quiet_hours.end_label')}</Label>
                        <Input
                            id="quiet-end"
                            type="time"
                            value={prefs.quiet_hours_end ?? ''}
                            onChange={(e) => patch({ quiet_hours_end: e.target.value || null })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="timezone" className="text-sm font-medium">{t('notifications.quiet_hours.timezone_label')}</Label>
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
                    {t('notifications.recent.title_with_count', { count: logQuery.data?.length ?? 0 })}
                </summary>
                <div className="mt-4 space-y-2" data-testid="notif-log">
                    {logQuery.isLoading ? (
                        <p className="text-xs text-slate-600">{t('notifications.recent.loading')}</p>
                    ) : (logQuery.data?.length ?? 0) === 0 ? (
                        <p className="text-xs text-slate-600">{t('notifications.recent.none')}</p>
                    ) : (
                        (logQuery.data ?? []).map((row) => (
                            <div key={row.id} className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 text-xs last:border-0">
                                <div>
                                    <p className="font-medium text-slate-700">{humanizeEventType(row.event_type)}</p>
                                    <p className="text-slate-600">{row.channel} · {formatDate(row.sent_at, 'PPp')}</p>
                                </div>
                                {row.error ? (
                                    <span className="text-red-600">{t('notifications.recent.status_error')}</span>
                                ) : (
                                    <span className="text-emerald-700">{t('notifications.recent.status_sent')}</span>
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
                <p className="text-xs text-slate-600">{description}</p>
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
