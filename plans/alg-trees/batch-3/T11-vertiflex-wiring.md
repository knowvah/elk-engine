<!-- SPDX-License-Identifier: EPL-2.0 -->

# T11 — vertiflex P1, P3, P4, provider, wiring, replay

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T11): wire vertiflex and replay its oracle rows`
Scratch: `$TMPDIR/alg-trees/T11/`

## Context

Mission 8a, TR1, TR5. Remaining vertiflex classes: `V/p1yplacement/{NodeYPlacer,NodeYPlacerStrategy}`,
`V/p3absolute/{AbsoluteXPlacer,AbsoluteXPlacerStrategy}`, `V/p4edgerouting/{StraightEdgeRouter,BendEdgeRouter,EdgerouterStrategy}`,
`V/VertiFlexLayoutProvider` (183; `NodeMicroLayout.forGraph(graph).execute()` at `:57`, `UnsupportedConfigurationException`).
`VertiFlexLayoutProvider` is in `PENDING_TYPES` (T5).

## Task

1. Port the eight classes whole.
2. Remove `org.eclipse.elk.alg.vertiflex.VertiFlexLayoutProvider` from `PENDING_TYPES`; `npm run melk:generate VertiFlex`; commit the
   regenerated files unedited; extend `test/melk/vertiflex-options.test.ts` only if T5 asserted the held-back state (switch that
   assertion to the registered algorithm, matching `metadata.json`).
3. `src/alg/vertiflex/VertiFlexVectors.test.ts`: every T3 row through the real provider — `full` via `RecursiveGraphLayoutEngine`
   with `VertiFlexMetaDataProvider` registered (TR5), `stops` step by step, `throws` by class and first ELK frame. Budget ≤ 30 s alone.
4. Run the per-module import smoke over `src/alg/vertiflex/**`.

## Write-set

`src/alg/vertiflex/p1yplacement/**`, `src/alg/vertiflex/p3absolute/**`, `src/alg/vertiflex/p4edgerouting/**`,
`src/alg/vertiflex/VertiFlexLayoutProvider{,.test}.ts`, `src/alg/vertiflex/VertiFlexVectors.test.ts`, `src/alg/vertiflex/options/**`
(regenerated), `tools/melk/config.ts`, `test/melk/vertiflex-options.test.ts`.

## Read-set

The Java files above, `src/alg/common/NodeMicroLayout.ts`, `src/core/alg/AlgorithmAssembler.ts`, T8's helpers and classes,
`src/alg/common/NodeMicroLayoutVectors.test.ts` (replay shape), `decisions.md` TR1, TR5.

## Interface contract (consumed by T18)

`VertiFlexMetaDataProvider` registers `org.eclipse.elk.vertiflex` with a working factory.

## Acceptance criteria

- Given every row of `refs/java/vertiflex.json`, when replayed, then 0 mismatches at the AD-4 bar (stops, full, throws).
- Given replay-alone coverage of `src/alg/vertiflex/**`, then ≥ 90 % branches (journal the rest as `U` candidates for T19).
- Given `melk:generate VertiFlex`, then the output equals the committed files.

## Observability / Rollback

N/A — no new observable operations. Reversible.
