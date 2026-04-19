# Recurring Wave Execution Prompts

> **Current pointer:** Wave 26 finalize — use PROMPT B below.
>
> ## Workflow (operator)
> 1. Read the pointer line above.
> 2. Copy **PROMPT A** (per-task mode) OR **PROMPT B** (finalize mode) — whichever matches the current mode.
> 3. Paste into a fresh Code session.
> 4. The agent executes the work AND updates this file's pointer as its final mandatory step.
> 5. Next iteration: re-open this file, the pointer is already advanced.
> 6. Repeat until Wave 38 ships and the pointer reads "All waves complete."

---

## PROMPT A — Per-task (use when pointer mode is "per-task")

Copy everything inside the fence below into a fresh Code session.

````
Execute Wave 26, Task 3 of the PlanterPlan delivery loop.

Repo: D:\PlanterPlan\PlanterPlan-Alpha (origin: github.com/JoelA510/PlanterPlan-Alpha)

## Required reading — in this exact order, BEFORE writing any code
1. `.claude/wave-execution-protocol.md` — halt conditions + per-task execution playbook. Every "FAIL → HALT" is binding.
2. `.claude/wave-testing-strategy.md` — find the Wave 26 section. Lists existing tests at risk + new test infrastructure to build first.
3. `.claude/wave-26-prompt.md` — authoritative wave spec. Your task is the `### Task 3 — ...` section.
4. `CLAUDE.md` and `.gemini/styleguide.md` — conventions.

## Steps (per execution-protocol §1)
1. **Pre-flight verification** (wave plan top section). Verify each fact assertion. HALT if any is false.
2. `git checkout main && git pull && git checkout -b <branch-name from the task's section>`
3. **Build/extend test infrastructure FIRST** (factories, mocks, setupTests changes per the testing-strategy doc).
4. **Mock-extend any existing tests at risk** (the testing-strategy doc lists them per wave). Run `npm test` — confirm existing tests still pass BEFORE you write the implementation. If they don't, the strategy doc has drifted — HALT.
5. **Implement the task** verbatim per the wave plan's Task M section. Honor every "Out of scope" and "DB migration?" note.
6. **Add the new tests** listed in the task spec.
7. **Per-task verification gate** (protocol §4): `npm run lint`, `npm run build`, `npm test`, `git status`. Each FAIL → HALT.
8. **Manual smoke** per the wave plan. HALT on any failure.
9. Commit using the exact "Commit:" line from the plan.
10. `gh pr create` with a body summarizing what shipped + test-count delta + lint/bundle delta if relevant.
11. Reply with the PR URL.

Do NOT touch the wave-level Documentation Currency Pass, Wave Review, or push-to-main — those run in a separate finalize session.

## FINAL STEP (mandatory — do this AFTER the PR is open)

Advance the pointer in `.claude/wave-recurring-prompts.md`:

1. Determine the total task count for this wave: `grep -c '^### Task' .claude/wave-26-prompt.md` — call the result `TOTAL`.
2. If just-completed task number (3) is **less than** `TOTAL`:
   - In `.claude/wave-recurring-prompts.md`, replace the line `> **Current pointer:** Wave 26, Task 3 — use PROMPT A below.` with `> **Current pointer:** Wave 26, Task 4 — use PROMPT A below.`
   - Inside the PROMPT A fenced block, replace every `Wave 26, Task 3` → `Wave 26, Task 4`. Also replace `### Task 3 — ...` → `### Task 4 — ...`. Also update the "If just-completed task number (3) is less than" line to `(4)`.
3. If just-completed task number (3) **equals** `TOTAL` (this was the last task in the wave):
   - Replace the pointer line with `> **Current pointer:** Wave 26 finalize — use PROMPT B below.`
   - Leave PROMPT A's `Wave 26, Task 1` numbers alone (the next wave will reset them via PROMPT B's final step).
4. `git add .claude/wave-recurring-prompts.md && git commit -m "chore(planning): advance recurring prompt pointer" && git push origin main`
5. STOP. Final reply: `[PR URL]` + `Pointer advanced to: <new pointer line>`.

## Non-negotiable halts (per protocol)
- Test failures = HALT, not warnings (protocol §3.5).
- New lint warnings above the 7 baseline = HALT.
- Migration apply failures = HALT, no inline edits (§8.1).
- RLS regressions = HALT (§8.2).
- `database.types.ts` hand-edit drift = HALT, do NOT regen types (§8.3).
- 5-attempt debugging cap. If stuck, surface findings and stop.
- **If the task work halts BEFORE the PR is opened, do NOT advance the pointer.** Pointer-advance only happens on successful PR.

## Constraints (from styleguide + execution protocol)
TypeScript only; no `.js`/`.jsx`; no barrel files; `@/` → `src/`, `@test/` → `Testing/test-utils`; no raw date math (use `@/shared/lib/date-engine`); no `supabase.from()` in components (use `planter.entities.*`); Tailwind utilities only, no arbitrary values, no pure black (use `slate-900`/`zinc-900`); brand button `bg-brand-600 hover:bg-brand-700`; optimistic mutations force-refetch in `onError`; Deno/frontend mirrors stay in lock-step; DB migrations additive-only unless the wave plan explicitly pre-approves a breaking change.
````

---

## PROMPT B — Wave finalize (use when pointer mode is "finalize")

Copy everything inside the fence below into a fresh Code session.

````
Finalize Wave 26 of the PlanterPlan delivery loop.

Repo: D:\PlanterPlan\PlanterPlan-Alpha (origin: github.com/JoelA510/PlanterPlan-Alpha)

All task PRs are reviewed and merged to main.

## Required reading
1. `.claude/wave-execution-protocol.md` §5 (Docs Currency), §6 (Wave Review), §7 (final cutover gate).
2. `.claude/wave-testing-strategy.md` — Wave 26 section. The Wave Review's "Test-impact reconciled" item checks against this.
3. `.claude/wave-26-prompt.md` — Documentation Currency Pass + Wave Review + Commit & Push sections.

## Steps (per execution-protocol §5–7)
1. `git checkout main && git pull && npm install`
2. **Documentation Currency Pass** (protocol §5): apply every doc edit in the wave plan's section verbatim — `spec.md`, `docs/AGENT_CONTEXT.md`, `docs/architecture/*.md`, `docs/dev-notes.md`, `repo-context.yaml`, `CLAUDE.md`, `.env.example` if listed. HALT if any doc edit is unclear — surface to user; don't guess.
3. **Wave Review** (protocol §6): walk every checklist item. The "Test-impact reconciled" item is non-trivial — verify each existing-test mock from the testing-strategy doc IS in place and IS passing. Fix any "no" before pushing.
4. **Final verification gate** (protocol §7): `npm run lint`, `npm run build`, `npm test`, `git status`. Each FAIL → HALT. Test count must be ≥ wave's documented target.
5. Commit as `docs(wave-26): documentation currency sweep`.
6. `git push origin main`. If CI is configured, WAIT for green. CI failure = HALT, do not declare wave complete.
7. **Verify the next wave's Session Context recap matches reality** (commit SHAs, shipped-items table). Adjust the next wave plan ONLY if there's drift; otherwise leave alone.

## FINAL STEP (mandatory — do this AFTER push to main + CI green)

Advance the pointer in `.claude/wave-recurring-prompts.md`:

1. If just-finalized wave was **38**:
   - Replace the entire body of `.claude/wave-recurring-prompts.md` (everything below the H1 line) with:
     ```
     # Wave Execution Complete
     
     v1.0.0 tagged on YYYY-MM-DD (substitute today's date). All 13 waves (26-38) shipped.
     
     This file is obsolete. Post-1.0 work is tracked outside the wave-prompt system.
     ```
2. Else (current wave is 26-37):
   - Compute next wave: `NEXT = current + 1` (e.g., 26 → 27).
   - Replace the pointer line: `> **Current pointer:** Wave NEXT, Task 1 — use PROMPT A below.`
   - Inside the PROMPT A fenced block: replace every `Wave 26` → `Wave NEXT`. Also replace `Wave 26, Task <any>` → `Wave NEXT, Task 1`. Also replace `wave-26-prompt.md` → `wave-NEXT-prompt.md`. Also replace `### Task <any>` → `### Task 1`.
   - Inside the PROMPT B fenced block: replace every `Wave 26` → `Wave NEXT`. Also replace `wave-26-prompt.md` → `wave-NEXT-prompt.md`. Also replace `docs(wave-26):` → `docs(wave-NEXT):`.
3. `git add .claude/wave-recurring-prompts.md && git commit -m "chore(planning): advance recurring prompt to Wave NEXT" && git push origin main`
4. STOP. Final reply: `Wave 26 shipped + pushed to main` + summary (test-count delta, lint-warning delta, bundle-size delta, deferrals, halt conditions hit) + `Pointer advanced to: <new pointer line>`.

Do NOT begin Wave NEXT. Wait for explicit kickoff.

## Non-negotiable halts (per protocol)
- Verification gate failure = HALT, do not push.
- Migration apply failure on `main` after merge = HALT, hotfix branch (§8.1).
- Type drift on `main` = HALT (§8.3).
- Workbox/SW drift if Wave is 32+ = HALT (§8.5).
- Doc edit ambiguity = HALT and surface (§5).
- **If the finalize work halts BEFORE the push to main is confirmed (CI green if applicable), do NOT advance the pointer.** Pointer-advance only happens on successful wave completion.
````

---

## Notes

**Why pointer-advance is the LAST step**: it serializes wave progress with version control. If the agent's work halts mid-task, the pointer doesn't move — operator re-pastes the same prompt and resumes. If the work succeeds, the pointer moves and the next paste is the next iteration automatically.

**Why edit this file rather than a separate state file**: keeps the operator's UX to a single file open. The pointer + the prompt are co-located.

**Parallelism (operator-side, optional)**: open one Code instance per task using `git worktree add ../planterplan-wave-26-task-1 -b claude/wave-26-comments-schema main` per task, paste PROMPT A in each terminal narrowed to its task number. The pointer-advance final step still works (each agent advances after its PR opens; conflicts on the file edit resolve to the highest task number, which is correct semantics). Run PROMPT B in the main worktree after all PRs merge.

**If the prompt and the wave plan ever disagree**: the wave plan wins. The recurring prompt is operational scaffolding; the wave plan is the spec.
