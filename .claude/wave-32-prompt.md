## Session Context

PlanterPlan is a church planting project management app (React 19 + TypeScript + Supabase + Vite). Read `CLAUDE.md` for conventions and architecture. Strict typing, FSD boundaries, no direct Supabase calls in components, no raw date math — all enforced. See `.gemini/styleguide.md`.

Wave 31 shipped to `main`:
- i18next framework + en baseline + es proof-of-pipeline
- Settings → Profile → LocaleSwitcher
- `formatDateLocalized` / `formatNumberLocalized` / `formatCurrencyLocalized` Intl wrappers

Spec is at **1.16.0**. Outstanding: §3.8 Mobile Infrastructure (this wave), §3.7 Admin / White-Label / Store / Integrations (Waves 33–36), Wave 37 doc-gap closures, Wave 38 release.

Wave 32 ships **PWA + offline infrastructure** (§3.8). Two concerns: (a) installable PWA on iOS/Android/desktop; (b) local-first cache + offline write queue. The Wave 30 `public/sw.js` (push handler) is **subsumed** by the workbox-built TS worker `src/sw.ts` and DELETED.

**Test baseline going into Wave 32:** Wave 31 shipped at ≥660 tests. Run `npm test` and record. Lint baseline: 0 errors, ≤7 warnings.

**Read `.claude/wave-testing-strategy.md` before starting.** Wave 32 wraps `useUpdateTask` (existing test: `useTaskMutations.test.ts`) and `useCreateComment` (Wave 26 test: `useTaskComments.test.tsx`) with offline-queue logic. Required test infrastructure setup, in this exact order at the start of Task 3:
1. Add dev dep `"fake-indexeddb": "^6.0.0"` to `package.json` (counted in Wave 32's allowed dep additions; mention in PR alongside the 5 prod deps).
2. Prepend `import 'fake-indexeddb/auto';` to `Testing/setupTests.ts` (line 1 — must be before any other import).
3. In a new `beforeEach` in `Testing/setupTests.ts`: `Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true })`. This sets the default to "online" so existing `useTaskMutations` and `useTaskComments` tests pass through the existing planterClient mock path unchanged.
4. Create `Testing/test-utils/mocks/online.ts` with `setOnlineStatus(value: boolean)` that flips the flag AND dispatches the matching `online`/`offline` event so React listeners react.
5. Then write the new `Testing/unit/features/tasks/hooks/useTaskMutations.offline.test.ts` exercising the offline branch via `setOnlineStatus(false)`.

## Pre-flight verification (run before any task)

1. `git log --oneline` includes the Wave 31 commits + docs sweep.
2. These files exist:
   - `public/sw.js` (Wave 30 — Wave 32 DELETES this; replaced by `src/sw.ts`)
   - `src/features/tasks/hooks/useTaskMutations.ts` (queue wrap target — `useUpdateTask`)
   - `src/features/tasks/hooks/useTaskComments.ts` (queue wrap target — `useCreateComment`)
   - `src/layouts/DashboardLayout.tsx` (header host for `<ConnectivityIndicator>`, `<PendingChangesBadge>`, `<InstallPrompt>`)
   - `vite.config.ts`
   - `src/main.tsx` (entry — react-query-persist-client init goes here)
3. `package.json` does NOT yet contain `vite-plugin-pwa`, `workbox-window`, `idb`, `@tanstack/react-query-persist-client`, or `@tanstack/query-sync-storage-persister`. The wave adds exactly these five.
4. `dev-notes.md` has the Wave 30 `public/sw.js` exception entry. Wave 32 flips it to **Resolved (Wave 32)**.

## Branch

One branch per task, cut from `main`:
- Task 1 → `claude/wave-32-pwa-installability`
- Task 2 → `claude/wave-32-offline-cache`
- Task 3 → `claude/wave-32-offline-write-queue`

Open PR per task. **Do not push directly to `main`.**

## Wave 32 scope

Three tasks. Task 1 unlocks installability + subsumes the Wave 30 worker. Task 2 layers in read caching. Task 3 ships the offline write queue (riskiest — most-recent-wins policy explicitly documented).

---

### Task 1 — PWA installability + workbox-built service worker

**Commit:** `feat(wave-32): PWA manifest + icons + workbox TS worker subsuming Wave 30 push handler`

**Dependencies (locked, exact versions)**:
```json
"vite-plugin-pwa": "^0.21.1",
"workbox-window": "^7.3.0"
```

(Latest stable as of writing. If newer versions exist at execution time, prefer the newest stable that retains TypeScript-first APIs and React 19 compat. Document deviations in PR.)

**Vite config** — `vite.config.ts`. Add the `VitePWA` plugin alongside the existing `react()` and `tailwindcss()`:

```ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'inline',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      manifest: {
        name: 'PlanterPlan',
        short_name: 'PlanterPlan',
        description: 'Church planting project management',
        theme_color: '#1e293b',          // slate-800
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/dashboard',
        scope: '/',
        orientation: 'portrait-primary',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // runtimeCaching is filled in Task 2
    }),
  ],
});
```

**Icons** — `public/icons/` (NEW directory). Three PNG files: `icon-192.png` (192×192), `icon-512.png` (512×512), `icon-512-maskable.png` (512×512 with safe area for maskable rendering).

Source: use the existing `public/logo.svg` or `public/logo.png` (read `public/` to confirm what's there). Generate via:

```bash
npx pwa-asset-generator public/logo.png public/icons \
  --type png --no-html --background "#ffffff" --padding "10%"
```

Rename outputs to match the manifest expectations. Commit the three PNGs. **Do not** commit any unused intermediate assets.

**TS service worker** — `src/sw.ts` (NEW; replaces `public/sw.js`):

```ts
/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

// Workbox-injected at build time
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('install', () => { void self.skipWaiting(); });
self.addEventListener('activate', () => { void self.clients.claim(); });

// Push handler — subsumes Wave 30's public/sw.js implementation
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload: { title?: string; body?: string; url?: string; icon?: string; tag?: string };
  try { payload = event.data.json(); } catch { payload = { title: 'PlanterPlan', body: event.data.text() }; }
  const { title = 'PlanterPlan', body = '', url = '/', icon = '/icons/icon-192.png', tag } = payload;
  event.waitUntil(self.registration.showNotification(title, { body, icon, tag, data: { url } }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? '/';
  event.waitUntil(self.clients.openWindow(url));
});

// Task 2 will append runtimeCaching strategies here.
```

**DELETE `public/sw.js`** in this PR — workbox builds the new worker. Update Wave 30's `dev-notes.md` entry to **Resolved (Wave 32)**.

**Install prompt UI** — `src/features/pwa/components/InstallPrompt.tsx` (NEW). Listens for `beforeinstallprompt`; renders a Sonner toast or banner: "Install PlanterPlan as an app for faster access." [Install] [Dismiss]. On dismiss: `localStorage.setItem('planterplan.installPromptDismissedAt', String(Date.now()))` + don't re-show for 30 days. On install: `prompt.prompt()` + log outcome + hide.

**iOS hint** — `src/features/pwa/components/InstallHintIos.tsx` (NEW). iOS Safari doesn't fire `beforeinstallprompt`. Detect `/iPhone|iPad|iPod/.test(navigator.userAgent) && !(navigator as any).standalone`; render a small `<Popover>` with "Add to Home Screen" instructions (open the share sheet → "Add to Home Screen"). One-shot per device (localStorage flag).

**Mount both** in `src/layouts/DashboardLayout.tsx` — `<InstallPrompt />` and `<InstallHintIos />` as sibling components in the layout header. Each component handles its own visibility.

**Architecture doc** — `docs/architecture/pwa-offline.md` (NEW):

```md
# PWA + Offline (Wave 32)

## Stack
* `vite-plugin-pwa@^0.21.1` (workbox under the hood)
* `workbox-window@^7.3.0`
* TS service worker at `src/sw.ts` (`injectManifest` mode — workbox compiles)

## Manifest
`public/manifest.webmanifest` (auto-generated by VitePWA from the config in `vite.config.ts`). `start_url: /dashboard`, `display: standalone`.

## Worker lifecycle
* Install → `skipWaiting()` immediately.
* Activate → `clients.claim()` immediately.
* Push handler subsumed from Wave 30's `public/sw.js`. Same payload contract: `{ title, body, url, icon, tag }`.

## Install UX
* **Desktop / Android**: `<InstallPrompt>` listens for `beforeinstallprompt`, renders a Sonner banner. 30-day re-show suppression on dismiss.
* **iOS Safari**: `<InstallHintIos>` shows a popover with "Add to Home Screen" instructions (no browser API for programmatic install on iOS).

## Cache strategies
*Filled in Task 2.*

## Write queue
*Filled in Task 3.*
```

**Tests**:
* `Testing/unit/features/pwa/components/InstallPrompt.test.tsx` (NEW) — banner renders on `beforeinstallprompt`; dismiss persists; suppressed for 30 days.
* `Testing/unit/features/pwa/components/InstallHintIos.test.tsx` (NEW) — UA + standalone detection.
* Manual: open the production build in Chrome → install icon in URL bar → install → app launches in standalone window.

**DB migration?** No.

**Out of scope:** Splash screens beyond manifest defaults; Apple Web App meta tags beyond what `vite-plugin-pwa` generates.

---

### Task 2 — Offline read cache

**Commit:** `feat(wave-32): runtime caching for Supabase reads + assets via workbox + react-query-persist`

**Dependencies (additional)**:
```json
"@tanstack/react-query-persist-client": "^5.66.0",
"@tanstack/query-sync-storage-persister": "^5.66.0"
```

(Match the major version of `@tanstack/react-query` already in the project — the persister is part of the same monorepo and version-locked.)

**Workbox runtime caching** — extend `src/sw.ts`:

```ts
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Asset cache — cache-first, 30 days, max 100 entries
registerRoute(
  ({ request }) => ['image','font','style','script'].includes(request.destination),
  new CacheFirst({
    cacheName: 'pp-assets',
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  }),
);

// Supabase reads — network-first, 24h fallback, max 200 entries
registerRoute(
  ({ url, request }) => url.pathname.includes('/rest/v1/') && request.method === 'GET',
  new NetworkFirst({
    cacheName: 'pp-supabase-reads',
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 24 * 60 * 60 })],
  }),
);

// Auth + functions — never cache
registerRoute(
  ({ url }) => url.pathname.includes('/auth/v1/') || url.pathname.includes('/functions/v1/'),
  async ({ request }) => fetch(request),
);
```

(`workbox-routing`, `workbox-strategies`, `workbox-expiration` come bundled with `vite-plugin-pwa`'s peer deps; no separate install.)

**React Query persistence** — `src/main.tsx` (or wherever `<QueryClientProvider>` is mounted). Wrap with `<PersistQueryClientProvider>`:

```ts
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

const persister = createSyncStoragePersister({ storage: window.localStorage, key: 'planterplan.rq' });

// Replace <QueryClientProvider client={queryClient}>...</QueryClientProvider> with:
<PersistQueryClientProvider
  client={queryClient}
  persistOptions={{
    persister,
    maxAge: 1000 * 60 * 60 * 24,
    dehydrateOptions: {
      shouldDehydrateQuery: (q) => {
        const key = q.queryKey[0] as string;
        // Persist stable lists; skip volatile / sensitive caches
        return ['projectHierarchy','taskComments','activityLog'].includes(key);
      },
    },
  }}
>
  {/* existing tree */}
</PersistQueryClientProvider>
```

**Connectivity indicator** — `src/features/pwa/components/ConnectivityIndicator.tsx` (NEW). Subscribes to `online`/`offline` window events. Renders a small `<WifiOff>` icon (`lucide-react`, already in deps) with tooltip when offline. Sonner toast on transition: "You're offline" / "Back online — syncing now".

Mount in `src/layouts/DashboardLayout.tsx` header alongside the install prompt.

**Architecture doc** — append to `docs/architecture/pwa-offline.md`:

```md
## Cache strategies (Wave 32 Task 2)
* **Assets** (images, fonts, CSS, JS) — `CacheFirst`; 30-day expiry; max 100 entries. Cache name `pp-assets`.
* **Supabase reads** (`/rest/v1/` GETs) — `NetworkFirst`; 24h fallback; max 200 entries. Cache name `pp-supabase-reads`. Never caches POST/PUT/PATCH/DELETE — those go through Task 3's queue.
* **Auth + functions** (`/auth/v1/`, `/functions/v1/`) — never cached. Always network-first with no fallback.

## React Query persistence
`@tanstack/react-query-persist-client` + `query-sync-storage-persister`. Persists `['projectHierarchy', ...]`, `['taskComments', ...]`, `['activityLog', ...]` to `localStorage.planterplan.rq` with 24h `maxAge`. Volatile caches (notification log, push state, etc.) are NOT persisted.

## Connectivity indicator
`<ConnectivityIndicator>` subscribes to `online`/`offline` events; renders a `<WifiOff>` icon when offline; Sonner toast on transition.
```

**Tests**:
* `Testing/unit/features/pwa/components/ConnectivityIndicator.test.tsx` (NEW) — online → hidden; offline → visible + toast; transitions in both directions.
* Manual: load a project online → DevTools → Network → Offline → navigate the project hierarchy, comments, gantt — should still render from cache.

**DB migration?** No.

**Out of scope:** Offline support for `/admin`; gantt drag while offline; offline comment writes (Task 3 covers).

---

### Task 3 — Offline write queue

**Commit:** `feat(wave-32): mutation queue with most-recent-wins replay on reconnect`

**Dependencies (additional)**:
```json
"idb": "^8.0.0"
```

(Tiny IndexedDB wrapper. ~5 KB. Three-line API.)

**Mutation queue store** — `src/shared/lib/offline/queue.ts` (NEW):

```ts
import { openDB, type DBSchema } from 'idb';

export interface QueueItem {
  id: string;            // crypto.randomUUID()
  kind: 'task.updateBody' | 'task.updateStatus' | 'comment.create';
  payload: unknown;
  queuedAt: string;      // ISO from new Date().toISOString()
  attempts: number;
  lastError?: string;
}

interface PPQueueDB extends DBSchema {
  queue: { key: string; value: QueueItem };
}

const DB_NAME = 'planterplan-offline';
const DB_VERSION = 1;

async function db() {
  return openDB<PPQueueDB>(DB_NAME, DB_VERSION, {
    upgrade(d) { d.createObjectStore('queue', { keyPath: 'id' }); },
  });
}

export async function enqueue(kind: QueueItem['kind'], payload: unknown): Promise<QueueItem> {
  const item: QueueItem = { id: crypto.randomUUID(), kind, payload, queuedAt: new Date().toISOString(), attempts: 0 };
  await (await db()).put('queue', item);
  return item;
}

export async function list(): Promise<QueueItem[]> {
  return (await db()).getAll('queue');
}

export async function pop(id: string): Promise<void> {
  await (await db()).delete('queue', id);
}

export async function markFailed(id: string, error: string): Promise<void> {
  const d = await db();
  const item = await d.get('queue', id);
  if (!item) return;
  item.attempts += 1;
  item.lastError = error;
  await d.put('queue', item);
}
```

**Whitelist of queue-safe mutations (locked)**: `task.updateBody`, `task.updateStatus`, `comment.create`. Anything else fails when offline — surface the existing toast.

**Queue-aware mutation wrappers** — extend `src/features/tasks/hooks/useTaskMutations.ts` and `src/features/tasks/hooks/useTaskComments.ts`. The hook checks `navigator.onLine`:
* Online → call `planterClient` directly (existing path).
* Offline + on-whitelist → `enqueue(kind, payload)`; apply optimistic UI update; resolve with the optimistic value.
* Offline + off-whitelist → throw with toast: "This action requires a connection."

**Replay engine** — `src/shared/lib/offline/replay.ts` (NEW):

```ts
import type { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { planter } from '@/shared/api/planterClient';
import { list, pop, markFailed, type QueueItem } from './queue';

const MAX_ATTEMPTS = 5;

export async function replayQueue(qc: QueryClient): Promise<{ replayed: number; failed: number; dropped: number }> {
  const items = await list();
  let replayed = 0, failed = 0, dropped = 0;
  for (const item of items) {
    if (item.attempts >= MAX_ATTEMPTS) {
      await pop(item.id);
      dropped++;
      toast.error(`Sync failed for: ${item.kind}. Please try again manually.`);
      continue;
    }
    try {
      await dispatch(item);
      await pop(item.id);
      replayed++;
    } catch (err) {
      await markFailed(item.id, String(err));
      failed++;
    }
  }
  if (replayed > 0) qc.invalidateQueries(); // broad invalidation; cheap on reconnect
  return { replayed, failed, dropped };
}

async function dispatch(item: QueueItem): Promise<void> {
  switch (item.kind) {
    case 'task.updateBody':   { const p = item.payload as { id: string; payload: unknown }; await planter.entities.Task.update(p.id, p.payload as Parameters<typeof planter.entities.Task.update>[1]); break; }
    case 'task.updateStatus': { const p = item.payload as { id: string; status: string }; await planter.entities.Task.updateStatus(p.id, p.status); break; }
    case 'comment.create':    { const p = item.payload as Parameters<typeof planter.entities.TaskComment.create>[0]; await planter.entities.TaskComment.create(p); break; }
  }
}

export function useReplayOnReconnect(qc: QueryClient) {
  // useEffect that subscribes to window 'online' event and calls replayQueue(qc).
  // Implementation: useEffect with cleanup; debounce 500ms to coalesce flapping connectivity.
}
```

**Conflict policy (locked, documented loudly)**: **Most-recent-wins** — the queued mutation overwrites server state at replay time, even when the server's `updated_at` is newer. **This will silently lose another user's intervening edit.** Accepted trade-off for v1: PlanterPlan rows are mostly single-author at any moment. A CRDT or per-field timestamp policy is out of scope for Wave 32.

**Pending-changes UI** — `src/features/pwa/components/PendingChangesBadge.tsx` (NEW). Reads queue size via `list()` (poll every 2s when offline; on every `replayQueue` completion when online). Renders a small badge: "Syncing N changes…" (online + non-empty) or "N changes pending sync" (offline + non-empty). Hidden when empty. Click → `<Popover>` listing queued items with their `queuedAt`.

Mount in `src/layouts/DashboardLayout.tsx` header alongside `<ConnectivityIndicator>`.

**Architecture doc** — append to `docs/architecture/pwa-offline.md`:

```md
## Write queue (Wave 32 Task 3)

### Schema
IndexedDB store `queue` in DB `planterplan-offline` (version 1):
* `id` (uuid via `crypto.randomUUID()`)
* `kind` — one of `'task.updateBody' | 'task.updateStatus' | 'comment.create'` (whitelist)
* `payload` (per-kind payload shape)
* `queuedAt` (ISO string)
* `attempts` (int, capped at 5)
* `lastError` (optional)

### Whitelist (locked)
Only the three mutation kinds above are queue-safe. All others fail with toast "This action requires a connection." when offline:
* DnD reordering, project edit, project delete, member invites, all admin actions, billing — all OFF-whitelist.

### Replay
On `window.online`: `replayQueue(queryClient)` iterates the queue; each item: dispatch → `pop` on success, `markFailed` on error. After 5 attempts: drop with toast "Sync failed for: <kind>. Please try again manually." Successful replay triggers a broad `qc.invalidateQueries()`.

### Conflict resolution (LOUD WARNING)
**Most-recent-wins**: the queued mutation overwrites server state, even when the server has a newer write. **This can silently lose another user's intervening edit.** Trade-off rationale:
* PlanterPlan rows are mostly single-author at any moment.
* A CRDT / per-field timestamp policy is significantly more code; deferred to Wave 38+ if real conflicts occur.

### UI
`<PendingChangesBadge>` shows queue size; popover lists pending items.
```

**Tests**:
* `Testing/unit/shared/lib/offline/queue.test.ts` (NEW) — enqueue / list / pop / markFailed; persistence across page reloads (mock IDB via `fake-indexeddb` if needed; if not in deps, accept that the test mocks `openDB` directly).
* `Testing/unit/shared/lib/offline/replay.test.ts` (NEW) — happy-path replay; partial replay (item 2 fails, items 1+3 succeed); >5 attempts → drop + toast; broad invalidate fires.
* `Testing/unit/features/tasks/hooks/useTaskMutations.offline.test.ts` (NEW) — `useUpdateTask` enqueues offline; calls planterClient online; off-whitelist mutations throw + toast.
* `Testing/unit/features/pwa/components/PendingChangesBadge.test.tsx` (NEW) — badge state matrix.

**DB migration?** No.

**Out of scope:** DnD reordering offline; project edit/delete offline; conflict-merging UI; RxDB / WatermelonDB integration; multi-device sync coordination (defer).

---

## Documentation Currency Pass (mandatory — before review)

`docs(wave-32): documentation currency sweep`. Operations:

1. **`spec.md`** — flip §3.8 Mobile Infrastructure from `[ ]` to `[x]` with sub-bullets: "PWA installability + offline read cache + write queue (Wave 32). Local-first DB sync (RxDB) deferred." Bump to **1.17.0**.
2. **`docs/AGENT_CONTEXT.md`** — add: `**PWA + Offline (Wave 32)**: `vite-plugin-pwa` + workbox-built `src/sw.ts` (subsumes Wave 30 `public/sw.js`); `<InstallPrompt>` + `<InstallHintIos>` in DashboardLayout; offline read cache via workbox runtime caching + react-query-persist; offline write queue at `src/shared/lib/offline/{queue,replay}.ts` with most-recent-wins replay (3-kind whitelist).`
3. **`docs/architecture/pwa-offline.md`** is in (filled across all three tasks).
4. **`docs/architecture/notifications.md`** — Wave 30 push handler reference: change `public/sw.js` → `src/sw.ts` (workbox-built).
5. **`docs/dev-notes.md`** — flip Wave 30 service-worker exception to **Resolved (Wave 32) — workbox-built TS worker subsumed the JS file.** Add: **Active**: Offline write queue uses most-recent-wins conflict resolution (intervening server edits silently lost). Documented in `docs/architecture/pwa-offline.md`. Wave 38 may revisit.
6. **`repo-context.yaml`** — `wave_status.current: 'Wave 32 (PWA + Offline)'`, `last_completed: 'Wave 32'`, `spec_version: '1.17.0'`. `wave_32_highlights:` — workbox manifest, write queue whitelist, conflict policy, 5 new deps.
7. **`CLAUDE.md`** — Tech Stack: add `vite-plugin-pwa`, `workbox-window`, `idb`, `@tanstack/react-query-persist-client`, `@tanstack/query-sync-storage-persister`. New "PWA + Offline" subsection with the conflict-resolution policy disclosure. **Remove** the JS exception note added in Wave 30 (the exception is closed).

Land docs as `docs(wave-32): documentation currency sweep`.

## Wave Review (mandatory — before commit + push to main)

1. **Lighthouse PWA audit** — production build → DevTools → Lighthouse → PWA score ≥90.
2. **Offline read smoke** — load a project → DevTools → Offline → navigate freely. Read paths render from cache; only writes fail or queue.
3. **Write-queue conflict** — manually craft the conflict scenario: queue an update offline; from another browser, mutate the same row; reconnect the offline browser → queued write overwrites. Confirm the documented most-recent-wins policy holds.
4. **Push notifications still work** — subscribe in Settings → trigger a comment mention from another browser → push lands. Wave 30's contract preserved.
5. **Bundle size** — `npm run build` size delta should be ≤ ~100 KB total (workbox + idb + persist).
6. **iOS install hint** — open in iOS Safari (or DevTools mobile emulation iPhone) → `<InstallHintIos>` popover appears.
7. **Type drift** — no `database.types.ts` change expected.
8. **Test-impact reconciled** — `fake-indexeddb` installed; `setupTests.ts` sets `navigator.onLine = true` default; `Testing/test-utils/mocks/online.ts` (NEW) provides `setOnlineStatus(value)`; existing `useTaskMutations.test.ts` + `useTaskComments.test.tsx` pass through unchanged (online branch); new `.offline.test.ts` exercises queue path; no `it.skip`. Test count ≥ baseline + new tests.
9. **Lint + build + tests** — green per `.claude/wave-execution-protocol.md` §4 + §8.5 (workbox/SW drift is a HALT).

## Commit & Push to Main (mandatory — gates Wave 33)

After all three task PRs and the docs sweep merge:
1. `git checkout main && git pull && npm install && npm run lint && npm run build && npm test`.
2. Commits: 3 task + 1 docs sweep on top of Wave 31.
3. `git push origin main`. CI green.
4. **Do not start Wave 33** until the above is true.

## Verification Gate (per task, before push)

**Every command below is a HALT condition per `.claude/wave-execution-protocol.md` §4 + §8.5. If any check fails, STOP — workbox/SW drift is a protocol-level halt.**

```bash
npm run lint      # 0 errors required (≤7 pre-existing warnings tolerated). FAIL → HALT.
npm run build     # clean (verify gantt + admin + other lazy chunks still split; verify src/sw.ts replaces public/sw.js). FAIL → HALT.
npm test          # 100% pass rate; count ≥ baseline + new tests. FAIL → HALT.
git status        # clean (public/sw.js DELETED — confirm in `git status` before commit)
```

## Key references

- `CLAUDE.md` — conventions
- `.gemini/styleguide.md` — strict typing, FSD, optimistic-rollback
- `docs/architecture/notifications.md` — Wave 30 push contract; Wave 32 worker rewrite must preserve it
- `docs/architecture/pwa-offline.md` — created in Task 1, filled across all three
- `vite-plugin-pwa` docs — `https://vite-pwa-org.netlify.app/`
- `workbox` strategies docs — `https://developer.chrome.com/docs/workbox/modules/workbox-strategies`
- React Query persistence docs — `https://tanstack.com/query/v5/docs/framework/react/plugins/persistQueryClient`

## Critical Files

**Will edit:**
- `vite.config.ts` (VitePWA + runtime caching)
- `src/main.tsx` (or wherever QueryClientProvider mounts) — `PersistQueryClientProvider`
- `src/layouts/DashboardLayout.tsx` (header: `<ConnectivityIndicator>`, `<PendingChangesBadge>`, `<InstallPrompt>`, `<InstallHintIos>`)
- `src/features/tasks/hooks/useTaskMutations.ts` (queue-aware whitelist wrappers)
- `src/features/tasks/hooks/useTaskComments.ts` (queue-aware wrapper for `useCreateComment`)
- `docs/architecture/pwa-offline.md` (filled across tasks)
- `docs/architecture/notifications.md` (worker file path update)
- `docs/AGENT_CONTEXT.md` (Wave 32 golden path)
- `docs/dev-notes.md` (flip JS exception to Resolved; add conflict-policy active note)
- `package.json` (5 new deps total)
- `spec.md` (flip §3.8, bump to 1.17.0)
- `repo-context.yaml` (Wave 32 highlights)
- `CLAUDE.md` (Tech Stack + PWA subsection; remove JS exception note)

**Will create:**
- `src/sw.ts` (workbox InjectManifest worker)
- `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-512-maskable.png`
- `src/features/pwa/components/InstallPrompt.tsx`
- `src/features/pwa/components/InstallHintIos.tsx`
- `src/features/pwa/components/ConnectivityIndicator.tsx`
- `src/features/pwa/components/PendingChangesBadge.tsx`
- `src/shared/lib/offline/queue.ts`
- `src/shared/lib/offline/replay.ts`
- Tests under `Testing/unit/...` (~6 new test files)

**Will delete:**
- `public/sw.js` (subsumed by `src/sw.ts`)

**Explicitly out of scope this wave:**
- DnD reordering offline
- Project edit/delete offline
- Conflict-merging UI
- RxDB / WatermelonDB
- Native mobile push
- Background Sync API beyond the simple online-event replay

## Ground Rules

TypeScript only (the Wave 30 JS exception is **closed**); no `.js`/`.jsx`; no barrel files; `@/` → `src/`, `@test/` → `Testing/test-utils`; no raw date math (queue uses ISO via `new Date().toISOString()` — boundary marshalling, not arithmetic); no direct `supabase.from()` in components — offline replay calls `planterClient` methods; Tailwind utilities only (no arbitrary values, no pure black — slate-900/zinc-900); brand button uses `bg-brand-600 hover:bg-brand-700`; optimistic mutations must force-refetch in `onError` (offline replay's broad invalidate is the equivalent); max subtask depth = 1; **5 new deps allowed: `vite-plugin-pwa`, `workbox-window`, `idb`, `@tanstack/react-query-persist-client`, `@tanstack/query-sync-storage-persister` — pinned per the version specs above**; atomic revertable commits; build + lint + tests clean before every push; **document the most-recent-wins conflict policy explicitly** so future devs understand the trade-off.
