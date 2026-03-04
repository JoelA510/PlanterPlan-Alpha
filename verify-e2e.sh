#!/bin/bash
echo "Starting E2E Verification..." > e2e-log.txt
date >> e2e-log.txt
npx playwright test --project=chromium --reporter=list >> e2e-log.txt 2>&1
echo "Finished E2E Verification with status $?" >> e2e-log.txt
date >> e2e-log.txt
