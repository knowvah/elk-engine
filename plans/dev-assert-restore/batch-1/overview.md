<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: the helper, #119, the ten sites and the firing census

Sequential, orchestrator. T1 is green on its own. T2 leaves the suite red by design (sites live, wraps not yet in);
batch 2 turns it green.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T1](T1-helper-and-447.md) | Move `withAssertions` to `test/helpers/`; #119 swap | orchestrator | `test/helpers/with-assertions.ts`, `src/java/lang/DevAssert.test.ts`, `src/alg/layered/issues/Issue447Test.test.ts` | — | [x] |
| [T2](T2-restore-and-census.md) | Restore the ten sites; full-suite census of what fires | orchestrator | the ten site files, `plans/dev-assert-restore/census.md` | T1 | [x] |
