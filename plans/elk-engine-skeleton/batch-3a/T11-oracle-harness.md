<!-- SPDX-License-Identifier: EPL-2.0 -->

# T11 — Oracle harness

**Agent:** java-architect · **Commit:** `build(oracle): add batch json layout harness`

## Context
T8 built ELK from source at `$ELK_ORACLE_DIR` and wrote
`oracle-build.json` (contract in `batch-2b/T8-oracle-build.md`). This task
adds the program that turns ELK JSON input into laid-out ELK JSON — the
reference every golden and future conformance check uses. One JVM must
process a batch (JVM startup is the cost driver).

## Task
Write `ElkOracle.java` and `run.sh`; prove them on one elk-models JSON file.

## Write-set
`tools/oracle/harness/ElkOracle.java`, `tools/oracle/run.sh`.

## Read-set
- `$ELK_ORACLE_DIR/oracle-build.json`
- `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.test/src/org/eclipse/elk/alg/test/PlainJavaInitialization.java`
  (which `*MetaDataProvider`s to register — register all in-scope ones;
  **skip** grandom / graph.text standalone setups)
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph.json/src/org/eclipse/elk/graph/json/ElkGraphJson.java:40-230`
  (`forGraph(String).toElk()`, `forGraph(ElkNode)` export builder)
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core/RecursiveGraphLayoutEngine.java`
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph/META-INF/MANIFEST.MF` and
  in-scope bundles' manifests (third-party `Require-Bundle` names)
- `../decisions.md#ad-3…`, `#ad-15…`

## Specification
- `ElkOracle.java`: `main(outDir, input...)`. Register metadata providers
  once. For each input: read UTF-8 → `ElkGraphJson.forGraph(text).toElk()`
  → `new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor())`
  → `ElkGraphJson.forGraph(graph).omitLayout(false).omitZeroDimension(false)
  .omitZeroPositions(false).omitUnknownLayoutOptions(true).prettyPrint(true).toJson()`
  → write `<outDir>/<basename-without-ext>.json` (UTF-8, trailing
  newline). Catch per input: print `ERROR <input>: <exception>` to stderr,
  continue. Exit 1 if any failed, else 0. No Guava/third-party use beyond
  what ELK requires.
- `run.sh` (bash, `set -euo pipefail`, SPDX, shellcheck-clean):
  resolve root and `ELK_ORACLE_DIR` (default `<root>/../elk-oracle`);
  require `oracle-build.json`; classpath = its `jars` values + third-party
  jars from Tycho's local p2 cache
  (`~/.m2/repository/p2/osgi/bundle/<bsn>/<version>/*.jar`) for the
  bundles named in the in-scope manifests' `Require-Bundle`
  (guava, gson, emf.common, emf.ecore, emf.ecore.xmi, xtext.xbase.lib,
  xtend.lib, …) — pick the version Tycho resolved (newest present) and
  print it; compile `ElkOracle.java` with `javac` into
  `$ELK_ORACLE_DIR/harness-classes/` when stale; run
  `java -cp … ElkOracle "$@"`. Never write inside the repo except the
  caller-supplied `outDir`.

## Interface contract (output; consumed by T16)
`tools/oracle/run.sh <outDir> <input.json>...` → for each input,
`<outDir>/<basename>.json` = laid-out ELK JSON (pretty, all positions and
sizes present). Exit 0 iff every input succeeded; per-input errors on
stderr as `ERROR <input>: <message>`.

## Acceptance criteria
- Given a small elk-models JSON with ports and labels, when `run.sh`, then
  the output has `x`, `y`, `width`, `height` on every node, port, and
  label, and every edge has `sections`.
- Given the same input run twice in separate invocations, then outputs are
  byte-identical (if not: the graph lacks a fixed `randomSeed` — journal
  it and pick a deterministic input; never add a seed silently).
- Given one malformed input among two valid ones, then both valid outputs
  are written and the exit code is 1 with one `ERROR` line.

## Quality bar
Gates in README.md (brief). `shellcheck tools/oracle/run.sh` clean. Java
methods ≤ 30 lines.

## Observability
Per-batch wall time printed to stderr.

## Rollback
Reversible — revert the commit; harness classes live outside the repo.
