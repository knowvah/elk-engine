<!-- SPDX-License-Identifier: EPL-2.0 -->

# T14 — Recursion, coverage, `unreached.md`

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T14): probe packing recursion and close coverage` · Scratch: `$TMPDIR/alg-packing/T14/`

## Context

Mission 8c, PK6, stops 6-8. Sites: landed `src/alg/common/spore/DepthFirstCompaction.ts` (four recursive methods), `GrowTreePhase.growAt`,
`MinSTPhase.addNode`. AC6 recipe: convert only a site that overflows in TS where the oracle completes, to an explicit-stack loop
proven against a verbatim recursive reference on random trees (alg-common T7 precedent).

## Task

1. Probe both spore algorithms on a 2,000-node chain (the T2 row) in TS under `node --jitless` and without; record the depth at which
   each site overflows in TS and in the oracle (default `-Xss`) up to 16,000. Convert per AC6 only where required; beyond 2,000 file a
   `follow-up` issue with the thresholds (8b #70 precedent).
2. Run `npx vitest run --coverage` scoped to the three bundles (orchestrator runs the full gate); close branch gaps with row-driven tests;
   each arm neither reached nor proven dead → `unreached.md` and a journal `U` row with its Java line.
3. Write `plans/alg-packing/unreached.md` in the `plans/alg-force-disco/unreached.md` shape.

## Write-set

New `*.test.ts` files under `src/alg/{rectpacking,spore,topdownpacking}/`, an AC6 conversion in `src/alg/spore/p2processingorder/MinSTPhase.ts`,
`src/alg/spore/p3execution/GrowTreePhase.ts` or `src/alg/common/spore/DepthFirstCompaction.ts` (with its verbatim reference test) only
if the probe requires it, `plans/alg-packing/unreached.md`.

## Read-set

`src/alg/{rectpacking,spore,topdownpacking}/**`, `src/alg/common/spore/DepthFirstCompaction.ts`, `plans/alg-common/decision-journal.md` (T7 AC6),
`plans/alg-force-disco/unreached.md`, `decisions.md#pk6--recursion`.

## Acceptance criteria

- Given a 2,000-node chain, then both spore algorithms complete in TS (also `--jitless`) and in the oracle, with equal output.
- Given a converted site, then its explicit-stack form equals the verbatim recursive reference on ≥ 1,000 random trees.
- Given the three bundles, then branch coverage is ≥ 90 % each, every remaining arm is a `U` row in `unreached.md`, and "neither reached nor proven dead" is empty.

## Observability / Rollback

N/A — no new observable operations. Reversible.
