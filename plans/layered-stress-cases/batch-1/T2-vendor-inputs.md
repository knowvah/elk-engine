<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: vendor the two stress models with manifest rows (ruling item 3, D4)

## Context

The suites read vendored copies under `test/golden/inputs/compound/` by default, and the models checkout only under
`PIPELINE_SUITES_FULL=1` (`test/helpers/layout-test-sources.ts:21-40`). The two models are not vendored yet.
`test/golden/algorithm-refs.test.ts:525-529` asserts that the inputs manifest lists exactly the known inputs.

## Read-set

`test/corpus/manifest.json` (pinned commit `ac5af2ba511c0037e4f347e8bd91f013950951c7`),
`test/golden/inputs/manifest.json`, `test/golden/algorithm-refs.test.ts:476-530`,
`$ELK_MODELS_DIR` (default `../../eclipse-elk/elk-models`).

## Write-set

- Create `test/golden/inputs/compound/tickets/layered/665_includeChildrenDoesntStop.elkt`.
- Create `test/golden/inputs/compound/examples/hierarchy/hierarchicalLayoutMixing.elkt`.
- Modify `test/golden/inputs/manifest.json`: two `files` rows, sha256 hex. Place them next to the neighbouring
  `compound/` rows.
- Modify `test/golden/algorithm-refs.test.ts`: a new two-entry list joined into the expected union, the title's count,
  and the `:478-484` comment (D4).

## Steps

1. `git -C "$ELK_MODELS_DIR" rev-parse HEAD` must give `ac5af2ba…`. Otherwise halt (stop 6). Copy the two files byte
   for byte (`cp`, not an editor), then `shasum -a 256` both the copies and the originals. Check that the copies are
   untouched by prettier: `.elkt` is not a prettier type, and `npx prettier --check` on them reports nothing.
2. Add the manifest rows and the test list. Do not touch `LAYERED_COMPOUND_INPUTS` (D4).
3. Check that no other suite's case count changes. Before and after the copy, list the files that every runner suite's
   sources resolve under the vendored root (a one-off `tsx` script in `$TMPDIR` over `listGraphFiles`). The only change
   allowed is `Issue665Test`/`Issue700Test`, which still filter through `STRESS_PENDING` until T4. Journal the result.

## Acceptance criteria

- Given the copies, when hashed, then each sha256 equals the original's at `ac5af2ba` and its manifest row.
- Given the updated test, when `npx vitest run test/golden/algorithm-refs.test.ts` runs, then it passes, and the
  manifest's key set equals the expected union, which now includes the two paths.
- Given the hold-back still in place, when `npx vitest run src/alg/layered/issues/Issue665Test.test.ts
  src/alg/layered/issues/Issue700Test.test.ts test/helpers/stress-pending.test.ts` runs, then the result is unchanged
  (0 + 1 skipped, 2 + 2 passing).

## Observability

N/A. Evidence: the two hashes in the journal.

## Rollback

Reversible: revert the commit.
