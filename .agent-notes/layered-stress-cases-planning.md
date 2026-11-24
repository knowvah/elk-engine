<!-- SPDX-License-Identifier: EPL-2.0 -->

# layered-stress-cases: planning notes (issue #58)

## Observation: the label metrics table holds 2,317 entries, not 2,258

- **Context**: Checking ruling item 2 of #58 against `test/golden/refs/java/layered-label-metrics.json` at `32ca890e`.
- **Finding**: The table and `tools/vectors/layered-label-metrics-texts.txt` both hold 2,317 texts, in the same order.
  7g and 7h appended to it after the ruling's count was taken. None of the four new texts is present yet.
- **Impact**: "every existing entry byte-identical" means 2,317 entries. The recorder rewrites the whole file, so
  verify with a diff before installing (D5).
- **Confidence**: High

## Observation: the compound recorder does not walk the vendored compound/ tree

- **Context**: Checking whether vendoring two `.elkt` files under `test/golden/inputs/compound/` changes a recorder's
  inputs.
- **Finding**: `tools/vectors/LayeredCompoundVectors.java` reads an explicit `MODEL_TABLE` (sha256 + path, from
  `:380`). The two stress models stay "out of scope (algorithm)" on its classpath. `algorithm-refs.test.ts:527`
  asserts the exact inventory of `test/golden/inputs/manifest.json`, so any vendored file needs a row there and an
  entry in the test.
- **Impact**: Vendoring for a runner suite needs no recorder rerun, but it does need the inventory test changed.
- **Confidence**: High

## Observation: Java registers providers in alg.test, not in the suite bundle

- **Context**: Deciding where `elk.stress` gets registered.
- **Finding**: `PlainJavaInitialization.java:42-53` (alg.test) registers all ten providers. `alg.layered.test`'s
  manifest does not require `alg.force`. The TS runner (`test/helpers/layout-test-runner.ts`) registers only layered.
- **Impact**: Runner-level registration is the faithful seat. Re-registration duplicates the category entry (#120), so
  guard with a probe.
- **Confidence**: High

## Observation: the queue driver swaps labels and relaxes write-sets

- **Context**: Writing T6's close-out.
- **Finding**: `.claude/mission-driver.sh` in the main checkout swaps `queue:planned` for `queue:on-branch` (`:358`).
  Its execution prompt (`:314`) treats a task's write-set as a plan, not a limit.
- **Impact**: Briefs must not swap labels themselves, and must not make an in-worktree write outside the write-set a
  halt.
- **Confidence**: High
