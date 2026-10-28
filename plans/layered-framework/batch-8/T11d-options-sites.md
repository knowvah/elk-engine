<!-- SPDX-License-Identifier: EPL-2.0 -->

# T11d — Options sites: Spacings, enums, target filter, node flexibility

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T11d): anchor option unit tests on oracle site rows`
`S` = `src/alg/layered`.

## Context

As T11b (read its Context). This task covers `unreached.md` rows of category S8 and the J rows under `S/options/`,
`LayeredPhases.ts`, `components/ComponentOrderingStrategy.ts` and `graph/LNodeNodeType.ts`; JSON groups S8
(`site/spacings/*`), S20 (`site/enums/<SimpleName>`), S21 (`site/layeredSpacings/targetFilter`), S22
(`site/nodeFlexibility/*`).

## Task

1. `S/options/Spacings.test.ts`: one case per S8 row (pairs, type pairs, individual overrides, the element-form throw
   with the row's class and message), literals from the row, `// oracle: <row id>; Spacings.java:<line>`.
2. Enum tests (`S/options/<Enum>.test.ts`, `S/LayeredPhases.test.ts`, `S/components/ComponentOrderingStrategy.test.ts`,
   `S/graph/LNodeNodeType.test.ts`): for each `site/enums/<SimpleName>` row add cases asserting the row's constants
   (name, ordinal, `toString`), the `valueOf` miss class and message, the `compareTo` triples, and every recorded
   method per constant (`transpose`, `usesLabelSizeInformation`, `returnValue`, `getColor`,
   `isFlexibleSizeWhereSpacePermits`, `isFlexiblePorts`, the `isAtLeast` matrix). Existing cases stay; a new case may
   restate a value an old case already asserts (the row id is the point). Keep each file under the complexity limits
   (table-driven `it.each` over the row).
3. `S/options/LayeredSpacings.test.ts`: the S21 boolean matrix. `S/options/NodeFlexibility.test.ts`: the S22 rows.
4. The X arms (`create()` factories) get no cases.

## Write-set

`S/options/*.test.ts`, `S/LayeredPhases.test.ts`, `S/components/ComponentOrderingStrategy.test.ts`,
`S/graph/LNodeNodeType.test.ts` (new cases only). No new helpers; not `src/**` non-test files.

## Read-set

`plans/layered-framework/unreached.md`, the JSON rows of your groups (S20 is one row per enum; read them in a loop,
not one by one), the T10 header, the Java enum sources under `.../alg/layered/options/`.

## Quality bar

`npx vitest run src/alg/layered/options src/alg/layered/LayeredPhases.test.ts src/alg/layered/components
src/alg/layered/graph/LNodeNodeType.test.ts`, `npm run typecheck`, `npx prettier --check <files>`,
`npm run complexity`, `npx vitest run test/architecture`; then a coverage run restricted to `src/alg/layered/options/**`
and the three other files, reported per file. Never `npm run coverage`, never commit.

## Acceptance criteria

- Given every S8, S20, S21, S22 row, then a colocated case asserts its values with the row id.
- Given the coverage run, then every file is ≥ 90 % branches or its remainder is an X arm.
- Given `git diff`, then no existing assertion changed and no file outside the write-set changed.

## Hand-back

Return only: files written, case counts per file, per-file branch %, divergences with diagnosis, journal row text.
