<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: vertiflex items V-a, V-b → `vertiflex-extra.json`

## Context

`vertiflex.json` (471 rows, counts pinned) does not observe two mutants: V-a (equal absolute Y of two outline points in
`firstRun`) and V-b (the BEND epsilon `1e-4`). The T1 rows of the journal give the exact mutants. Follow the batch 2 common
rules ([overview.md](overview.md)). Set an option at every level its reader reads it (`.agent-notes/alg-trees.md`, the
root-only options observation).

## Task

1. V-a: build a tree whose two subtrees' outlines have a point of equal absolute Y, where the line-31 comparison decides.
   Use integer heights, `spacing.nodeNode` and, if needed, `VERTICAL_CONSTRAINT`. Confirm on the oracle, screen with TS.
2. V-b: two BEND rows (`edgeRoutingStrategy=BEND`). In one, the bend height differs from
   `endY - spacingNodeNode / 2` by a value in (1e-4, 0.5]. In the other, it differs by a value in (0, 1e-4). Read
   `BendEdgeRouter.java` for where `bendheight` comes from (`BEND_HEIGHT` per node, or the computed default).
3. Add the inputs to `VertiFlexVectors.java` as a second plan writing `vertiflex-extra.json` after `vertiflex.json` (D2),
   run under the same build-twice self-check. Update the header contract (lines 10-123) and `vertiflex-vectors.sh`'s comments.
4. Record (common rules). Then write `src/alg/vertiflex/VertiFlexExtraVectors.test.ts` (D3), reusing `runFull`, `runStops`,
   `runThrows` and `compareStop`, with a `rowCounts` assertion in literal numbers.
5. D4 evidence: `mutate.sh` for each mutant against `VertiFlexExtraVectors.test.ts`, `VertiFlexVectors.test.ts` and
   `p2relative/RelativeXPlacerReplay.test.ts`.

## Write-set

`tools/vectors/VertiFlexVectors.java`, `tools/vectors/vertiflex-vectors.sh` (comments only),
`test/golden/refs/java/vertiflex-extra.json`, `src/alg/vertiflex/VertiFlexExtraVectors.test.ts`,
`test/helpers/vertiflex-replay-rows.ts` (a path helper only).

## Read-set

[items.md](../items.md) rows V-a, V-b; `tools/vectors/VertiFlexVectors.java:1-330` (contract, `main`, the first plan's start);
`src/alg/vertiflex/VertiFlexVectors.test.ts:1-60`; `test/helpers/vertiflex-replay-rows.ts:140-260`; `test/helpers/vertiflex-replay-run.ts`;
`src/alg/vertiflex/p2relative/RelativeXPlacerOutlines.ts:15-60`; `src/alg/vertiflex/p4edgerouting/BendEdgeRouter.ts:40-75`.

## Interface contracts

Output: `vertiflex-extra.json`, the contract of `vertiflex.json`. T5 consumes the report table and the row counts.

## Acceptance criteria

- Given the recorder change, when it runs cold twice, then `vertiflex.json` is `cmp`-equal to the committed file and
  `vertiflex-extra.json` is `cmp`-equal between the runs.
- Given `VertiFlexExtraVectors.test.ts`, when run, then every row passes at the AD-4 bar and the row counts match.
- Given V-a or V-b with outcome 1, when `mutate.sh` applies its mutant, then the new test reports `killed`, the two landed
  tests report `survived`, and the file is restored.
- Given an item without outcome 1, when the report is written, then it holds the proof or the closest approach.

## Quality bar

`npx vitest run src/alg/vertiflex test/helpers/vertiflex-*` green; `npm run typecheck`; `npx prettier --check` on the changed TS.

**Observability:** N/A — no new observable operations. **Rollback:** Reversible (additive).
