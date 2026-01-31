
# Pull Request: Stability Fixes & UI Polish

## 📋 Summary

This pull request delivers a major stability and user experience upgrade. It resolves critical network connectivity issues causing "infinite" loading states in the local development environment and implements a comprehensive UI polish pass to ensure a consistent, premium design across both light and dark modes.

## ✨ Highlights

- **Localhost Connectivity Fix:** Configured Vite to explicitly listen on `127.0.0.1`. This eliminates a confirmed 30-150 second "stall" caused by IPv6 address resolution timeouts on `localhost`, restoring instant load times.
- **Authentication Stability:** Added a 10-second timeout to Supabase session retrieval with explicit error handling. If the session hangs, it now clears stale tokens and fails gracefully rather than freezing the app indefinitely.
- **Resilient Data Fetching:** Implemented an **Exponential Backoff Retry Strategy** in the API client (`planterClient.js`). The application now automatically retries failed requests (up to 3 times) when it encounters network interruptions, preventing white screens.
- **Theme & Design System:**
  - **Dark Mode Overhaul:** Removed "muddy" backgrounds and "ugly" orange highlights. Implemented clean, translucent brand tints (`bg-brand-500/10`) and proper semantic colors.
  - **Universal Layout:** Enforced uniform height for Project Cards.
  - **Visual Consistency:** Harmonized hover states, shadow intensities, and icon colors.

## 🗺️ Roadmap Progress

| Item ID          | Feature Name             | Phase | Status      | Notes |
| ---------------- | ------------------------ | ----- | ----------- | ----- |
| [P5-ERR-BOUND]   | Error Boundaries         | 5     | ✅ Done      | Extended to Network Layer |
| [P5-TECH-DEBT]   | Tech Debt Resolution     | 5     | ✅ Done      | Auth Timeouts & IPv4 Config |
| [P6.9-UI-POLISH] | UI/UX Consistency        | 6     | ✅ Done      | Dark Mode & Layout Fixes |

## 🏗️ Technical Details

### Connectivity & Network
- **Vite Config:** Updated `vite.config.js` to set `server.host: '127.0.0.1'`.
- **Auth Context:** `AuthContext.jsx` now races the `supabase.auth.getSession()` call against a 10-second timeout promise.

### Logic Flow: Auth Session Race Condition

```mermaid
sequenceDiagram
    participant UI as AuthProvider
    participant SB as Supabase Client
    participant TO as Timeout Promise (10s)

    UI->>SB: getSession()
    UI->>TO: Start Timer
    
    par Race
        SB-->>UI: Success (Session Data)
    and
        TO-->>UI: Reject (Error: "Auth Session Timeout")
    end

    alt RPC Returns First
        UI->>UI: Set User & Role
    else Timeout Wins
        UI->>UI: Catch Error
        UI->>UI: localStorage.removeItem('planter-auth-token')
        UI->>UI: Set User = null
        Note over UI: Prevents Infinite Loading
    end
```

### Design System Updates
- **Global Nav:** Replaced legacy CSS `.selected` rule with utility-first Tailwind classes.
- **Stats Overview:** Fixed "invisible text" bugs in dark mode.

## 🔍 Review Guide

### 🚨 High Risk / Security Sensitive

- `vite.config.js` - Network binding change to `127.0.0.1`.
- `src/app/contexts/AuthContext.jsx` - Session timeout logic.

### 🎨 UI & Design

- `src/features/navigation/components/GlobalNavItem.jsx` - New active state styling.
- `src/features/dashboard/components/ProjectCard.jsx` - Layout and color fixes.
- `src/features/onboarding/components/GettingStartedWidget.jsx` - Background and border contrast improvements.
- `src/styles/layout.css` - Removal of legacy active class styles.

## 🧪 Verification Plan

### 1. Environment Setup

- [x] Restart `npm run dev` to apply Vite config changes.
- [x] Clear browser cache to test fresh load speeds.

### 2. Manual Verification

- **Load Speed:**
  1. Reload the app.
  2. Verify WebSocket connection is instant (no 30s+ stall).

- **Theme Consistency:**
  1. Toggle Dark Mode.
  2. Check Sidebar "Dashboard" highlight (should be subtle brand tint).
  3. Check "Getting Started" widget (clean background).
  4. Check "New Template" button (neutral background).
  5. Check Stats cards (Team icon visible in light mode).

## 🔧 Code Review Improvements (2026-01-31)

This release also includes 8 code quality improvements identified during a comprehensive code review:

| # | File | Issue | Fix |
|---|------|-------|-----|
| 1 | `taskService.js` | Duplicate JSDoc block | Removed |
| 2 | `AuthContext.jsx` | Duplicate console.warn | Removed |
| 3 | `projectService.js` | Unused `TASK_STATUS` import | Removed |
| 4 | `utils.js` | Missing null guard in `createPageUrl` | Added |
| 5 | `peopleService.js` | Missing input validation | Added guards |
| 6 | `date-engine/index.js` | `findTaskById` not exported | Now exported |
| 7 | `projectService.js` | Missing JSDoc return types | Added |
| 8 | `useTaskBoard.test.jsx` | Missing displayName | Added |

### Validation Flow (peopleService)

```mermaid
flowchart LR
    A[getPeople called] --> B{projectId?}
    B -->|No| C[Throw Error]
    B -->|Yes| D[Query Supabase]
    D --> E{error?}
    E -->|Yes| F[Throw Error]
    E -->|No| G[Return data]
```

### Build & Test Results
- ✅ `npm run build` - Success (7.30s)
- ✅ `npm test` - 80/80 tests passed
- ✅ `npm run lint` - 0 errors (36 warnings, pre-existing)

## 🔬 Deep Code Review Pass 2 (2026-01-31)

Additional 6 improvements from thorough second-pass review:

| # | File | Issue | Fix |
|---|------|-------|-----|
| 9 | `taskMasterLibraryService.js` | Duplicate JSDoc block | Removed |
| 10 | `CreateProjectModal.jsx` | Unused imports & query | Removed |
| 11 | `positionService.js` | Wrong JSDoc return type | Fixed to `Promise<Array>` |
| 12 | `peopleService.js` | Missing validation in update/delete | Added guards |
| 13 | `CreateProjectModal.jsx` | No try/catch in handleCreate | Added with finally |
| 14 | `useTaskSubscription.js` | Silent subscription errors | Added error callback |

### Error Handling Flow (CreateProjectModal)

```mermaid
sequenceDiagram
    participant UI as CreateProjectModal
    participant Parent as DashboardPage
    participant DB as Supabase

    UI->>UI: setLoading(true)
    UI->>Parent: onCreate(formData)
    Parent->>DB: createProject()
    
    alt Success
        DB-->>Parent: project
        Parent-->>UI: resolve
        UI->>UI: Reset form & close
    else Error
        DB-->>Parent: error
        Parent-->>UI: reject
        UI->>UI: Log error
        Note over UI: Parent handles toast
    end
    UI->>UI: setLoading(false)
```

### Subscription Error Handling

```mermaid
flowchart TD
    A[Subscribe to channel] --> B{Status callback}
    B -->|err exists| C[Log error to console]
    B -->|no error| D[Continue listening]
    D --> E{Postgres change event}
    E --> F[Debounce check]
    F --> G[Invalidate queries]
```

### Updated Build & Test Results
- ✅ `npm run build` - Success (4.18s)
- ✅ `npm test` - 80/80 tests passed
- ✅ `npm run lint` - 0 errors
