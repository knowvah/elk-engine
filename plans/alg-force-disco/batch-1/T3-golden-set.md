<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3 — The `force-disco` golden set

**Agent:** build-engineer (sonnet) · **Commit:** `test(T3): add the force-disco golden set` · Scratch: `$TMPDIR/alg-force-disco/T3/`

## Context

Mission 8b, FD2. `tools/oracle/regen-goldens.sh` selects a set with a `case`; the `trees` arm is the template.

## Task

1. Add `--set force-disco` to the script (usage text, `die` text, the `case`), reusing `LAYERED_JVM_FLAGS`.
2. Write `test/golden/force-disco.json` and `test/golden/force-disco-inputs/*.json`, the option sets of FD2, one factor at a time.
   Every input names `elk.algorithm` or its entry has `retarget`.
3. Check `uptime`; run the regeneration. Check every ref's `layoutOptions.resolvedAlgorithm` against its entry and journal the count.
4. Run the default, `algorithms`, `layered` and `trees` sets: `git diff --exit-code test/golden/refs/` must be clean.

## Write-set

`tools/oracle/regen-goldens.sh`, `test/golden/force-disco.json`, `test/golden/force-disco-inputs/**`, `test/golden/refs/elk-force-disco/**`.

## Read-set

`tools/oracle/regen-goldens.sh`, `test/golden/trees.json`, `test/golden/trees-inputs/*`, `decisions.md#fd2-the-force-disco-golden-set`,
`tools/melk/sources/{Force,Stress,Disco,Polyomino}.melk`.

## Acceptance criteria

- Given the regeneration, when run twice, then the refs are byte-identical.
- Given each ref, then `resolvedAlgorithm` equals its entry's algorithm.
- Given the four landed sets, then their refs are byte-identical to the base.

## Observability / Rollback

N/A — no new observable operations. Reversible.
