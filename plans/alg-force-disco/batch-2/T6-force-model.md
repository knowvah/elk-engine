<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6 — Force graph, importer, components, `ForceImportTest`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T6): port the force graph, importer and components` · Scratch: `$TMPDIR/alg-force-disco/T6/`

## Context

Mission 8b, FD1, FD4, FD8. `F/graph/*`, `F/options/InternalProperties.java`, `F/IGraphImporter.java`, `F/ElkGraphImporter.java`,
`F/ComponentsProcessor.java`. `ComponentsProcessor.java:222` narrows with `(float)`; `dfs` recurses on input depth (FD7).

## Task

1. Port the classes whole, one per file, with `@see`.
2. `test/helpers/force-replay-{rows,dump,run}.ts`: row loading, dump and compare, the stop runner for import, split and recombine,
   from the `vertiflex-replay-*` shape. T8 and T10 extend them.
3. Port `FT/ForceImportTest.java` to `src/alg/force/ForceImportTest.test.ts` whole, asserts verbatim.
4. Replay every `import`, `split` and `recombine` stop of `force.json` and `stress.json`.

## Write-set

`src/alg/force/graph/**`, `src/alg/force/options/InternalProperties.ts`, `src/alg/force/IGraphImporter.ts`,
`src/alg/force/ElkGraphImporter{,.test}.ts`, `src/alg/force/ComponentsProcessor{,.test}.ts`, `src/alg/force/ForceImportTest.test.ts`,
`test/helpers/force-replay-*.ts`.

## Read-set

The Java above, `FT/ForceImportTest.java`, `test/helpers/vertiflex-replay-*.ts`, `decisions.md#fd4-hashed-containers`, `#fd8-junit-suites`.

## Interface contract (consumed by T8, T10)

`FGraph`, `FNode`, `FEdge`, `FBendpoint`, `FLabel`, `FParticle`, `ElkGraphImporter`, `ComponentsProcessor.{split,recombine}` under Java
signatures; the replay helpers.

## Acceptance criteria

- Given `ForceImportTest`, then its 3 tests pass with the Java's assertions.
- Given every import, split and recombine stop, then it equals the row at 1e-6, ids exact.
- Given `recombine`'s sort on tied priorities, then the order equals the row.

## Observability / Rollback

N/A — no new observable operations. Reversible.
