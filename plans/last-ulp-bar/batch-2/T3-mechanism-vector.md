<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: mechanism vector

**Agent:** `claude` (sonnet) or the orchestrator. **Budget:** 80 min (stop 11).

## Context

[D4](../decisions.md#d4-mechanism-and-oracle-evidence-a-new-jvm-vector): the mechanism of each last-ulp entry and the
oracle layout of E1 must be committed oracle evidence, so the pinning test (T4) needs no JVM. Precedent: the `Math.log`
against `StrictMath.log` rows of `tools/vectors/ForceVectors.java:1670-1700`. The recorder only calls JDK and ELK APIs
and records results; it embeds no ELK algorithm.

## Task

1. `tools/vectors/LastUlpVectors.java`, header in the style of `RadialVectors.java:1-30` (origin, purpose, Run line, file
   contract, re-record steps). It reads `tools/vectors/last-ulp-inputs.txt` and writes one strict-JSON file
   (`{ jdk, oracle, rowCounts, rows }`, one compact row per line, trailing newline):
   - `math` rows: `{ id, group: "math", entry, fn, x, cold, warm, strict }`, all 16-hex-digit bits
     (`Double.doubleToLongBits`, the canonical form of #72). `cold` is the first `Math.<fn>` call of a fresh method;
     `warm` is after a loop of at least 200,000 calls over the inputs with a live sink; `strict` is `StrictMath.<fn>`.
   - `layout` rows for E1: the oracle's export of `test/golden/inputs/tests/layered/splines/sloppy_overlaps_2.elkt`
     retargeted to `org.eclipse.elk.radial`, variant `default`, laid out as `tools/oracle/harness/CaseRunner.java` does
     (reuse the harness classes if they are on the classpath, otherwise mirror and cite it), for run 1 and after a warm-up
     of repeated layouts (push-forward count), embedded as JSON, with `runsAgree` and the `childAreaHeight` of each.
2. `tools/vectors/last-ulp-vectors.sh` in the shape of `radial-vectors.sh` (same JVM flags, `java-program.sh`,
   `vector-cache.sh` if the others use it).
   Three fitness tests apply: `test/architecture/elk-pin.fitness.test.ts` (no 40-hex literal in the `.java`; read the
   pin with `elkCommit()` and pass `-Delk.commit=` from the script, as the other recorders do),
   `canonical-nan.fitness.test.ts` (no `doubleToRawLongBits`) and `spdx-header.fitness.test.ts`. Run all three.
3. Run it into a scratch dir (`ELK_VECTORS_CACHE=off`) twice; the two outputs must be byte-identical, otherwise journal
   which rows differ (the cold/warm split is expected to be stable per run). Copy to
   `test/golden/refs/java/last-ulp.json`.
4. Report: the counts of `math` rows where `warm != strict` and where `cold != strict` per entry and function; whether
   any E1 layout run gives `"2561.1171089266686"` (stop 3 if none); recorder wall time.

## Write-set

`tools/vectors/LastUlpVectors.java`, `tools/vectors/last-ulp-vectors.sh` (new), `test/golden/refs/java/last-ulp.json`
(new, by the script only).

## Read-set

`tools/vectors/ForceVectors.java:1660-1705`, `tools/vectors/RadialVectors.java:1-80` and its `hex`/row writers,
`tools/vectors/radial-vectors.sh`, `tools/vectors/java-program.sh`, `tools/oracle/harness/CaseRunner.java`, T1's input
file and `audit` rows.

## Interface contract (output, consumed by T4)

`last-ulp.json`: `rows[]` with `group` `math` (`entry`, `fn`, `x`, `cold`, `warm`, `strict`: 16 lowercase hex digits) or
`layout` (`entry`, `run`: `"cold"` | `"warm"`, `output`: the oracle export as JSON). `rowCounts` per group.

## Acceptance criteria

- Given two cold runs of the script, when their outputs are compared, then they are byte-identical (or the journal names
  the differing rows and why).
- Given the `math` rows, when counted, then the journal states per entry and function how many differ from `StrictMath`
  cold and warm (planning expectation for E2 warm: 9 `cos`, 5 `sin`; E1 warm: the one `sin` input).
- Given the `layout` rows, when read, then each holds the oracle export and its `childAreaHeight`, and `runsAgree` is
  recorded.
- Given `git diff --stat <base> -- test/golden/refs/`, when run, then only `last-ulp.json` is added.

**Observability:** N/A — no new observable operations. **Rollback:** Reversible (delete the three new files).
