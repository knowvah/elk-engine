<!-- SPDX-License-Identifier: EPL-2.0 -->

# T11c — Transform, provider and hierarchy-aware sites

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T11c): anchor transform unit tests on oracle site rows`
`S` = `src/alg/layered`.

## Context

As T11b (read its Context). This task covers the importer and transferrer section files, the provider and the
hierarchy-aware marker: `unreached.md` rows of categories S11–S15 and the J rows of
`graph/transform/ElkGraphTransformerUtility.ts`, `LayeredLayoutProvider.ts`, `IHierarchyAwareLayoutProcessor.ts`;
JSON groups S11–S15 and the S19 rows `site/strings/origin-*`, `site/provider/*`, `site/strings/hierarchyAware`.

## Task

1. Importer and transferrer: T6 landed no colocated unit tests for the section files (only the T1 replay). Add
   `S/graph/transform/<Section>.test.ts` per section file that `unreached.md` names (importer `ExternalPorts`,
   `Flat`, `ModelOrder`, `Hierarchical`, `Edges`, `EntryPoints`, `Graphs`, `Map`, `Nodes`, `Ports`; transferrer
   facade, `Apply`, `NonMutating`): one case per unreached branch, built from the row's `input` through
   `ElkGraphJson` and `ElkGraphTransformer` (and `applyLayoutNonMutating` for S15), asserting the named fields of the
   row's `lgraph`/`elk` dumps as literals (`// oracle: <row id>; <Java file:line>`). Use `dumpLGraph` from
   `test/helpers/layered-framework-replay.ts` to reach positional fields; assert values, not whole dumps.
2. `S/graph/transform/ElkGraphTransformerUtility.test.ts`: origin-identifier cases from the S19 rows.
3. `S/LayeredLayoutProvider.test.ts`: the `flat` and `include-children` rows assert the staged throw naming the
   method (`doLayout` / `doCompoundLayout`) and mission 7f; the `cancelled` row's `isCanceled` arm is unreachable in
   7a (the throw precedes it) — journal it as unreachable-until-7f, do not fake it.
4. `S/IHierarchyAwareLayoutProcessor.test.ts`: from the `hierarchyAware` row assert `isHierarchyAwareLayoutProcessor`
   is false for `new LayeredLayoutProvider()` and `new ElkLayered()`, and that no listed implementor is a 7a-ported
   class (every listed class name resolves to no file under `S/`, a sentinel 7b+ updates). The `null`/primitive
   guards are TS-only surface: keep the existing structural cases, journal that they have no oracle row.

## Write-set

`S/graph/transform/*.test.ts` except `LayeredFrameworkTransformVectors.test.ts` (new files allowed),
`S/LayeredLayoutProvider.test.ts`, `S/IHierarchyAwareLayoutProcessor.test.ts`, new `test/helpers/transform-site-*.ts`.
Not `src/**` non-test files, not the replay helpers.

## Read-set

`plans/layered-framework/unreached.md`, the JSON rows of your groups, the T10 header, `test/helpers/layered-framework-replay.ts`
(exports only), the Java lines each row cites under `.../alg/layered/graph/transform/` and `.../alg/layered/`.

## Quality bar

`npx vitest run src/alg/layered/graph/transform src/alg/layered/LayeredLayoutProvider.test.ts
src/alg/layered/IHierarchyAwareLayoutProcessor.test.ts`, `npm run typecheck`, `npx prettier --check <files>`,
`npm run complexity`, `npx vitest run test/architecture`; then a coverage run restricted to
`src/alg/layered/graph/transform/**` plus the two root files, reported per file. Never `npm run coverage`, never commit.

## Acceptance criteria

- Given every S11–S15 and listed S19 row, then one colocated case asserts its values with the row id.
- Given the coverage run, then every transform section file is ≥ 90 % branches, or the remainder is journaled as
  unreachable with the Java reason.
- Given `git diff`, then no existing assertion changed and no file outside the write-set changed.

## Hand-back

Return only: files written, case counts per file, per-file branch %, divergences with diagnosis, journal row text.
