<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3 — Oracle `.elkt` input, parse-only, case-file mode

**Agent:** java-architect · **Commit:** `feat(oracle): read elkt models and run id-keyed case files`

## Context
The oracle harness (`tools/oracle/harness/ElkOracle.java`, 112 lines) reads ELK JSON only and
names outputs by input basename, which must be unique per run. elk-models has 217 basenames that
collide across different model paths, and 898 models exist only or also as `.elkt`. The oracle
worktree already builds `org.eclipse.elk.graph.text-*.jar` but `oracle-build.json` does not
record it. ELK's own test setup for `.elkt` is `PlainJavaInitialization.java:72-91`
(`ElkGraphStandaloneSetup.doSetup()`, then `ResourceSet.getResource`).

## Task
Add `.elkt` input to every mode, a parse-only mode (no layout), and a case-file mode keyed by id.

## Write-set
`tools/oracle/harness/ElkOracle.java`, new `tools/oracle/harness/*.java` helpers,
`tools/oracle/run.sh`, `tools/oracle/build.sh`, `tools/oracle/README.md`.

## Read-set
- `../decisions.md#d3--model-id-and-source`, `#d4--verdicts`
- `tools/oracle/harness/ElkOracle.java:31-112` · `tools/oracle/run.sh:1-73` ·
  `tools/oracle/build.sh:120-164` · `docs/conformance.md:22-60`
- `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.test/src/org/eclipse/elk/alg/test/PlainJavaInitialization.java:60-91`
- `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.test/src/org/eclipse/elk/alg/test/framework/graph/GraphFromFile.java:104-118`
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph.text/META-INF/MANIFEST.MF` (Xtext/ANTLR bundles to add)

## Interface contract (output, consumed by T4, T5, T8)
- Case file: JSON Lines, one `{ "id": string, "input": string, "mode": "layout" | "parse" }`.
- Output: `<outDir>/<id with "/" replaced by "__">.json`.
- Result: one stdout JSON line per case,
  `{ "id", "status": "ok" | "throws" | "oracle-error", "exception"?: { "class", "message" }, "ms" }`.
  `throws` = the ELK call threw; `oracle-error` = the harness itself failed (I/O, setup).
- The existing positional form `run.sh <outDir> <input.json>...` keeps working unchanged
  (`regen-goldens.sh` uses it).

## Specification
- `build.sh`: record the jars of all three D0 bundles (`graph.text`, `graph.json.text`,
  `core.debug.grandom`) in `oracle-build.json`; all three are already built in the oracle
  worktree (verified at planning). T6 relies on the grandom entry. Recording only: rerun
  `build.sh` to refresh `oracle-build.json`; no Maven flag changes.
- `run.sh`: classpath adds the `graph.text` jar and its third-party bundles from `P2_BUNDLES`
  (Xtext, Xtext util, Xbase lib, Xtend lib, ANTLR runtime, Guice/javax.inject as needed);
  `die` naming the missing bundle as today.
- Output JSON uses the same exporter settings as today (layout, zero dimensions, zero positions,
  unknown options omitted), for both modes.
- Parse failures (Xtext resource errors) are `throws` with the first error as message.

## Acceptance criteria
- Given `examples/general/direction.elkt`, when run in layout mode, then status `ok` and the
  output JSON has positions on every node.
- Given the same file in parse mode, then the output has no layout-produced coordinates beyond
  those in the `.elkt` text.
- Given two cases whose inputs share a basename in different folders, then both outputs exist
  under their ids.
- Given the four goldens, when `tools/oracle/regen-goldens.sh` runs, then
  `git diff --exit-code test/golden/refs` is clean.
- Given `shellcheck tools/oracle/run.sh tools/oracle/build.sh`, then it is clean.

## Quality bar
README gates plus the oracle gates. bash 3.2 compatible (`.agent-notes/elk-engine-skeleton.md`).

## Observability
Per-case result line with `ms` (the sweep's latency measure). No other instrumentation.

## Rollback
Reversible — revert the commit; rebuild the oracle so `oracle-build.json` drops the jar.

## Boundaries
No retarget, variants, timeout, or generate mode (T5, T6). Never edit `$ELK_SOURCE_DIR` or the
oracle worktree's sources.
