<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1 — Force and stress recorder

**Agent:** java-architect (sonnet) · **Commit:** `test(T1): record force and stress oracle vectors` · Scratch: `$TMPDIR/alg-force-disco/T1/`

## Context

Mission 8b, FD1, FD3. The oracle is the spec; no TS exists yet. `F/ForceLayoutProvider.java`, `F/model/*`, `F/ComponentsProcessor.java`,
`F/ElkGraphImporter.java`, `F/stress/{StressLayoutProvider,StressMajorization}.java`.

## Task

1. Write `tools/vectors/ForceVectors.java` and `force-vectors.sh` from the `VertiFlexVectors.java` shape: `force.json` (groups `full`,
   `stops`, `throws`, `log`) and `stress.json` (`full`, `stops`, `throws`), with the stops, scenarios and throw rows of FD1.
2. `log` group: 20,000 inputs (seeded, half 0.01–20, half 10^-3–10^3, plus edge cases 0, -1, NaN, ±infinity, the smallest subnormal,
   1, and just above and below 1), each with `Math.log`'s raw bits.
3. Check `uptime` first. Run detached under `nice -n 10`; two runs must be `cmp`-identical.

## Write-set

`tools/vectors/ForceVectors.java`, `tools/vectors/force-vectors.sh`, `test/golden/refs/java/force.json`, `test/golden/refs/java/stress.json`.

## Read-set

The Java above, `tools/vectors/VertiFlexVectors.java`, `tools/vectors/vertiflex-vectors.sh`, `tools/vectors/vector-cache.sh`,
`decisions.md#fd1-recorders-and-row-contract`, `#fd3-mathlog-in-eadesmodel`, `tools/melk/sources/{Force,Stress}.melk`,
`test/corpus/generated/force-graph-small.json`.

## Interface contract (consumed by T5, T6, T8, T10)

Row `{ id, group, input, expected }`; `log` rows `{ id, group: "log", input: "<hex>", expected: "<hex>" }`; stop names exactly as
listed in FD1; doubles as 16-hex raw bits.

## Acceptance criteria

- Given a cold run, when repeated, then both outputs are `cmp`-identical and each is under 16 MiB.
- Given every option value of FD2 for force and stress, then a `full` row exercises it.
- Given the `log` group, then it holds at least 20,000 rows including every edge case above.
- Given a row whose re-imported run differs from the original graph run, then the recorder fails.

## Observability / Rollback

N/A — no new observable operations. Reversible.
