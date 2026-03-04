# .antigravity/tasks/breakouts/02-react-loop-optimization.md

**Status:** Pending **Priority:** HIGH

## 🎯 Objective

Address the critical bottleneck in the "Observation" phase of the ReAct
(Reason + Act) loop by transitioning from human-readable terminal outputs to
deterministic, machine-readable data structures.

## 🛠️ Execution Steps

### 1. Implement Machine-Readable CI Output

**Target:** `scripts/verify-e2e.sh`, `scripts/verify-architecture.sh`, and CI
pipeline config.

- Suppress verbose stack traces and human-centric ANSI color codes that saturate
  the AI agent's context window.
- Enforce the `AGENT_MODE=true` environment variable.
- Configure all test runners (Vitest, Playwright) and linters to output results
  in strictly typed JSON formats when this mode is active.
- Update bash scripts to utilize tools like `jq` to isolate and output the exact
  failure payloads the agent needs to reason about.

### 2. Inject TypeScript Error Middleware

**Target:** Local TS compiler execution scripts.

- Introduce a custom error formatting script acting as a middleware layer to
  intercept standard TypeScript compiler outputs.
- Flatten complex compiler errors regarding deeply nested generic types
  (specifically within `src/shared/types/`).
- Configure the middleware to present the agent with a direct, localized diff of
  the expected versus received type interface.

### 3. Implement the Ralph Loop "Stop Hook"

**Target:** External control scripts / IDE task runner wrapper.

- Integrate the "Ralph Loop" paradigm by establishing an external control script
  that intercepts premature exit signals from the agent.
- The script MUST verify the presence of a predefined "Completion Promise"
  (e.g., `{"status": "SUCCESS", "message": "<promise>COMPLETE</promise>"}`)
  alongside a zero exit code from all test suites.
- If the required completion payload is missing, the system must forcibly reload
  the original prompt and initiate a new round of iteration to guarantee
  absolute mathematical verification.

## 🚦 Verification (Completion Promise)

The agent may only mark this task as complete when:

1. Executing `verify-e2e.sh` with a failing test intentionally produces a parsed
   JSON payload with the exact file path and error, rather than standard
   Playwright HTML/terminal output.
2. The Ralph Loop script successfully intercepts and blocks a dummy task exit
   that lacks the correct completion promise.
