<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3 — vertiflex recorder and ref

**Agent:** java-architect (sonnet) · **Commit:** `test(T3): record vertiflex oracle vectors` · Scratch: `$TMPDIR/alg-trees/T3/`

## Context

Mission 8a, TR1, TR2 (option values), TR3 (identity hash). No TS of `alg.vertiflex` exists yet; every expectation the later vertiflex tasks
compare against comes from this ref (AD-13). Landed shapes to copy (with an `ORIGIN:` header line):
`tools/vectors/NodeMicroLayoutVectors.java` (ELK JSON input rows, NS1 round trip, NS4 label sizes, NS6 hex doubles) and
`tools/vectors/LayeredCompoundVectors.java` + `layered-compound-vectors.sh` (classpath from `oracle-build.json`, `-XX:hashCode=2`,
step stops, `throws` rows with the first ELK frame, 16 MiB guard).

## Task

1. Write `tools/vectors/VertiFlexVectors.java` (single-file launcher, ≤ 5,000 lines) and `tools/vectors/vertiflex-vectors.sh <outDir>`
   (writes `<outDir>/vertiflex.json`; the orchestrator copies it to `test/golden/refs/java/vertiflex.json`). The header documents the row
   format, the scenario generator and its seeds (seed ≠ 0), and how to re-record.
2. Rows `{ id, group, input, expected }`, `group ∈ full | stops | throws` (TR1). `full`: `RecursiveGraphLayoutEngine` on the
   re-imported input with the provider registered. `stops`: the state after each of the four phases of `VertiFlexLayoutProvider` (`V/VertiFlexLayoutProvider.java`).
3. Dump per stop: every `ElkNode`: id, x, y, width, height; the `V/InternalProperties.java` values that are set (`OutlineNode` chains as point lists); every edge section. Doubles as 16-hex raw bits; ids as exported. Sanitise bare `Infinity`/`NaN` tokens (7a note) and
   strict-parse the output before writing.
4. Scenarios: designed shapes built from a seeded spec — trees with uneven subtree widths for `RelativeXPlacer` outlines (`V/p2relative/RelativeXPlacer.java:156,295`), model-order splits (`:441-555`), vertical constraints that force overlaps, the throw of `UnsupportedConfigurationException` paths — plus `test/corpus/generated/vertiflex-tree-small.json`; crossed one
   factor at a time with the option values layoutStrategy × 2, considerNodeModelOrder false, layerDistance, verticalConstraint per node, nodeNode spacing. Trim to fit 16 MiB and journal the counts per group.
5. Record twice (two JVMs); the files must be byte-identical. Record once more without `-XX:hashCode=2` and journal which row ids
   differ (TR3 evidence; do not commit that run).

## Write-set

`tools/vectors/VertiFlexVectors.java`, `tools/vectors/vertiflex-vectors.sh`, `test/golden/refs/java/vertiflex.json`.

## Read-set

`V/**` (the provider and the assembly code first), `V/VertiFlex.melk`, the two landed
recorders above, `tools/vectors/layered-compound-vectors.sh`, `.agent-notes/recorder-identity-hash.md`, `decisions.md` TR1–TR3.

## Interface contract (consumed by the vertiflex replay helpers and replay test)

The recorder header is the contract: row and dump field names, the step names in order per row, the hex-double encoding, the
`throws` shape `{ class, message, frame }`. Keep step names equal to the Java class simple names of the processors and phases.

## Acceptance criteria

- Given two recordings in separate JVMs, when compared, then they are byte-identical.
- Given every row, when its `input` is re-imported by the recorder, then the re-imported run equals the original-graph run.
- Given the ref, then it is ≤ 16 MiB, strict JSON, and has at least one row in each group and each option value of TR2.
- Given `git diff --name-status <base> -- test/golden/refs/`, then only `A test/golden/refs/java/vertiflex.json` appears from this task.

## Observability / Rollback

N/A — no new observable operations. Reversible (new files only).
