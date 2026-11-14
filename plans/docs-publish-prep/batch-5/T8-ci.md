<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8: CI wiring

**Agent:** orchestrator. **Decisions:** DP3, DP5, DP8. **Commit:** `ci: typedoc, link check and pack rehearsal in ci`.

## Write-set

- `.github/workflows/ci.yml`: after `npm run docs:build` (which now runs `docs:api`, installing `tools/typedoc`), add
  `npm run docs:linkcheck`; after `coverage` (which runs the example tests), add `npm run publish:check`,
  `npm run pack:smoke`, `npm run pack:smoke -- --entry test/public-api/candidate-index.ts`. Comment each step with what it
  guards, in the file's style. If `tools/typedoc`'s `npm ci` needs the npm cache, add its lock to `setup-node`'s
  `cache-dependency-path`.
- `.github/workflows/docs.yml`: nothing unless `docs:build` needs a change to install `tools/typedoc` there; journal
  either way.

## Read-set

- `.github/workflows/ci.yml`, `.github/workflows/docs.yml`; `package.json` scripts (T2, T5, T6, T7)

## Steps

1. Edit; check with `actionlint` if available, else journal that only a local dry reading was possible.
2. Run the CI command sequence locally in order (`npm ci` excluded): format, typecheck, complexity, coverage, docs:build,
   docs:linkcheck, publish:check, both pack:smoke modes. Journal pass/fail and wall time of each new step.

## Acceptance criteria

- Given `ci.yml`, when read, then the docs build, link check, example tests (inside coverage), publish check and both
  rehearsal modes run on every PR, with read-only permissions as before.
- Given the local run of the same sequence, when it finishes, then every step exits 0.

**Observability:** CI step timings are journaled as the baseline. **Rollback:** Reversible.
