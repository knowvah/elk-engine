<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: evidence for alg.libavoid, alg.graphviz.dot, alg.graphviz.layouter

## Context

Roadmap row 11 (#42) asks for skip / port / delegate per bundle, with evidence (callers, browser safety, dependency rules,
effort). This task gathers the evidence only; T2 writes the ADR from it. Read [decisions.md](../decisions.md) DB5 and DB7 and
the planning evidence under "Auto-confirmed › DB5" (re-run it; do not copy it).

## Task

Write `plans/deferred-bundles-adr/evidence.md`: one section per bundle, each with the DB5 rows as a table
(`| Row | Finding | Source (command or file:line) |`), then a short "options" paragraph per bundle stating which rows favour
skip, port, and delegate. Every finding cites the command that produced it or a `file:line` at the pin. Read the Java with
`git -C $ELK_SOURCE_DIR show 8aaa3c14:<path>` / `git grep … 8aaa3c14 -- …` (the checkout's HEAD is past the pin).

Rows to cover (DB5), at minimum:

1. Java LOC: hand-written `.java`/`.xtend`/`.melk`/`.xtext`, and `src-gen` counted separately (inventory: 1,548; 2,728 +
   40 `src-gen` files; 1,743; reconcile any difference).
2. `Require-Bundle` and which entries are outside the in-scope set (`tools/bundle-deps.ts:29-46`): Xtext, ANTLR, Eclipse UI,
   `core.service`.
3. External process: `LibavoidServer.java:214`, `GraphvizTool.java:206`; what binary, what protocol (stdin/stdout text).
4. In-scope callers: `git grep -n -i 'libavoid\|graphviz'` at the pin over every in-scope plugin and test bundle; expected
   only `AbstractLayoutProvider.java:31-33` (Javadoc) and `shared.test/MANIFEST.MF:13`; check which shared-test classes the
   port already has and whether any needs `graphviz.layouter` at runtime.
5. ELK tests that exercise each bundle (test bundles at the pin).
6. Corpus use: elk-models grep for the algorithm ids (`org.eclipse.elk.graphviz.*`, `org.eclipse.elk.alg.libavoid`, short
   ids) and `test/corpus/census.json` algorithm counts.
7. Browser safety: what in each bundle cannot run in a browser (process exec, files, threads, Eclipse preferences).
8. Oracle feasibility under AD-3: whether goldens would depend on an unpinned external binary (Graphviz version,
   libavoid-server build) and so break AD-1's "Java is the spec".
9. Licences of external components from a tier-1 source (Adaptagrams libavoid repository licence file; Graphviz licence),
   fetched with WebFetch and cited by URL; dot-engine's from `../dot-engine/package.json` and `LICENSE`.
10. Dependency rules: CLAUDE.md "Zero runtime dependencies", "Browser-safe `src/`", YAGNI; AD-14 (first publish freezes the
    surface; idiomatic wrappers are a later layer).
11. Effort: tasks at 600-800 Java LOC each (roadmap header), plus the parser-pattern cost for `GraphvizDot.xtext` by analogy
    with `graph.text` (roadmap row 4b: 1,352 LOC, ~8 tasks).
12. dot-engine surface (read only, `../dot-engine`): public entry points, engines matching `Graphviz.melk`'s five algorithms,
    DOT parse and output formats a delegate could consume, its conformance bar (±0.01) against this repo's 1e-6 (AD-4).
13. The fitness enforcement of "not ported" (DB4: `module-boundaries.fitness.test.ts:306,322,342`).

## Write-set

`plans/deferred-bundles-adr/evidence.md` only.

## Read-set

`../elk` at the pin (three bundles, `core/AbstractLayoutProvider.java`, `test/org.eclipse.elk.shared.test`),
`docs/architecture/inventory.md:38-40`, `docs/architecture/port-map.md:620-630`, `tools/bundle-deps.ts:29-46`,
`test/architecture/module-boundaries.fitness.test.ts:300-350`, `test/corpus/census.json`, `$ELK_MODELS_DIR` (grep only),
`../dot-engine/{README.md,package.json,LICENSE,docs/conformance.md}` and its `src` exports.

## Acceptance criteria

- Given the three bundles at the pin, when `evidence.md` is read, then every DB5 row has a finding and a source per bundle.
- Given the in-scope grep, when it is re-run from the command in `evidence.md`, then it returns exactly the listed hits.
- Given a licence finding, when checked, then it cites a fetched URL (tier 1), not memory.
- Given any row that could not be established, then it says "unknown" with what was tried.

## Observability / rollback

N/A — no new observable operations. Reversible (a plan document).
