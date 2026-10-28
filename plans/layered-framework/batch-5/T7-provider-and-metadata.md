<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7 — `LayeredLayoutProvider`, staged `ElkLayered`, metadata replay

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T7): port the layered layout provider and registry`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`; `S` = `src/alg/layered`.

## Context

Mission 7a (README). T3 generated `LayeredOptions` with `LayeredLayoutProvider` held in `PENDING_TYPES`, so the
algorithm registration was held back (C1). This task ports the provider (109 lines), stages `ElkLayered` (moved to
7f, L2), removes the pending entry and regenerates, so the registry is complete. Registration stays explicit (L5).

- **Patterns:** an existing ported provider (`src/core/util/` `FixedLayoutProvider`/`BoxLayoutProvider`,
  `IWhiteBoxTestable` and `TestController` in `src/core/testing/`); `test/melk/{recorder,helpers}.ts` and
  `test/melk/core-registry.test.ts` (provider calls and service dump comparison).

## Task

1. Port `J/LayeredLayoutProvider.java` to `S/LayeredLayoutProvider.ts`, every member (including the white-box test
   hooks and `ElkLayered.TestExecutionState`).
2. Add `S/ElkLayered.ts` with `@staged 7f`: the members and nested `TestExecutionState` the provider references, with
   bodies that throw `UnsupportedOperationException('ElkLayered is ported in mission 7f')` wherever they would run
   layout; add its row to `test/architecture/staged-classes.json`.
3. Remove the entry from `PENDING_TYPES` (`tools/melk/config.ts`, now empty again), run
   `npm run melk:generate Layered`, commit the regenerated options; S4 check stays byte-identical.
4. Move the private `dumpService` of `test/melk/core-registry.test.ts` into `test/melk/helpers.ts` unchanged (no
   assertion changes), so both tests share it.
5. Tests, `test/melk/layered-registry.test.ts`:
   - the `LayeredMetaDataProvider` and `LayeredOptions` calls equal their `metadata.json` (i) entries (`diffCalls`);
   - after `registerLayoutMetaDataProviders(new LayeredMetaDataProvider())` on a fresh service with core + labels,
     the service dump equals the `metadata/service` row of `layered-framework.json`;
   - `LayoutMetaDataService.getInstance()` still registers core and labels only (C8).
6. Provider tests: `layout()` delegates to the staged `ElkLayered` and throws the 7f message; the white-box hooks
   wire as in the Java (non-numeric).

## Write-set

`S/{LayeredLayoutProvider,ElkLayered}{,.test}.ts`, `S/options/{LayeredOptions,LayeredMetaDataProvider}.ts`,
`tools/melk/config.ts`, `test/architecture/staged-classes.json`, `test/melk/{helpers.ts,core-registry.test.ts,layered-registry.test.ts}`.

## Read-set

`J/LayeredLayoutProvider.java`, `J/ElkLayered.java` (signatures the provider uses only); `test/melk/*.ts`;
`test/golden/refs/java/{metadata,layered-framework}.json` (read); `decisions.md` L1, L2, L5, L7.

## Acceptance criteria

- Given the regenerated registry, when applied to a recording registry, then the calls equal `metadata.json` (i) for
  `LayeredMetaDataProvider` and `LayeredOptions`.
- Given a fresh service with core, labels and layered registered, when dumped, then it equals `metadata/service`.
- Given `getInstance()`, when its algorithms are listed, then layered is absent (C8, L5).
- Given `PENDING_TYPES`, when read, then it is empty, and the freshness tests pass.
- Given `LayeredLayoutProvider.layout()`, when called, then it throws the staged 7f message.

## Observability / Rollback

N/A — no new observable operations. Reversible: revert the commit.
