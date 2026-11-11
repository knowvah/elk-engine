<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2 — Disco recorder

**Agent:** java-architect (sonnet) · **Commit:** `test(T2): record disco oracle vectors` · Scratch: `$TMPDIR/alg-force-disco/T2/`

## Context

Mission 8b, FD1, FD4. `D/DisCoLayoutProvider.java`, `D/DisCoPolyominoCompactor.java`, `D/structures/DCPolyomino.java`, `D/graph/*`,
`D/transform/*`. Disco needs preset coordinates and one section per edge. The JVM's sets iterate by identity hash, so a row must
not encode set order.

## Task

1. Write `tools/vectors/DiscoVectors.java` and `disco-vectors.sh`: `disco.json` (groups `full`, `stops`, `throws`), with the stops,
   scenarios and throw rows of FD1. The recorder registers `PolyominoOptions` and every provider `componentLayoutAlgorithm` names.
2. Sort every set-derived list in a stop by a stable key (component by first node id; elements by kind and bounds; extensions by
   direction and offset). `component` DFS order is recorded separately as `dfsOrder`.
3. Include the shared-port row (two extension edges on one port, at most 8 extension entries) and journal the extension map order
   the oracle used.
4. Check `uptime`; run detached under `nice -n 10`; two runs `cmp`-identical.

## Write-set

`tools/vectors/DiscoVectors.java`, `tools/vectors/disco-vectors.sh`, `test/golden/refs/java/disco.json`.

## Read-set

The Java above, `tools/vectors/VertiFlexVectors.java`, `tools/vectors/vertiflex-vectors.sh`, `decisions.md#fd1-recorders-and-row-contract`,
`#fd4-hashed-containers`, `tools/melk/sources/{Disco,Polyomino}.melk`, `test/corpus/generated/disco-components-small.json`,
`tools/oracle/harness/ElkOracle.java:216-232`.

## Interface contract (consumed by T7, T9)

Row `{ id, group, input, expected }`; stops `split`, `import`, `cellSizes`, `polys`, `pack`, `applyToDCGraph`, `applyLayout`.

## Acceptance criteria

- Given a cold run, when repeated, then both outputs are `cmp`-identical and under 16 MiB.
- Given every `Disco.melk` and `Polyomino.melk` option value of FD2, then a `full` row exercises it.
- Given an edge without a section and an out-of-grid extension, then each has a `throws` row with class and first ELK frame.

## Observability / Rollback

N/A — no new observable operations. Reversible.
