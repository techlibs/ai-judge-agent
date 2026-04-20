#!/usr/bin/env bash
# Run bun tests with isolation for files that mock @/lib/ipfs/client.
#
# Why: bun 1.3.x has an ESM registry linker bug where `mock.module()`
# targeting `@/lib/ipfs/client` leaves the module in an unlinked state,
# causing subsequent test files that statically import `uploadJson` to
# fail with: SyntaxError: Export named 'uploadJson' not found.
# Running the affected files in separate bun processes sidesteps the
# cross-file module-registry contamination without changing production
# code or test assertions.
set -euo pipefail

# Test files that either mock @/lib/ipfs/client or import it and get
# poisoned by a prior file's mock. Each runs in its own bun process.
ISOLATED_FILES=(
  src/__tests__/lib/orchestrator.test.ts
  src/__tests__/lib/workflow.test.ts
  src/__tests__/lib/publish-chain.test.ts
  src/__tests__/api/evaluate-finalize.test.ts
  src/__tests__/api/evaluate-dimension.test.ts
  src/__tests__/api/evaluate-trigger.test.ts
  src/__tests__/api/proposals.test.ts
)

# Compute the set of test files that are NOT isolated. bun test takes
# positional filename-substring patterns, so we pass explicit paths.
ALL_FILES=$(find src/__tests__ -name '*.test.ts' | sort)
NON_ISOLATED=()
while IFS= read -r f; do
  skip=0
  for iso in "${ISOLATED_FILES[@]}"; do
    if [ "$f" = "$iso" ]; then skip=1; break; fi
  done
  [ "$skip" = "0" ] && NON_ISOLATED+=("$f")
done <<< "$ALL_FILES"

echo "==> Running ${#NON_ISOLATED[@]} non-isolated test files"
bun test "${NON_ISOLATED[@]}"

for f in "${ISOLATED_FILES[@]}"; do
  echo "==> Running $f (isolated)"
  bun test "$f"
done
