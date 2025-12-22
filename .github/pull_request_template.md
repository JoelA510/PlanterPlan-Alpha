# Pull Request

## 📋 Summary
## 🛡️ Architecture & Security Check
* [ ] **RLS Impact:** Does this change row visibility? (If yes, verify `docs/architecture/01-schema-and-rls.md`)
* [ ] **Recursion Check:** Did we introduce any self-referencing SQL/Policies?
* [ ] **State Consistency:** If this is a DND change, is there a `catch` block for rollback?
* [ ] **Migrations:** Included `docs/db/migrations/XXX.sql`?

## 🧪 Verification
* [ ] `npm run lint` passed (Zero warnings).
* [ ] `npm test` passed.
* [ ] **Manual:** Verified Optimistic Rollback (Simulate offline mode).

## 🔍 Context
