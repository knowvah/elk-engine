<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning observations — core-engine (mission 5a, 2026-10-23)

## Observation: the main golden manifest is frozen at 3–5 entries

- **Context**: planning fixed/box/random goldens.
- **Finding**: `test/corpus/corpus.test.ts:96` asserts 3 ≤ `manifest.golden.length` ≤ 5, and
  `docs-site/copy-goldens.mjs` builds the showcase (24 locales) from the same manifest.
- **Impact**: new algorithm goldens go to a separate set (`test/golden/algorithms.json`, decision M4).
- **Confidence**: High

## Observation: generated algorithm classes do not use `AlgorithmFactory`

- **Context**: T1 scoping.
- **Finding**: `tools/melk/emit.ts:420-436` emits a per-algorithm `IFactory` class, as ELK's generated code does;
  `AlgorithmFactory` is only used by tests (`GraphValidatorTest`) and hand-written code.
- **Impact**: `AlgorithmFactory`'s TS constructor shape is free (provider constructor + nullable parameter).
- **Confidence**: High

## Observation: providers and their generated options must land in one commit

- **Context**: codegen ordering.
- **Finding**: a type in `PENDING_TYPES` suppresses its `*LayouterOptions.ts` entirely, and the provider imports that
  file; each un-hold regenerates `CoreOptions.ts`.
- **Impact**: provider tasks form a serial chain (T8 → T10 → T12 → T14) and each flips its own tripwires.
- **Confidence**: High

## Observation: `TestController` pulls `alg/ILayoutProcessor` into the engine's closure

- **Context**: dependency closure of `RecursiveGraphLayoutEngine`.
- **Finding**: the engine imports `TestController`, which imports `core.alg.ILayoutProcessor`.
- **Impact**: that one interface ports with 5a; the rest of `core.alg` stays in 5b.
- **Confidence**: High
