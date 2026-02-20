# Engineering Knowledge

## Architecture & Refactoring

### 2026-02-19: ADR-2 Violation with External Libraries
- **Problem**: ADR-2 Violation with `@supabase-cache-helpers`.
- **Context**: Our app uses a custom `rawSupabaseFetch` wrapper (per ADR-2) to ensure abort resilience and strict timeout protections.
- **Solution**: Removed `@supabase-cache-helpers` and restored standard `@tanstack/react-query` hooks powered by our custom `planterClient.js` which utilizes `rawSupabaseFetch`.
- **Prevention**: **Refactoring Risk**: When adopting new libraries (like supabase-cache-helpers), explicitly verify they do not bypass architectural safeguards (like our rawSupabaseFetch wrapper) defined in previous ADRs.
