#!/bin/bash
# verify-e2e.sh

if [ "$AGENT_MODE" = "true" ]; then
  # Structured Agentic Output
  npx bddgen --config Testing/e2e/playwright.config.ts && npx playwright test --config Testing/e2e/playwright.config.ts --project=chromium --reporter=json > e2e-report.json
  EXIT_CODE=$?
  
  if [ $EXIT_CODE -ne 0 ]; then
    node -e "
      try {
        const report = require('./e2e-report.json');
        const failedSpecs = [];
        
        // Very basic json traversal to find failed tests
        if (report.errors && report.errors.length > 0) {
            failedSpecs.push(...report.errors);
        }
        
        const traverse = (suite) => {
            if (suite.specs) {
                suite.specs.forEach(spec => {
                    if (!spec.ok) {
                        failedSpecs.push({ title: spec.title, file: spec.file, error: spec.tests[0]?.results[0]?.error?.message || 'Unknown Error' });
                    }
                });
            }
            if (suite.suites) {
                suite.suites.forEach(traverse);
            }
        };
        
        if (report.suites) report.suites.forEach(traverse);
        
        console.log(JSON.stringify({ status: 'FAIL', code: $EXIT_CODE, failed_specs: failedSpecs }, null, 2));
      } catch (e) {
        console.log(JSON.stringify({ status: 'FAIL', code: $EXIT_CODE, parse_error: e.message }));
      }
    "
  else
    echo '{"status": "SUCCESS", "message": "All E2E tests passed."}'
  fi
  exit $EXIT_CODE

else
  # Human-readable output
  echo "Starting E2E Verification..." > e2e-log.txt
  date >> e2e-log.txt
  npx bddgen --config Testing/e2e/playwright.config.ts && npx playwright test --config Testing/e2e/playwright.config.ts --project=chromium --reporter=list >> e2e-log.txt 2>&1
  EXIT_CODE=$?
  echo "Finished E2E Verification with status $EXIT_CODE" >> e2e-log.txt
  date >> e2e-log.txt
  exit $EXIT_CODE
fi
