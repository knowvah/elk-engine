<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 4: corpus and runner evidence, and regenerating refs

Both tasks are the orchestrator's. They run JVM sweeps and the regen scripts, which write the oracle directory and
`test/golden/refs/`. They run one after the other, T4 first, so that two JVM-heavy runs never overlap. Check `uptime` before
each JVM run.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| [T4](T4-corpus-and-runner-evidence.md) | Corpus size comparison (skip-gated test), fixed-mode runner parity | orchestrator | `test/corpus/label-sizing-sweep.test.ts` | T2, T3 | [x] |
| [T5](T5-regen-refs.md) | Regen scripts (the `patches` stamps), fresh oracle and TS sweeps, parity report | orchestrator | the nine `test/golden/refs/*/_meta.json`, `docs/parity-report.md` | T1 | [x] |

Gate after the batch: the batch gates of [README.md](../README.md#quality-gates);
`git diff --stat <base> -- test/golden/refs/` lists only the nine `_meta.json` files and the new `java/label-sizing.json`.
