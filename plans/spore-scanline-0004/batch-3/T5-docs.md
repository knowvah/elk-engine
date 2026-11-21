<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5: conformance docs for patch 0004

## Context

Issue #111 work item 6 and decision [D7](../decisions.md#d7). `0004` is the first **carried upstream fix** in the patch
series; 0001-0003 are seams paired with TS seams. The docs must say which is which, and that `0004` is dropped when the
pin moves past the PR's merge (maintainer convention of 2026-11-13). Inputs from the journal: patch file name and sha256
(T1), changed refs with counts (T2), sweep evidence (T4, if done; otherwise leave a sentence T6 fills).

## Steps

1. `docs/conformance.md` § 1 (`Patch series semantics`, line ~73): "three patches" → "four patches"; add a `0004` row to
   the table: Patch = file name (issue #111); Effect = the walk change in one or two sentences; Paired TS seam = "None: a
   carried upstream fix (eclipse-elk/elk#1247), ported at its site, `src/alg/common/spore/ScanlineOverlapCheckHandler.ts`
   ([carried upstream patches](#carried-upstream-patches))".
2. The sentence after the table ("Patches exist only to add narrowly scoped seams … Patch `0002` is the one exception")
   and § 4's first sentence ("always paired with a TS seam"): name the second kind, carried upstream fixes.
3. New subsection `### Carried upstream patches {#carried-upstream-patches}` at the end of § 1 (before § 1a): one row per
   carried patch: `0004`, PR https://github.com/eclipse-elk/elk/pull/1247 (fixes #1246; fork knowvah/elk#19 / #26), head
   `1bf1da95561140eb78d70d5dd747dd46803ead2a`, what changes, refs moved (T2's list with row counts), the policy line:
   carried until the pin moves past the merge, then dropped in that pin-move mission.
4. Grep tracked `docs/` and `docs-site/` files for other patch-count or patch-list prose (`three patches`, `0001-0003`,
   `0003-alg.test`) and update it; `docs/parity-report.md` stays (D6). Journal each line touched.
5. `npx prettier --check docs/conformance.md`, `npm run docs:build`, `npx vitest run test/docs test/architecture`.

## Write-set

`docs/conformance.md`; any other tracked doc found in step 4 (journal each). Not `docs/parity-report.md`, not `plans/`.

## Read-set

`docs/conformance.md:38-90` (§ 1), `:349-377` (§ 4); the journal rows T1, T2, T4; `gh issue view 111`.

## Acceptance criteria

- Given § 1, when read, then it says four patches and lists 0001-0004, with `0004` marked as a carried upstream fix.
- Given the new subsection, when read, then it names the PR link, head sha, the change, the refs moved, and the drop rule.
- Given `npm run docs:build` and `test/docs`, when run, then both pass.

## Observability

N/A — no new observable operations.

## Rollback

Reversible: revert the doc edits.
