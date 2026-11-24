<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2: record the rows (sequential)

T2, T3 and T4 all edit `tools/vectors/LayeredCompoundVectors.java` and regenerate `layered-compound.json`, so they
run in order, one commit each (D8). The orchestrator may hand the I5 graph search (TS only, scratch files) to one
background subagent while T2 works on I1-I4. The subagent returns graphs, never edits tracked files, and never runs
`git` or `gh`.

| Task | Items | Writes | Depends on |
| ---- | ----- | ------ | ---------- |
| [T2](T2-site-rows.md) | I1, I2, I4, I5 (I8 if T1 found a survivor) | recorder, ref, twins list, site-arms table, sh comment | T1 |
| [T3](T3-models-rows.md) | I3, I6 | recorder, ref, twins list (if a stop is selected) | T2 |
| [T4](T4-monitor-work.md) | I7 | recorder, ref, `layered-compound-replay-sites.ts` (+ its test) | T3 |

After each task: its replay tests, `npm run typecheck`, `npx prettier --check <changed files>`, the D5 id-keyed diff,
and `git diff --exit-code -- test/golden/refs/ ':!test/golden/refs/java/layered-compound.json'`.
