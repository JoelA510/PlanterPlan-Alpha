#!/bin/bash
# verify-architecture.sh
# Fails the build if AI agents or developers introduce banned architectural patterns.
# Integrated into .github/workflows/ci.yml

set -euo pipefail

echo "🔍 Running Architectural & NIH Sanity Checks..."
EXIT_CODE=0

# ---------------------------------------------------------------------------
# 1. Check for Type Masking in production code (any, unknown, as type)
#    Excludes: test files, node_modules
# ---------------------------------------------------------------------------
if grep -rnE "(as any|as unknown|: any\b)" src/ \
    --include='*.ts' --include='*.tsx' \
    --exclude='*.test.ts' --exclude='*.test.tsx' \
    --exclude-dir=tests --exclude-dir=test --exclude-dir=node_modules 2>/dev/null; then
    echo ""
    echo "❌ ERROR: Type masking ('any', 'as unknown') detected in production code."
    echo "   Fix: Use Zod parsing, proper TypeScript narrowing, or vi.mocked() in tests."
    EXIT_CODE=1
fi

# ---------------------------------------------------------------------------
# 2. Check for FSD Upward Dependencies (Features importing from App)
# ---------------------------------------------------------------------------
if grep -rnE "from ['\"]@/app/" src/features/ \
    --include='*.ts' --include='*.tsx' 2>/dev/null; then
    echo ""
    echo "❌ ERROR: FSD Upward Dependency violation."
    echo "   Fix: Features cannot import from app/. Move constants/contexts to shared/."
    EXIT_CODE=1
fi

# ---------------------------------------------------------------------------
# 3. Check for FSD Lateral Dependencies (Features importing sibling features)
# ---------------------------------------------------------------------------
LATERAL_FOUND=0
for feature_dir in src/features/*/; do
    if [ -d "$feature_dir" ]; then
        feature_name=$(basename "$feature_dir")
        # Search for imports pointing to other features (not self)
        if grep -rnE "from ['\"]@/features/" "$feature_dir" \
            --include='*.ts' --include='*.tsx' 2>/dev/null \
            | grep -v "features/${feature_name}" >/dev/null 2>&1; then
            echo ""
            echo "⚠️  FSD Lateral violation in ${feature_name}/:"
            grep -rnE "from ['\"]@/features/" "$feature_dir" \
                --include='*.ts' --include='*.tsx' 2>/dev/null \
                | grep -v "features/${feature_name}" || true
            LATERAL_FOUND=1
        fi
    fi
done
if [ "$LATERAL_FOUND" -eq 1 ]; then
    echo ""
    echo "❌ ERROR: FSD Lateral Dependency violations found."
    echo "   Fix: Sibling features cannot import from each other. Lift to widgets/ or pages/."
    EXIT_CODE=1
fi

# ---------------------------------------------------------------------------
# 4. Check for Raw Date Math (NIH / Bug Prevention)
#    Excludes: date-engine (the centralization point), test files
# ---------------------------------------------------------------------------
if grep -rnE "(new Date\(|\.toISOString\(\))" src/ \
    --include='*.ts' --include='*.tsx' \
    --exclude='*.test.ts' --exclude='*.test.tsx' \
    --exclude-dir=date-engine --exclude-dir=tests --exclude-dir=test 2>/dev/null; then
    echo ""
    echo "❌ ERROR: Raw Date mathematics detected in production code."
    echo "   Fix: Use src/shared/lib/date-engine helpers for timezone safety."
    EXIT_CODE=1
fi

# ---------------------------------------------------------------------------
# 5. Check for Raw Fetch / Supabase SDK Bypassing
# ---------------------------------------------------------------------------
if grep -rnE "rawSupabaseFetch\(" src/ \
    --include='*.ts' --include='*.tsx' 2>/dev/null; then
    echo ""
    echo "❌ ERROR: NIH API Client (rawSupabaseFetch) detected."
    echo "   Fix: Use the official @supabase/supabase-js SDK."
    EXIT_CODE=1
fi

# ---------------------------------------------------------------------------
# 6. Check for SPA Router Bypassing (DOM Hacks)
#    Excludes mailto: links (legitimate use)
# ---------------------------------------------------------------------------
if grep -rnE "window\.location\.href\s*=" src/ \
    --include='*.ts' --include='*.tsx' 2>/dev/null \
    | grep -v "mailto:" >/dev/null 2>&1; then
    echo ""
    echo "❌ ERROR: SPA Architecture break detected."
    grep -rnE "window\.location\.href\s*=" src/ \
        --include='*.ts' --include='*.tsx' 2>/dev/null \
        | grep -v "mailto:" || true
    echo "   Fix: Use react-router-dom 'useNavigate' instead of window.location.href."
    EXIT_CODE=1
fi

# ---------------------------------------------------------------------------
# Results
# ---------------------------------------------------------------------------
echo ""
if [ "$EXIT_CODE" -eq 0 ]; then
    echo "✅ Architecture verified. No structural violations found."
else
    echo "🛑 BUILD FAILED. Remediate the architectural violations above."
fi

exit $EXIT_CODE
