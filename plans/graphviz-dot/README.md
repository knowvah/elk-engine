<!-- SPDX-License-Identifier: EPL-2.0 -->

# graphviz-dot: mission brief (issue #95, step 2)

## Objective

Port the `alg.graphviz.dot` bundle ("ELK Graphviz Dot Language Parser") to `src/alg/graphviz/dot/`. That means the DOT model, a
hand-written lexer and parser for `GraphvizDot.xtext`, the DOT writer (grammar-specific sequencers, `GraphvizDotFormatter` and
`GraphvizDotSerializer`), and the `transform` package (`DotExporter`, `DotImporter`, `Attributes`, `Command`, `NeatoModel`,
`OverlapMode`, `IDotTransformationData`, `DotTransformationData`). Each piece is proven against JVM vectors recorded **before**
its code (AD-13). This is step 2 of #95. Step 1 landed with #88 (`deferred-bundles-acceptance`). Steps 3-5 and the end-to-end
suite are not part of this mission ([D0](decisions.md#d0-source-and-scope)).

Exit:

- Every Java file of the bundle is ported to its TS file or omitted with a journaled reason (the table in
  [D1](decisions.md#d1-port-map)).
- The `graphviz-dot-*.json` vectors ([D6](decisions.md#d6-evidence)) are green in CI. The ElkGraph `.elkt` writer refs
  (`test/golden/refs/java/graph-text-write.json`, `test/golden/refs/elkt-parse/`) stay byte-identical after the autowrap
  extension ([D3](decisions.md#d3-xtext-autowrap)).
- The local export sweep has run: every elk-models `.elkt` goes through `DotExporter.transform` and is serialized, and the
  result is byte-exact against the oracle. Parsing that text back gives the same model. Counts are in the journal and in
  `docs/conformance.md`.
- `docs/architecture/graphviz-dot.md` is written and indexed in `docs/architecture/overview.md`. `inventory.md`, `port-map.md`
  and `docs/conformance.md` show the bundle as ported.
- The remainder of #95 (step 3; the end-to-end suite) is filed as a `follow-up` issue, blocked by the step 4 ruling
  ([D11](decisions.md#d11-the-remainder-of-95)).
- Queue gates 1-7 are green and journaled. There is one squashed commit on the base. `plans/roadmap.md` gains
  `## Revision <date> (graphviz-dot)`, and `.agent-notes/graphviz-dot.md` is written.

**Not in this mission:**

- `alg.graphviz.layouter` (#95 step 3): `GraphvizLayoutProvider`, `LayoutDotExporter`, `GraphvizTool`, `GraphvizException`,
  `Graphviz.melk` and its `sync-sources.sh` entry.
- How the runner is injected (#95 step 4). This waits for the maintainer: #177 (`needs-ruling`), filed by planning
  ([D0](decisions.md#d0-source-and-scope)).
- The dot-engine adapter (step 5, blocked by knowvah/dot-engine#220), the end-to-end suite, and pinning Graphviz in the oracle
  build.
- Any export from `src/index.ts` (the public API is frozen at 72 exports; AD-14). The entry point is internal
  ([D5](decisions.md#d5-entry-point)).
- Any landed ref, golden or expected value, any oracle patch, any `ELK_COMMIT` change, and any write to `~/git/knowvah/elk`.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full. The queue rules in your system prompt override it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md), [decision-journal.md](decision-journal.md) and
   `.agent-notes/graphviz-dot-planning.md`. Then read `.agent-notes/graph-text.md`, `.agent-notes/text-follow-ups.md` and
   `.agent-notes/deferred-bundles-acceptance.md` (if present), `plans/graph-text/decisions.md` (G1-G8; this mission copies its
   writer architecture) and `docs/architecture/elk-text.md`. Run `gh issue view 95 --comments` and `gh issue view 173`.
3. Check that `git branch --show-current` prints `chore/issue-queue`. If the brief is not committed, run
   `git add plans/graphviz-dot .agent-notes/graphviz-dot-planning.md`, then
   `git -c commit.gpgsign=false commit -m "docs(plans): add graphviz-dot mission brief"`. Record the squash base in the
   journal: the driver's base if the prompt names one, otherwise that commit's parent (`ecb127a6` at planning).
4. Oracle: `~/git/knowvah/elk-oracle/oracle-build.json` must name `8bca22f4…` and patches 0001-0004. That held at planning
   (`builtAt` 2026-11-21T05:47:58Z). Otherwise rebuild with `tools/oracle/build.sh` and journal it (stop 9). T1 then adds the
   graphviz.dot jar to the record ([D8](decisions.md#d8-oracle-jar)).
5. Baseline: see the journal's `plan` rows. Rerun it only if the base sha differs from `ecb127a6`.
6. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Blast radius

**Data model:** none persisted. The DOT model is new, in-memory, and internal. **API contracts:** none. Nothing is exported, and
`src/index.ts` and `src/layout.ts` do not change. **Service dependencies:** none at runtime. The oracle gains one recorded jar
(no patch, no rebuild of sources). **Files:**

| File | Action | Task |
| ---- | ------ | ---- |
| The journal, the README batch table | Modify | orchestrator (every task) |
| `tools/oracle/build.sh` (`BUNDLES`), `test/architecture/module-boundaries.fitness.test.ts` (`XTEXT_CLIENT_BUNDLES` plus one test) | Modify | T1 |
| `tools/vectors/dot-vectors.sh`, `tools/vectors/DotJdkVectors.java`, `DotLexerVectors.java`, `DotParseVectors.java`, `DotWriteVectors.java`, `tools/vectors/dot-lexer-cases.txt`, `tools/vectors/dot-parse-scenarios/`, `tools/vectors/dot-graphviz-output/` (fixtures) | Create | T2 |
| `tools/vectors/DotExportVectors.java`, `DotImportVectors.java`, `tools/vectors/dot-export-scenarios/`, `tools/vectors/dot-import-scenarios/`, `tools/oracle/dot-export-sweep.sh`, `tools/oracle/DotExportSweep.java` | Create | T3 |
| `test/golden/refs/java/graphviz-dot-{jdk,lexer,parse,write}.json` | Create (by script) | T2 |
| `test/golden/refs/java/graphviz-dot-{export,import}.json` | Create (by script) | T3 |
| `src/alg/graphviz/dot/dot/*.ts` (model, enums, `DotFactory`, `DotSwitch`, `DotPackage` feature literals) with tests | Create | T4 |
| `src/java/util/StringTokenizer.ts` with its test | Create | T5 |
| `src/xtext/formatting2/**` (autowrap: listed per file in T6) with tests | Modify / Create | T6 |
| `src/alg/graphviz/dot/parser/*`, `src/alg/graphviz/dot/conversion/*` (if the vectors need converters) with tests | Create | T7 |
| `src/alg/graphviz/dot/serializer/*`, `src/alg/graphviz/dot/formatting2/GraphvizDotFormatter.ts`, `src/alg/graphviz/dot/services/GraphvizDotGrammarAccess.ts` with tests | Create | T8 |
| `src/alg/graphviz/dot/GraphvizDot.ts` (entry point) with its test | Create | T9 |
| `src/alg/graphviz/dot/transform/{DotExporter,Attributes,Command,NeatoModel,OverlapMode,IDotTransformationData,DotTransformationData}.ts` with tests | Create | T10 |
| `src/alg/graphviz/dot/transform/DotImporter.ts` with tests | Create | T11 |
| `tools/oracle/dot-export-compare.ts` (if T3 left none), `docs/architecture/graphviz-dot.md` (new), `docs/architecture/overview.md`, `inventory.md`, `port-map.md`, `docs/conformance.md`, `docs/translation-rules.md` (only if a new rule row is needed) | Create / Modify | T12 |
| `plans/roadmap.md` (appended section), `.agent-notes/graphviz-dot.md` | Modify / Create | T13 |

No package, env var or database change. `tools/codeql/accepted.json` changes only if a CodeQL finding is a Java-faithful quirk
or a proven false positive (queue gate 6), and each such entry is journaled.

## Quality gates

After each task: its own tests, `npm run typecheck`, `npx prettier --check <changed files>` and `npm run complexity` (read the
report, not the exit code). Then `tools/vectors/dot-vectors.sh test/golden/refs/java && git diff --exit-code test/golden/refs/`
once T2 and T3 have landed. After T6, and again in T13, also run `tools/vectors/elkt-vectors.sh test/golden/refs/java` and
`tools/oracle/regen-elkt-refs.sh`, then `git diff --exit-code test/golden/refs/`: the `.elkt` writer must not move. T13 runs
queue gates 1-7. Before a JVM run, check `uptime`, wait while it is above 12, and run under `nice -n 10`. Start the full suite
and the sweep detached with `nohup ... ; echo "exit $?"`, as the queue rules show, and poll for at most 9 minutes at a time.

## Stop conditions and push-forward

See [stop-conditions.md](stop-conditions.md). The likeliest to fire are stop 6 (a vector that only Xtext's generic sequencer
or formatter code beyond the D3 subset can meet) and stop 8 (a frozen count in a fitness test, as in #173).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Mission start; JVM recorders and refs (before any code) | T1, T2, T3 | — | [x] |
| [2](batch-2/overview.md) | Foundations: DOT model, `StringTokenizer`, Xtext autowrap | T4, T5, T6 | 1 | [x] |
| [3](batch-3/overview.md) | Language: lexer and parser; writer | T7, T8 | 2 | [x] |
| [4](batch-4/overview.md) | Entry point; `DotExporter`; `DotImporter` | T9, T10, T11 | 3 | [x] |
| [5](batch-5/overview.md) | Export sweep and docs; close-out and squash | T12, T13 | 4 | [x] |

## Execution model

Recommended executor: `fable`.

- The orchestrator owns T1, T12 and T13, every commit, every `gh` call, `plans/` and `.agent-notes/`.
- Within each batch the tasks have disjoint write-sets. Run them as parallel subagents (`claude`, opus, with the Opus scope
  compensation of `~/.claude/rules/model-routing.md`, plus the reminder that a ported source is not ambiguous scope). Prompt
  each with its task file and its batch's common rules. If a headless session forces them into the foreground, run them one
  after another in task order.
- Track each budget from the subagent's spawn time, and check in at least every 9 minutes.
- Commit after each task with `git -c commit.gpgsign=false commit -F <file>`, subject `<type>(graphviz-dot): <desc>`. T13
  squashes the commits.

**Time:** about 8-10 h. T2 and T3 take about 90 min each, side by side (the recorders, their scenarios and the JVM runs). T6
takes about 90 min (Xtext autowrap is the least certain piece). T7, T8, T10 and T11 take 60-90 min each. The local export sweep
in T12 runs detached (898 models, about 30-60 min).

## Landing

1. Tag the tip `graphviz-dot/pre-squash`.
2. Run `git reset --soft <base>`, then one `git -c commit.gpgsign=false commit -F <file>` with the message of T13. The footer
   is `Refs: #95`, with no attribution lines.
3. Never push.

## Reference

- [decisions.md](decisions.md) holds D0-D11, the auto-confirmed record and operational readiness.
- [stop-conditions.md](stop-conditions.md), [diagrams/component-map.md](diagrams/component-map.md) and
  [diagrams/data-flow.md](diagrams/data-flow.md).
- Spec: `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.graphviz.dot/` (`src/` is the port source; `src-gen/` is the edge-case
  spec for the lexer, parser and sequencers, never ported line by line). The Xtend compiled to Java is at
  `$ELK_ORACLE_DIR/plugins/org.eclipse.elk.alg.graphviz.dot/xtend-gen/`.
- Xtext 2.36 EPL source (allowed; AD-9 forbids only OpenJDK):
  `~/.m2/repository/.cache/tycho/https/eclipse.mirror.rafal.ca/releases/2024-09/202409111000/plugins/org.eclipse.xtext.source_2.36.0.v20240825-0714.jar`.
- Precedent: `plans/graph-text/` (G1 writer, G5 diagnostics, G6 lexer) and the code in `src/graph/text/` and `src/xtext/`.

## Mission summary (2026-11-24)

Completed 2026-11-24: 13 of 13 tasks. No halt and no partial row. One planned test was not written because the Java
contradicts its premise (D9, stop 3 for that part), and the write-set grew where the work needed it (journaled each time).

- **Result.** The `alg.graphviz.dot` bundle is ported to `src/alg/graphviz/dot/` (53 source files, 26 test files) and is
  exact against the JVM on everything recorded: all rows of the six `graphviz-dot-*.json` refs replay (1,735 rows and
  cases), and the local export sweep agrees on 898 of 898 elk-models (822 texts byte-identical with an equal parse-back,
  76 matching throws).
- **Landed.** The DOT model; the hand-written lexer and parser with ANTLR 3 recovery; the writer (sequencers, formatter,
  serializer) with Xtext's autowrap path ported into `src/xtext/formatting2`; the internal entry point `GraphvizDot`;
  `DotExporter`, `DotImporter` and the transform types; the shims `StringTokenizer`, `JavaFloat`, `JavaBoolean`; six JVM
  recorders with their scenarios, 14 real Graphviz outputs as fixtures, `dot-vectors.sh`, the sweep script and its corpus
  test; `docs/architecture/graphviz-dot.md` and the status in the overview, inventory, port map, conformance, translation
  rules and upgrade runbook; the roadmap revision; `.agent-notes/graphviz-dot.md`. No landed ref, vector, golden or
  assertion changed.
- **Not as planned.**
  - D9's claim about the layouter manifest is wrong (it requires Xtext); the forbidding test was left out (T1 `deviation`).
  - The Graphviz fixtures moved from T2 to T3, and `dot-vectors.sh` was written by the orchestrator first so T2 and T3
    could run side by side (`DOT_VECTORS_ONLY`).
  - T5 delivered a float parser, `Float.toString` and `Boolean.valueOf` besides the tokenizer, because the JDK ref
    recorded them (opus instead of sonnet).
  - The model uses the `src/emf` containment classes, not arrays (T4 `decision`).
  - One fix outside the table: `src/emf/ecore/impl/EcoreFactoryImpl.ts` (the `String` cast), with its diagnosis (T7 `fix`).
  - The sweep's port side is `test/corpus/dot-export-sweep.test.ts`; the upgrade runbook gained the two scripts after its
    inventory test failed the first coverage run (T13 `fix`).
  - CodeQL found 12 issues in the new recorders and one test; all fixed, none accepted, refs unchanged (T13 `fix`).
  - Two JVM runs started above the load gate of 12 (53 and 16); both were short and their outputs equal the landed refs.
  - Two subagent hand-backs reported wrong counts; the docs use numbers recomputed from the refs (T8 `correction`).
- **Decisions.** D0-D8, D10, D11 as planned; D9 kept for the dot bundle and corrected for the layouter. Push-forwards: EMF
  containment for the model, the multi-file recorders, the test-only `LayoutDotExporter` twin, the corpus-test form of
  the sweep comparison, AD-10 per map site (no hash order is observable).
- **Gates.** Queue gates 1-7 green on the final tree (T13 `gate`): coverage 1,257 test files (1,248 passed, 9 skipped with the nine phase sweep directories off), 51,919 tests passed and 92 skipped, 98.85 / 97.01 / 98.63 / 98.90 (statements / branches / functions / lines); CodeQL with no new accepted entry;
  refs against the base untouched apart from the six new ones.
- **Issues.** #178 (`follow-up`): the layouter port, step 5 and the end-to-end suite, blocked by #177. #179
  (`follow-up`): every vector cache is cold after the record-only of T1. #173 and #95 have comments. No `needs-ruling`
  issue was filed by the execution (#177 was filed at planning).
- **Planning lesson.** A claim about a bundle's manifest is checked on the manifest (`grep -n Require-Bundle -A12`), and
  a JDK ref is recorded before the shim task is sized: the recorder decides what the shim has to be. Adding a script
  under `tools/vectors` or `tools/oracle` means a row in `docs/architecture/elk-upgrade.md`, and adopting a bundle in
  `build.sh` costs a cold run of every recorder.
