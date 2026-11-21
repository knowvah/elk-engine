<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: regenerate the refs on the patched oracle

## Context

Issue #111 work item 4. The rebuilt oracle (T1) changes `ScanlineOverlapCheck` only. Decisions
[D3](../decisions.md#d3) (what to rerun) and [D4](../decisions.md#d4) (what may change). Refs are regenerated only by
script and journaled with the patch id (AD-5, AD-13); a change no D4 row explains is stop 3.

## Steps

1. Re-grep `tools/vectors/*.java tools/oracle/**/*.java` for `OverlapRemovalLayoutProvider|ScanlineOverlapCheck|
   sporeOverlap`; add any new layout-running hit to the rerun list.
2. Copy the current refs to `$TMPDIR/spore-scanline-0004/refs-before/` (for the row comparison).
3. `uptime` (wait above 12). One detached run under `nice -n 10`, each step's exit echoed, log ending `exit $?`:
   - `tools/vectors/alg-common-vectors.sh "$TMPDIR/spore-scanline-0004/vec"` then copy `alg-common.json` over
     `test/golden/refs/java/alg-common.json` (the script's documented flow; check its usage line);
   - `tools/vectors/spore-layout-vectors.sh "$TMPDIR/spore-scanline-0004/vec"` then copy `spore-layout.json` likewise;
   - `tools/oracle/regen-goldens.sh --set <s>` for default, algorithms, layered, trees, force-disco, packing, examples;
   - `tools/oracle/regen-elkt-refs.sh`, `regen-elkj-refs.sh`, `regen-parse-refs.sh`, `regen-generated.sh`.
4. Row comparison (scratch node script, not committed): for each changed file, list changed keys/rows. Expected per D4:
   ten `_meta.json` `patches` only; `alg-common.json` only `kind: "scanline"` rows of `spore` (≤ 8); `spore-layout.json`
   only `sporeOverlap` rows (+ derived header summaries); `elk-packing/sporeOverlap--*.json` only. Every
   `sporeCompaction` row and every other ref byte-identical (`git diff --stat`).
5. Journal one `regen` row per script: patch id 0004, oracle stamp, platform (`Darwin arm64`, JDK 21.0.1), changed rows
   by name and count (e.g. "scanline-random-n12: 2 calls added"), and the check result.

## Write-set

`test/golden/refs/java/alg-common.json`, `test/golden/refs/java/spore-layout.json`, `test/golden/refs/elk-packing/*`,
the ten `test/golden/refs/*/_meta.json`, the journal. Any other path under `test/golden/refs/` or `test/corpus/generated/`
written by a script and changed: stop 3.

## Read-set

`tools/vectors/alg-common-vectors.sh:1-12`, `tools/vectors/spore-layout-vectors.sh:1-16`,
`tools/vectors/AlgCommonVectors.java:70-80,600-720` (scanline rows), `tools/oracle/regen-goldens.sh:1-25`,
`plans/text-sizing-seam/decision-journal.md` row T5 regen (precedent format).

## Acceptance criteria

- Given the patched oracle, when every D3 script has run, then each exits 0 and the log ends `exit 0`.
- Given the before/after refs, when compared row by row, then every change lies inside D4's table.
- Given the ten `_meta.json`, when diffed, then only the `patches` array changed, gaining the 0004 file name.
- Given `test/corpus/generated/`, when diffed, then it is identical.

## Observability

N/A — no new observable operations.

## Rollback

Reversible: `git checkout <base> -- test/golden/refs/`.
