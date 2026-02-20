# ADR 002: Downgrade React to v18.3.1

**Status:** Validated / Final for v1.1 Gold Master

**Context:** 
The application suffered from critical crashes within the `ProjectView` board (specifically "Invalid hook call" and "Cannot read properties of null (reading 'useMemo')") when using `@dnd-kit` under React 19.x.

**Decision:** 
Downgrade React and React-DOM from 19.x to 18.3.1 to ensure 100% compatibility with the established project ecosystem.

**Consequences:** 
- **Positive:** Full restoration of drag-and-drop mechanics and visual stability. Consistent 100% pass rate in Playwright E2E suite.
- **Negative:** Sacrifices React 19 features (e.g., `useActionState`) until `@dnd-kit` provide upstream support.

**Verification:**
This downgrade has been verified through exhaustive E2E testing (Wave 12) and is designated as the stable engine for the v1.1 Gold Master release.

**Rollback:** Revert `package.json` changes once upstream dependencies publish confirmed React 19 support.

**Owner:** Antigravity  
**Reviewer:** User  
**Date:** 2026-02-20
