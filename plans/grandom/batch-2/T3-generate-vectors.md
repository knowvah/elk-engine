<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3 — Generate recorder and scenarios

**Agent:** java-architect · **Commit:** `test(T3): record grandom generate vectors`

## Context
D1 ([decisions.md](../decisions.md#d1--evidence-and-exit)). The harness is the reference for setup and export:
`tools/oracle/harness/GrandomGenerator.java` (setup, root id `"root"`) and `CaseRunner.export`
(`tools/oracle/harness/CaseRunner.java:86-94`). The recorder must reproduce those exactly so its graph rows equal the
corpus bytes (stop 7). Unseeded paths: edge labels (`BlindTextGenerator`), cross-hierarchy `sample()`
(`Collections.shuffle(list)`), configs without `seed`.

## Task
1. `ElkrGenerateVectors.java` over `elkr-generate-scenarios/*.elkr` (sorted) → `grandom-generate.json`, three row
   kinds:
   - **seeded:** `{id, input, kind: "seeded", configs: [{options: [{key, value}], graphs: [<export string>]}]}`.
     `options` = every `GeneratorOptions` property `ConfigurationParser.parse` set or defaulted, in
     `GeneratorOptions` declaration order (`RandVal` as `{min, max, mean, stddv, kind}` as stored), produced from a
     fresh `Random(seed)` exactly as `generate(Configuration)` does (`RandomGraphGenerator.java:110-123`: one
     `parse` per configuration, then `max(1, samples)` graphs from the same `Random`; each configuration gets its
     own `new RandomGraphGenerator(null)`). `graphs` = each sample's root (id `"root"` when unnamed) exported with
     `CaseRunner.export`'s flags.
   - **unseeded:** `{id, input, kind: "unseeded", invariants}`: per graph, node count per hierarchy level, edge,
     port and label counts, root child count; label texts masked (never recorded). Design these scenarios so the
     invariants cannot depend on the unseeded draws (exact quantities, no `+/-` or `to` ranges where the seed is
     absent); record each twice and require equal invariants.
   - **randval:** `{id, seed, kind: "exact|minMax|gaussian", params, draws: {val: [...], intVal: [...],
     floatVal: [...]}}` — 20 draws each from a fresh `Random(seed)` per method.
2. Scenarios (~35–45 `.elkr` files, plus the 9 corpus inputs copied byte for byte as `corpus-<name>.elkr`): every
   `Form`; every edge mode (`density`, `total`, `relative`, `outgoing`); `self loops`; ports with `re-use`,
   `constraint` (all five), every `Flow` side/type, port `size`, port `labels`; node `size` (height/width each alone
   and both), node `labels`, `remove isolated`; quantities in all three `DoubleQuantity` forms; `maxWidth`/`maxDegree`
   on trees; `partitionFraction` on bipartite; `hierarchy` with `levels` and `compound nodes` (no cross-hierarchy
   edges: seeded); `samples > 1`; `generate 0` (still one graph); a file with two configurations; one 200-node
   stress scenario; unseeded: `edges ... { labels }`, `cross-hierarchy edges`, `cross-hierarchy relative edges`, a
   config without `seed`.
3. Determinism: run the recorder twice into two dirs and `cmp`; any seeded difference is stop 7.
4. Export check: the `graphs[0]` string of each `corpus-*` row + `"\n"` equals `test/corpus/generated/<name>.json`
   byte for byte (state the check in the commit body); a difference is stop 7.
5. Run `tools/vectors/elkr-vectors.sh test/golden/refs/java`.

## Write-set
`tools/vectors/ElkrGenerateVectors.java`, `tools/vectors/elkr-generate-scenarios/**`,
`test/golden/refs/java/grandom-generate.json`.

## Read-set
`tools/oracle/harness/{GrandomGenerator,CaseRunner}.java`, `ConfigurationParser.xtend`,
`GeneratorOptions.java`, `RandomGraphGenerator.java:80-140` (seeding), `test/corpus/generated/*.elkr`.

## Interface contracts (outputs)
`grandom-generate.json` rows as above; consumed by T7 (randval), T10 (options), T12–T14 (graphs, invariants).

## Acceptance criteria
- Given two recorder runs, when `cmp`'d, then identical.
- Given each `corpus-*` row, when its export + `"\n"` is compared with the corpus `.json`, then byte-identical.
- Given the seeded rows, when tallied, then every item of the coverage list in step 2 appears at least once.
- Given an unseeded row, when inspected, then it holds no label text and no graph export.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
