#!/bin/bash
# scripts/ralph-loop.sh

echo "Running validation suites..."
AGENT_MODE=true npm run verify-architecture
ARCH_EXIT=$?

node scripts/tsc-agent.cjs
TSC_EXIT=$?

AGENT_MODE=true scripts/verify-e2e.sh
E2E_EXIT=$?

if [ $ARCH_EXIT -ne 0 ] || [ $TSC_EXIT -ne 0 ] || [ $E2E_EXIT -ne 0 ]; then
  echo "Validation failed. Keep iterating."
  exit 1
fi

# Assert completion promise
if [ ! -f "agent-state.json" ]; then
    echo "ERROR: Ralph Loop intercepted premature exit. Missing agent-state.json."
    echo "You MUST emit {\"status\": \"SUCCESS\", \"message\": \"<promise>COMPLETE</promise>\"} to agent-state.json before task is considered complete mathematically."
    exit 1
fi

STATE=$(cat agent-state.json)
if [[ "$STATE" != *"<promise>COMPLETE</promise>"* ]]; then
    echo "ERROR: Ralph Loop intercepted premature exit. Invalid promise in agent-state.json."
    exit 1
fi

echo "Ralph Loop Validated. Task Complete."
exit 0
