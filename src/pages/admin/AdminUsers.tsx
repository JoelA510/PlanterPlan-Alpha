import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdminUsers, useAdminUserDetail } from '@/features/admin/hooks/useAdminUsers';
import { formatDisplayDate } from '@/shared/lib/date-engine';
import type { AdminListUsersFilter } from '@/shared/db/app.types';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/ui/select';

/**
 * Wave 34 Task 2 — admin user-management table. Server-side filter via the
 * `admin_list_users` RPC (see `useAdminUsers`). A client-side search input
 * ANDs with the server filter for snappier typing (the RPC also supports
 * `filter.search`; here we set both to keep debounce trivial).
 *
 * Columns: Email / Display Name / Role / Last Sign In / Active Projects /
 *          Completed 30d / Overdue.
 * Clicking a row populates the right-side detail panel via
 * `useAdminUserDetail`. The URL param `:uid` pre-selects a user (used by
 * AdminSearch's "click a user → navigate to this page" flow).
 */
const PAGE_SIZE = 50;

export default function AdminUsers() {
    const { t } = useTranslation();
    const { uid: uidParam } = useParams<{ uid: string }>();
    const [filter, setFilter] = useState<AdminListUsersFilter>({
        role: 'all',
        lastLogin: 'all',
        hasOverdue: false,
        search: '',
    });
    // Paginate via the RPC's existing limit/offset params — previously unused.
    const [page, setPage] = useState(0);
    const [selectedUid, setSelectedUid] = useState<string | null>(uidParam ?? null);
    const list = useAdminUsers(filter, { limit: PAGE_SIZE, offset: page * PAGE_SIZE });
    const detail = useAdminUserDetail(selectedUid);

    // Reset to page 0 on any filter change.
    const setFilterAndResetPage: typeof setFilter = (next) => {
        setPage(0);
        setFilter(next);
    };

    // Keep the selection in sync with the URL param (deep-linking from
    // AdminSearch → /admin/users/:uid).
    const effectiveSelectedUid = useMemo(() => selectedUid ?? uidParam ?? null, [selectedUid, uidParam]);

    return (
        <div className="p-8" data-testid="admin-users">
            <header className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('admin.users_title')}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{t('admin.users_subtitle')}</p>
            </header>

            <div className="mb-4 flex flex-wrap items-end gap-3" data-testid="admin-users-filters">
                <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">{t('admin.users_filter_role')}</span>
                    <Select
                        value={filter.role ?? 'all'}
                        onValueChange={(v) =>
                            setFilterAndResetPage((f) => ({ ...f, role: v as AdminListUsersFilter['role'] }))
                        }
                    >
                        <SelectTrigger
                            className="w-36 bg-card"
                            aria-label={t('admin.users_filter_role_aria')}
                            data-testid="admin-users-filter-role"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('admin.users_filter_all')}</SelectItem>
                            <SelectItem value="admin">{t('admin.users_filter_admin')}</SelectItem>
                            <SelectItem value="standard">{t('admin.users_filter_standard')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">{t('admin.users_filter_last_signin')}</span>
                    <Select
                        value={filter.lastLogin ?? 'all'}
                        onValueChange={(v) =>
                            setFilterAndResetPage((f) => ({ ...f, lastLogin: v as AdminListUsersFilter['lastLogin'] }))
                        }
                    >
                        <SelectTrigger
                            className="w-48 bg-card"
                            aria-label={t('admin.users_filter_last_signin_aria')}
                            data-testid="admin-users-filter-lastLogin"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('admin.users_filter_all')}</SelectItem>
                            <SelectItem value="last_7">{t('admin.users_filter_last_7')}</SelectItem>
                            <SelectItem value="last_30">{t('admin.users_filter_last_30')}</SelectItem>
                            <SelectItem value="inactive">{t('admin.users_filter_inactive')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={!!filter.hasOverdue}
                        onChange={(e) => setFilterAndResetPage((f) => ({ ...f, hasOverdue: e.target.checked }))}
                        data-testid="admin-users-filter-hasOverdue"
                    />
                    <span>{t('admin.users_filter_overdue')}</span>
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    {t('admin.users_filter_search')}
                    <input
                        type="search"
                        value={filter.search ?? ''}
                        onChange={(e) => setFilterAndResetPage((f) => ({ ...f, search: e.target.value }))}
                        placeholder={t('admin.users_filter_search_placeholder')}
                        className="h-9 rounded-md border border-input bg-card px-2 text-sm"
                        data-testid="admin-users-filter-search"
                    />
                </label>
            </div>

            <div className="flex gap-6">
                <div className="flex-1 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                    <div className="overflow-x-auto">
                    <table className="w-full text-sm" data-testid="admin-users-table">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted-foreground">
                            <tr>
                                <th scope="col" className="px-4 py-2 text-left font-semibold">{t('admin.users_col_email')}</th>
                                <th scope="col" className="px-4 py-2 text-left font-semibold">{t('admin.users_col_name')}</th>
                                <th scope="col" className="px-4 py-2 text-left font-semibold">{t('admin.users_col_role')}</th>
                                <th scope="col" className="px-4 py-2 text-left font-semibold">{t('admin.users_col_last_signin')}</th>
                                <th scope="col" className="px-4 py-2 text-right font-semibold">{t('admin.users_col_projects')}</th>
                                <th scope="col" className="px-4 py-2 text-right font-semibold">{t('admin.users_col_completed_30d')}</th>
                                <th scope="col" className="px-4 py-2 text-right font-semibold">{t('admin.users_col_overdue')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">{t('admin.loading')}</td>
                                </tr>
                            ) : list.error ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-6 text-center text-red-600">{list.error.message}</td>
                                </tr>
                            ) : (list.data ?? []).length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">{t('admin.users_no_match')}</td>
                                </tr>
                            ) : (
                                (list.data ?? []).map((u) => (
                                    <tr
                                        key={u.id}
                                        className={
                                            'cursor-pointer border-t border-border hover:bg-slate-50 ' +
                                            (effectiveSelectedUid === u.id ? 'bg-brand-50' : '')
                                        }
                                        onClick={() => setSelectedUid(u.id)}
                                        data-testid={`admin-users-row-${u.id}`}
                                    >
                                        <td className="px-4 py-2">{u.email}</td>
                                        <td className="px-4 py-2">{u.display_name}</td>
                                        <td className="px-4 py-2">
                                            <span
                                                className={
                                                    u.is_admin
                                                        ? 'inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700'
                                                        : 'inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700'
                                                }
                                            >
                                                {u.is_admin ? t('admin.users_role_admin') : t('admin.users_role_standard')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2">
                                            {u.last_sign_in_at ? formatDisplayDate(u.last_sign_in_at) : '—'}
                                        </td>
                                        <td className="px-4 py-2 text-right tabular-nums">{u.active_project_count}</td>
                                        <td className="px-4 py-2 text-right tabular-nums">{u.completed_tasks_30d}</td>
                                        <td className="px-4 py-2 text-right tabular-nums">{u.overdue_task_count}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    </div>

                    {/* Pagination controls. `admin_list_users` doesn't return a
                      * total count; we infer "has next page" from whether the
                      * current page is full (len === PAGE_SIZE). Not perfect
                      * on boundary cases — a page of exactly 50 rows shows an
                      * enabled Next that fetches an empty page — but cheaper
                      * than adding a separate count RPC and the user is
                      * immediately visually informed of the empty page. */}
                    <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2 text-sm">
                        <span className="text-muted-foreground" data-testid="admin-users-page-info">
                            {list.data && list.data.length > 0
                                ? t('admin.users_showing_range', { start: page * PAGE_SIZE + 1, end: page * PAGE_SIZE + list.data.length })
                                : t('admin.users_no_results')}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="rounded border border-border bg-card px-3 py-1 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => setPage((p) => Math.max(0, p - 1))}
                                disabled={page === 0 || list.isLoading}
                                aria-label={t('admin.users_prev_page')}
                                data-testid="admin-users-prev-page"
                            >
                                ← {t('common.back')}
                            </button>
                            <span className="tabular-nums text-muted-foreground">{t('admin.users_page_label', { page: page + 1 })}</span>
                            <button
                                type="button"
                                className="rounded border border-border bg-card px-3 py-1 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => setPage((p) => p + 1)}
                                disabled={list.isLoading || !list.data || list.data.length < PAGE_SIZE}
                                aria-label={t('admin.users_next_page')}
                                data-testid="admin-users-next-page"
                            >
                                {t('common.next')} →
                            </button>
                        </div>
                    </div>
                </div>

                {effectiveSelectedUid && (
                    <aside
                        className="w-80 flex-shrink-0 rounded-lg border border-border bg-card p-5 shadow-sm"
                        data-testid="admin-users-detail"
                    >
                        {detail.isLoading ? (
                            <p className="text-sm text-muted-foreground">{t('admin.users_detail_loading')}</p>
                        ) : detail.error ? (
                            <p className="text-sm text-red-600">{detail.error.message}</p>
                        ) : !detail.data ? (
                            <p className="text-sm text-muted-foreground">{t('admin.users_detail_not_found')}</p>
                        ) : (
                            <>
                                <h2 className="text-lg font-semibold text-slate-900">{detail.data.profile.display_name}</h2>
                                <p className="mt-1 text-xs text-muted-foreground">{detail.data.profile.email}</p>
                                <dl className="mt-4 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <dt className="text-muted-foreground">Role</dt>
                                        <dd>{detail.data.profile.is_admin ? 'admin' : 'standard'}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-muted-foreground">Projects</dt>
                                        <dd className="tabular-nums">{detail.data.projects.length}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-muted-foreground">Assigned tasks</dt>
                                        <dd className="tabular-nums">{detail.data.task_counts.assigned}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-muted-foreground">Completed (30d)</dt>
                                        <dd className="tabular-nums">{detail.data.task_counts.completed}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-muted-foreground">Overdue</dt>
                                        <dd className="tabular-nums">{detail.data.task_counts.overdue}</dd>
                                    </div>
                                </dl>
                                {detail.data.projects.length > 0 && (
                                    <section className="mt-5">
                                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            Project memberships
                                        </h3>
                                        <ul className="space-y-1 text-sm">
                                            {detail.data.projects.map((p) => (
                                                <li key={p.project_id} className="flex justify-between gap-3">
                                                    <span className="truncate">{p.project_title ?? p.project_id}</span>
                                                    <span className="text-muted-foreground">{p.role}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                )}
                            </>
                        )}
                    </aside>
                )}
            </div>
        </div>
    );
}
