<!-- SPDX-License-Identifier: EPL-2.0 -->

# T15 — Docs, roadmap, notes, squash

**Agent:** orchestrator; prose may go to technical-writer (sonnet) · **Commit:** `docs(T15): document the packing algorithms` then the PK12 squash

## Task

1. `docs/architecture/alg-packing.md` (design and runbook in the `alg-force-disco.md` shape: recorders, goldens, sweep, PK3 `GridElkNode`
   with the registry change, PK4 jitter policy, PK7 outcome); `docs/conformance.md` § Rectpacking, spore and topdownpacking (counts,
   kept quirks, known divergences, classified sort rows if any, upstream typos if any); `port-map.md` status rows; `elkgraph-model.md`
   §5/§9 updated to say how 8c resolved `GridElkNode` (append-style edits to those two lines only).
2. Append `## Revision <end date> (alg-packing)` to `plans/roadmap.md` (never edit an earlier line): row 8c done, evidence, decisions
   taken during the run, divergences, hand-offs (8x: `NodeMicroLayoutTest`, `PlainJavaInitializationTest`, `ElkReflectTest` now
   unblocked; row 9: every in-scope provider registered in `ts-layout-compare.ts`), open `needs-ruling`/`follow-up` issues, audit points.
3. `.agent-notes/alg-packing.md` for anything novel; the README's mission summary (exit items → journal rows, as 8b's README).
4. Mission-end gates of the README (queue gates 1–6, vector re-records `cmp`-identical cold, golden regeneration of every set,
   `melk:generate` byte-identity, Java baseline); journal each result.
5. PK12: `git tag alg-packing/pre-squash`, `git reset --soft <base>`, one commit
   `feat(packing): port rectpacking, spore and topdownpacking (8c)` with a body and `Refs: #39`
   (`git -c commit.gpgsign=false commit -F <file>`); verify one commit on the base and a clean tree.

## Acceptance criteria

- Given the mission-end gates, then every one is green and journaled.
- Given `plans/roadmap.md`, then only an appended section differs from the base.
- Given the branch, then exactly one commit sits on the base, tagged history under `alg-packing/pre-squash`, footer `Refs: #39`.

## Observability / Rollback

N/A — no new observable operations. Reversible (one commit on the queue branch).
