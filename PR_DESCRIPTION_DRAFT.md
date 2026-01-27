
# Pull Request: Stability Fixes & UI Polish

## 📋 Summary

This pull request delivers a major stability and user experience upgrade. It resolves critical network connectivity issues causing "infinite" loading states in the local development environment and implements a comprehensive UI polish pass to ensure a consistent, premium design across both light and dark modes.

## ✨ Highlights

- **Localhost Connectivity Fix:** Configured Vite to explicitly listen on `127.0.0.1`. This eliminates a confirmed 30-150 second "stall" caused by IPv6 address resolution timeouts on `localhost`, restoring instant load times.
- **Authentication Stability:** Added a 10-second timeout to Supabase session retrieval with explicit error handling. If the session hangs, it now clears stale tokens and fails gracefully rather than freezing the app indefinitely.
- **Theme & Design System:**
  - **Dark Mode Overhaul:** Removed "muddy" backgrounds and "ugly" orange highlights. Implemented clean, translucent brand tints (`bg-brand-500/10`) and proper semantic colors (`text-muted-foreground`) for better contrast and legibility.
  - **Universal Layout:** Enforced uniform height for Project Cards prevents grid misalignment.
  - **Visual Consistency:** Harmonized hover states, shadow intensities, and icon colors across the Dashboard, Stats, and Sidebar.

## 🗺️ Roadmap Progress

| Item ID          | Feature Name             | Phase | Status      | Notes |
| ---------------- | ------------------------ | ----- | ----------- | ----- |
| [P5-TECH-DEBT]   | Tech Debt Resolution     | 5     | ✅ Done      | Network Config & Auth Timeouts |
| [P6.9-UI-POLISH] | UI/UX Consistency        | 6     | ✅ Done      | Dark Mode & Layout Fixes |

## 🏗️ Technical Details

### Connectivity & Network
- **Vite Config:** Updated `vite.config.js` to set `server.host: '127.0.0.1'`. Previous default behavior caused extensive stalls due to dual-stack (IPv4/IPv6) contention.
- **Auth Context:** `AuthContext.jsx` now races the `supabase.auth.getSession()` call against a 10-second timeout promise to preventing infinite loading spirals during network flakes.

### Design System Updates
- **Global Nav:** Replaced legacy CSS `.selected` rule with utility-first Tailwind classes (`bg-brand-50 dark:bg-brand-500/10`) for precise theme control.
- **Project Cards:** Added `h-full` to card containers. Updated status badges to use specific dark-mode color variants (e.g., `dark:bg-indigo-500/20`).
- **Stats Overview:** switched hardcoded slate colors to `text-muted-foreground` / `text-card-foreground` to fix "invisible text" bugs in dark mode.

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
  2. Check Sidebar "Dashboard" highlight (should be subtle brand tint, not solid orange).
  3. Check "Getting Started" widget (clean background, legible text).
  4. Check "New Template" button (neutral background).
  5. Check Stats cards (Team icon visible in light mode, text visible in all modes).

- **Grid Layout:**
  1. View Dashboard with multiple projects.
  2. Verify all cards have equal height regardless of content length.
