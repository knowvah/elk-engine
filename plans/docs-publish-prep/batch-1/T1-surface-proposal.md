<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: export-surface proposal and candidate entry

**Agent:** orchestrator. **Decisions:** DP1, DP2. **Commit:** `docs(api): propose the export surface and candidate entry`.

## Write-set

- `docs/architecture/public-api.md` (new): the proposal.
- `test/public-api/candidate-index.ts` (new): the proposed entry module, SPDX header, a module comment saying it is a
  proposal awaiting the maintainer's ruling and is not shipped.
- `test/public-api/candidate-index.test.ts` (new).
- `tsconfig.json`: `compilerOptions.paths` `{"@knowvah/elk-engine": ["./test/public-api/candidate-index.ts"]}`.
- `vitest.config.ts`: `resolve.alias` for the same specifier.

## Read-set

- `plans/elk-engine-skeleton/decisions.md` AD-11 (`:120-124`), AD-14 (`:138-143`), AD-16c (`:203-207`)
- `src/index.ts`, `src/index.test.ts` (what is pinned about the empty entry; do not change either)
- `tools/corpus/ts-layout-pipeline.ts:1-110` (what a layout needs: provider registration, engine, monitor, JSON in/out,
  the `CoreOptions`-first import)
- `src/graph/util/ElkGraphUtil.ts` (exports; it may be an object, not a class), `src/graph/*.ts` (AD-11 types),
  `src/graph/properties/` (`IProperty`, `Property`), `src/core/data/LayoutMetaDataService.ts:200-310`,
  `src/graph/json/ElkGraphJson.ts`, each in-scope algorithm's `options/*MetaDataProvider.ts` and `*Options.ts`
- `test/architecture/` fitness tests that scan `test/` (SPDX, module-level `let`), so the new files pass them

## Steps

1. List every candidate export by DP2's tiers. For each: TS path, Java class (`@see` from its file), tier, and one-line
   reason a consumer needs it. Algorithms: all in scope that have a `*MetaDataProvider` (14 in the TS sweep:
   `ts-layout-pipeline.ts:75-87`), plus the core `Fixed`/`Box`/`Random` providers if they are registered differently
   (check `CoreOptions`/`LayoutMetaDataService`).
2. Write `candidate-index.ts`: `import '../../src/core/options/CoreOptions.js';` first, with a comment citing the cycle;
   then named re-exports only (`export { X } from …`, `export type { T } from …` for interfaces). No `export *`, no new
   code.
3. Test first (`candidate-index.test.ts`), then make it pass:
   - the module's runtime export names equal the runtime rows of the proposal's table (parse the table from
     `public-api.md` with a small helper in the test, or keep a constant the doc also shows; the doc and module must not
     drift);
   - importing `@knowvah/elk-engine` (the alias) in a fresh module graph gives the same object as the direct `src` import
     for two or three symbols (`ElkGraphUtil`, `RecursiveGraphLayoutEngine`);
   - registering one algorithm's provider through the candidate's exports and laying out a two-node graph does not throw
     and gives each node a position: **assert the exact position only from an oracle ref**; otherwise assert only
     structure here (T3 owns the oracle-backed outputs).
4. Write `public-api.md`: status **Proposed**; summary; the table; the excluded families with why; the import-order note;
   open questions (DP2); "On acceptance" steps (DP9 issue 1: move into `src/index.ts`, flip the three mappings, nav rows
   of `locale-complete.test.ts`, CLAUDE.md line); a PlantUML component diagram of the tiers. Link it from nowhere on the
   site (it is a review artifact, like the row-11 ADR).
5. Gate: typecheck, the new test, format. Confirm `git diff <base> -- src/index.ts` is empty.

## Interface contracts (outputs)

- Specifier `@knowvah/elk-engine` resolves to `test/public-api/candidate-index.ts` under `tsc` and vitest (consumed by T2's
  `typedoc.json`, T3's examples, T7's `--entry`).
- `public-api.md` § "On acceptance" lists every mapping site by path (consumed by T9's ruling issue).

## Acceptance criteria

- Given the candidate, when `npm run typecheck` runs, then it exits 0 and `src/index.ts` is unchanged.
- Given `public-api.md`'s table, when the test compares it with the candidate's runtime exports, then the sets are equal.
- Given a fresh import of `@knowvah/elk-engine`, when `ElkGraphUtil` is read, then it is the same object as
  `src/graph/util/ElkGraphUtil.js`'s export.
- Given the doc, when read, then every export row names a Java `@see` and no row adds a symbol absent from the Java.

**Observability:** N/A — no new observable operations. **Rollback:** Reversible (delete the files, drop the mapping).
