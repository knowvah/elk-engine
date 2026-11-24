<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: docs say the hand-off is done

## Context

[D4](../decisions.md#d4-docs-scope). The ruling names `docs/architecture/elk-json.md` "sections 5 and 6". The stale
text is at §5 (`:155-158`) and in the §7 notes (`:194-197`). §6 (`:160-169`) describes the `EcoreEMap` bucket order
that causes the reorder, so the reorder note goes there.

## Read-set

`docs/architecture/elk-json.md:128-200`, `docs/conformance.md:2563-2578`, and T1's D3 journal row.

## Steps

1. §5, the "Parse inputs (J7 amendments)" bullet: parse inputs strip `resolvedAlgorithm` only. The two layered keys
   were stripped until #63, which regenerated the refs with layered registered in the round trip test.
2. §6, the `EcoreEMap.map()` bullet: add one sentence. Two more properties on an element can change its EMap capacity
   and so the exported order of its existing `layoutOptions`. The #63 regeneration showed this (N objects across the 4
   refs), and the port reproduces it.
3. §7 notes: replace the "`STRIP_KEYS` shrinks in mission 7h …" bullet with one saying the hand-off is done (#63) and
   `STRIP_KEYS` holds `resolvedAlgorithm` only. Check the §7 table row for `npx vitest run test/golden/json-roundtrip.test.ts test/graph-json`
   against T1's counts, and correct it if the counts differ.
4. `docs/conformance.md:2576-2577`: "closed by mission 7h" becomes "closed by issue #63 (parse refs regenerated)". Do
   not touch `:724-730` (D4).
5. `npx prettier --check` on both files, then `npm run docs:build`. Commit as
   `docs(elk-json): record the parse ref strip list hand-off`, with footer `Refs: #63`.

## Write-set

`docs/architecture/elk-json.md`, `docs/conformance.md` (that one bullet), and the journal.

## Acceptance criteria

- Given the docs, when grepped for `until mission 7h` and `STRIP_KEYS shrinks`, then nothing matches in
  `docs/architecture/elk-json.md`.
- Given `docs/conformance.md`, then only the J6 bullet changed (`git diff --stat` shows one hunk).
- Given `npm run docs:build`, then it exits 0.

**Observability:** N/A. **Rollback:** Reversible.
