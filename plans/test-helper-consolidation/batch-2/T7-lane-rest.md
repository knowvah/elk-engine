<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7: lane rest of `src/alg/layered/**` and `test/corpus/`

## Context

Issue #46 item 1, call-site half. Directories: `src/alg/layered/*.test.ts` (top level, **except** `ElkLayered.test.ts`,
which is T4's), `p1cycles/`, `p2layers/`, `p4nodes/`, `p5edges/` (with `splines/`, `orthogonal/`), `components/`,
`issues/`, and `test/corpus/*-sweep.test.ts`. Expected work at planning: groups `fdf72abd` (top-level sites), `f40c2912`
(routing/pipeline/labels vectors and the routing sweep), `77b17ac0`, `9e63be62`, `c37cfd1c` (vectors + sweep pairs),
`1e022de0`, `658bad7a`, `6aadd7d8`, `378b9fff`, `47816ebe`, `d8ceccce`/`34aa9fa0` members here, and the nine `CALLERS`
tables. Decision [D1](../decisions.md#d1-move-identical-code-only-never-substitute-a-broader-helper) and its `CALLERS`
exception.

## Write-set

- Only the `*.test.ts` files in the directories above that `inventory.md` maps to an export

## Read-set

- `inventory.md` rows for lane `T7`; the T1 helpers, `test/helpers/layered-spline-callers.ts`
- Each file in the write-set, around the mapped line; the `calls` rows those `.sites` files replay
  (`test/golden/refs/java/layered-routing-steps.json`, filtered by each file's row prefix)

## Steps

1. `npx vitest run <the lane's mapped files> --reporter=json --outputFile.json=$TMPDIR/t7-before.json` (the sweep
   files with their `*_SWEEP_DIR=/nonexistent`, as the gates run them).
2. `CALLERS` proof before editing a `.sites.test.ts` file: list the `calls` keys its rows name; each must be a key of
   the file's current table; for `Rectangle.sites`, every `Rectangle.union` row's second argument is an `LNode`. Put
   the lists in the report. If a check fails, keep that table (stop 6).
3. Apply the mapped rows as T5 step 2 does. `LayeredRoutingVectors.test.ts` builds its `CALLERS` by spreading the four
   class tables; its `isBetween` entries and anything else not in a class table stay local.
4. Rerun step 1 to `t7-after.json`; per file, counts, titles and statuses must match.
5. `npm run typecheck`; `npx prettier --check` the changed files. Report as T5 does, plus step 2's lists.

## Acceptance criteria

- Given each mapped row, when the lane ends, then the file imports the export and holds no local copy.
- Given a `.sites.test.ts` file on a shared caller table, when its rows' keys are listed, then they are a subset of its
  old table and the `Rectangle.union` rows pass only `LNode`s.
- Given `t7-before.json` and `t7-after.json`, when compared per file, then counts, titles and statuses are equal.
- Given `git diff`, when filtered to lines containing `expect`, then nothing changed outside whole moved objects.

## Observability / rollback

N/A — test code only. Reversible.
