<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: JVM encoders to the canonical form

**Agent:** `claude` (sonnet). **Budget:** 60 min (stop 11).

## Context

Issue #72, ruling #53: every layout comparison encodes NaN as `Double.doubleToLongBits` (`7ff8000000000000`); every
other value keeps its raw IEEE bits, which `doubleToLongBits` guarantees (Javadoc: it differs from
`doubleToRawLongBits` only for NaN). Precedent: `tools/vectors/LayeredLoopsVectors/LayeredLoopsVectorsSweep.java:228-234`.
Decisions: [D1](../decisions.md#d1-what-counts-as-a-layout-comparison),
[D2](../decisions.md#d2-the-canonical-form-on-each-side), [D3](../decisions.md#d3-guarded-recorders-keep-their-guard).

## Task

For every JVM row of T1's audit table with action `move`:

1. Replace `Double.doubleToRawLongBits(` with `Double.doubleToLongBits(` at that site. Keep the formatting call, the
   guard (`if (Double.isNaN(d)) throw …`) and the method name as they are.
2. For the stability comparisons (`RectPackingVectors.positions`, `SporeLayoutVectors.java:973-974`), the same swap.
3. Update the encoding sentence of the file's header comment and the encoder's Javadoc: say `Double.doubleToLongBits`
   and that NaN is the canonical `7ff8000000000000` (issue #72); keep "a NaN fails the recording" where the guard stays.
4. Leave `JavaVectors.java`, `CoreJdkVectors.java` and every `canonical` row untouched.
5. Check: `grep -rn doubleToRawLongBits tools/vectors` prints only the two JDK shim recorders (and any row T1 allowlisted).
   Compile-check each changed single-file recorder without running it, if its script supports a dry or compile mode;
   otherwise report that the orchestrator's T4 run is the compile check.

## Write-set

The `tools/vectors/*.java` and `tools/vectors/LayeredLoopsVectors/*.java` files named in T1's JVM table with action
`move`. Nothing else.

## Read-set

T1's `audit` row (JVM) in `plans/canonical-nan/decision-journal.md`; each file's header and encoder (the lines in the
table); `LayeredLoopsVectorsSweep.java:228-234` for wording.

## Acceptance criteria

- Given the audit table, when T2 finishes, then every `move` site calls `doubleToLongBits` and no other line of logic
  changed (`git diff -U0` shows only the bit call and comments).
- Given the tree, when `grep -rn doubleToRawLongBits tools/vectors` runs, then only allowlisted files match.
- Given any guarded recorder, when its diff is read, then the guard is still present.

**Interface output:** none consumed by T3. T4 consumes the list of changed recorders (from the diff).
**Observability:** N/A — no new observable operations. **Rollback:** Reversible (revert the commit).
