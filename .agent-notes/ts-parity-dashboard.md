<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations — ts-parity-dashboard (roadmap row 9, 2026-11-13)

Planning-time notes are in `ts-parity-dashboard-planning.md`.

## Observation: `npm run complexity` and the coverage gate do not look at `tools/corpus`

- **Context**: Batch 1 gate; the complexity file count did not change after six new tool modules were committed.
- **Finding**: `tools/complexity/check.ts` defaults to `src` (`DEFAULT_TARGETS`); `vitest.config.ts` coverage includes `src/**` and
  `tools/melk/**/*.ts` only. The PostToolUse hook checks an edited tool file, but a scripted edit bypasses it.
- **Impact**: after changing a corpus tool run `npx tsx tools/complexity/check.ts tools/corpus` and a scoped coverage run
  (`--coverage.include='tools/corpus/…'`); the gates alone prove nothing about those files.
- **Confidence**: High

## Observation: a generated file that its generator compares byte for byte cannot also be prettier-formatted

- **Context**: T7, `parity-report.ts --write` followed by `npm run format:check`.
- **Finding**: the generator writes unpadded tables and its staleness check is string equality; the committed report had been
  reformatted by prettier after generation, so the check could never pass on it. `docs/parity-report.md` is now in
  `.prettierignore`, as `test/architecture/bundle-deps.json` already was.
- **Impact**: a new generated, committed, byte-compared file goes into `.prettierignore` in the same change.
- **Confidence**: High

## Observation: a nested graph under `INCLUDE_CHILDREN` lacks graph-level properties the flat import sets

- **Context**: T5, the sweep case `native/layered/hierarchy-include/…/modelOrderCycleBreaking` (oracle NPE, TS layout).
- **Finding**: `ElkGraphImporter.java:380-384` sets `MAX_MODEL_ORDER_NODES` and `CB_NUM_MODEL_ORDER_GROUPS` on the top-level graph
  only; three cycle breakers unbox them (`ModelOrderCycleBreaker.java:70`, `GreedyModelOrderCycleBreaker.java:37`,
  `SCCModelOrderCycleBreaker.java:97`). In the port `Math.max(n, null)` is `n` and `Math.imul`-style arithmetic takes null as 0,
  so a missing unboxing lays out where the Java throws. The `hierarchy-include` variant is the only one that reaches it.
- **Impact**: an `Integer` or `Double` property without a default that the Java reads into a primitive needs
  `unboxInteger`/`unboxDouble` (`src/java/lang/Unbox.ts`); issue #83 lists the open sites, #84 the upstream defect.
- **Confidence**: High

## Observation: an oracle stack trace without touching `tools/oracle`

- **Context**: T5; the harness records only the exception class and message.
- **Finding**: a scratch copy of `tools/oracle/harness/*.java` with `e.printStackTrace()` in `CaseRunner.run`'s catch, and a scratch
  copy of `run.sh` whose `ROOT`, `HARNESS_DIR` and `CLASSES` point at the repository, the scratch harness and a scratch classes
  directory, runs a `--cases` file against the same jars and leaves `$ELK_ORACLE_DIR/harness-classes` alone.
- **Impact**: the origin `file:line` of an oracle throw costs one small case file; no shared oracle state changes.
- **Confidence**: High

## Observation: which spore jitter cases look deterministic changes from sweep to sweep

- **Context**: T4, T5; issue #79.
- **Finding**: in this oracle sweep the four cases of #79 came out `nondeterministic` (so `excluded`), while two other
  `sporeOverlap` cases (`…/hierarchical/ptolemy_electricpowersystem_GeneratorRegulatorProtectorSimXFMU` and
  `…/ptolemy_test_auto32_GeneratorRegulatorProtectorSimXFMU`) got `throws` because both oracle runs threw. 24 oracle runs of each
  gave 20 and 16 throws and 4 and 8 distinct layouts; the TS comparison flickers between `both-throw` and `oracle-only-throw`.
- **Impact**: the set of flickering cases is not fixed; a `sporeOverlap` finding is checked with repeated `run.sh --cases` runs
  before anything else, and a list of known ids (one option of #79) would have to grow.
- **Confidence**: High

## Observation: the census `source` decides which twin of a model the sweep reads

- **Context**: T5, repeating a ptolemy case in the oracle.
- **Finding**: the model has `.elkt`, `.elkg` and `.json` twins; the sweep reads `<modelId>.<source>` from the census (`json` here).
  A repeat started on the `.elkt` twin reported `ok` for the runs inspected, the `.json` input threw in 20 of 24.
- **Impact**: build a repeat case from the census `source`, not from the first file found.
- **Confidence**: Medium (the `.elkt` run was discarded after its first lines were read)

## Observation: forked tsx children, and tests that count child processes

- **Context**: T1, the sharded runner and its tests.
- **Finding**: `fork(worker.ts, [], { execArgv: process.execArgv })` loads a `.ts` worker under `npx tsx`; under vitest the test
  passes `execArgv: ['--import', 'tsx']`. A test that lists its own children with `ps` sees the `ps` process itself. vitest prints
  no coverage table while a test fails unless `--coverage.reportOnFailure=true`. The scoped text table showed no row for
  `ts-layout-protocol.ts` (100 % in the JSON summary).
- **Impact**: read per-file numbers from the `json-summary` reporter; exclude `ps` in child-count assertions.
- **Confidence**: High (the missing table row: Medium, cause not examined)

## Observation: lizard reads a backtick inside a regex literal as the start of a template literal

- **Context**: T2, `parity-report-ts.ts`; the hook reported a helper at 47 NLOC.
- **Finding**: rewriting the helper without a backtick in a regex literal removed the report; the cause was inferred, not isolated.
- **Impact**: a sudden NLOC jump in a small function is first checked for a backtick in a regex.
- **Confidence**: Medium

## Observation: the `technical-writer` agent has no Edit or Bash tool

- **Context**: T7 assigned prose to `technical-writer`.
- **Finding**: its tools are Read, Write, Glob, WebFetch and Grep, so it cannot append to a large file or run prettier.
  `documentation-engineer` did the task.
- **Impact**: plan docs tasks that edit `docs/conformance.md` for `documentation-engineer`.
- **Confidence**: High

## Observation: a code fence in `docs/conformance.md` fails the translation lint for every locale

- **Context**: T8 end gate; the T7 section had a fenced `sh` block and the coverage run failed 23 tests.
- **Finding**: `test/docs/translation-lint.test.ts` requires each translated page to carry the English page's code fences (count and
  body; `plantuml` fences excepted). `docs/conformance.md` has no fence, and 23 locales mirror it, so one new fence gives
  "expected 1 code fences, found 0" once per locale. `npm run docs:build` and `vitest run test/architecture` do not catch it.
- **Impact**: write commands in mirrored docs (`docs/conformance.md`, `docs/architecture/overview.md`,
  `docs/architecture/component-map.md`) as inline code, and run `npx vitest run test/docs` after any docs edit.
- **Confidence**: High
