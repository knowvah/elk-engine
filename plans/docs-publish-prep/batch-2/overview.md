<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2: TypeDoc toolchain; examples with oracle refs

T2 and T3 have disjoint write-sets and may run in parallel. The orchestrator applies T2's `package.json` script lines and
runs T3's oracle regeneration itself (shared oracle).

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| [T2](T2-typedoc.md) | Isolated TS 6 typedoc package, `docs:api`, generated reference | build-engineer (sonnet) | `tools/typedoc/*`, `package.json` (scripts only), `.gitignore`, both `TRANSLATABLE_EXCLUDES` copies | T1 | [x] |
| [T3](T3-examples.md) | Example files, `examples` golden set, example test | typescript-pro (sonnet) + orchestrator (regen) | `test/docs/examples/*`, `test/docs/examples.test.ts`, `test/golden/examples.json`, `test/golden/examples-inputs/*`, `tools/oracle/regen-goldens.sh`, `test/golden/refs/elk-examples/*` | T1 | [x] |

Gate after the batch: typecheck, format, `npx vitest run test/docs test/public-api`, `npm run docs:build` (with the
reference generated), and the regen of every pre-existing set byte-identical (`git diff --exit-code -- test/golden/refs/`
apart from `elk-examples/`).
