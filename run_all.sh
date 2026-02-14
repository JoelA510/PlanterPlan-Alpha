#!/bin/bash
set -e
echo "Starting E2E Tests..."
date
ls -l e2e/journeys
npx playwright test e2e/auth.spec.ts e2e/journeys/template-to-project.spec.ts e2e/journeys/task-management.spec.ts e2e/journeys/team-collaboration.spec.ts e2e/security.spec.ts e2e/theme-integrity.spec.ts --project=chromium --reporter=list > script_output.txt 2>&1
ls -l script_output.txt
cat script_output.txt
echo "Script Finished."
