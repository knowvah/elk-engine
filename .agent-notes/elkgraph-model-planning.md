<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning observations — elkgraph-model (2026-10-12)

## Observation: EMF source is EPL-2.0 and present in the p2 cache

- **Context**: Deciding how to port the ElkGraph EMF behaviour (D1).
- **Finding**: `~/.m2/repository/p2/osgi/bundle/org.eclipse.emf.{common,ecore}.source/2.37.0.*/`
  hold the sources; `about.html` states EPL-2.0. Unlike OpenJDK (AD-9, GPLv2), EMF source may be
  read and ported. The built oracle worktree already has `org.eclipse.elk.graph-0.13.0-SNAPSHOT.jar`
  (listed in `../elk-oracle/oracle-build.json`), so a graph-vector generator needs no Maven.
- **Impact**: `src/emf/` shims and `tools/vectors/GraphVectors.java` have everything locally.
- **Confidence**: High

## Observation: nothing in scope uses `GraphIdentifierGenerator` or `ElkPersistentEntry`

- **Context**: Scoping `graph.util` / `graph`.
- **Finding**: `GraphIdentifierGenerator` is referenced only by the two `.ui` `ConvertGraphHandler`
  classes (out of scope). `ElkPersistentEntry` has no impl class and no caller. `ElkGraphSwitch`
  and `ElkGraphAdapterFactory` are used only inside `GraphIdentifierGenerator`.
- **Impact**: Kept the generator (user decision); dropped the other three.
- **Confidence**: High

## Observation: EMF-specific calls that survive outside `graph`

- **Context**: Sizing the D4 EObject surface.
- **Finding**: In-scope callers use `eContainer()` (ElkUtil:1154, ElkGraphTransformer:69,
  InteractiveLayeredGraphVisitor:373-401, GridElkNode), `eAllContents()` (ElkUtil:989,
  GraphIdentifierGenerator), `eClass().getName()` (ElkUtil:1162, GraphValidator:85-104),
  `ECollections.sort` on `getPorts()`/`getChildren()` (ElkGraphAdapters:323, NodeSizeReorderer:43),
  `EcoreUtil.getRootContainer` (layered ElkGraphImporter:603), `EcoreUtil.copy` (debug only,
  BasicProgressMonitor:433), `eIsSet` (graph.text formatter:172-195, GridElkNode). Many `eSet(`
  grep hits are `TreeSet(` false positives.
- **Impact**: D4 lists exactly the first five; `eIsSet` is deferred to mission 4b.
- **Confidence**: High

## Observation: `PropertyTest` lives in core.test and needs core classes

- **Context**: Porting the graph tests (AD-13).
- **Finding**: `PropertyTest` (core.test, `graph.properties` package) calls
  `LayoutMetaDataService.getInstance()` only for its `ElkReflect` registrations
  (`LayoutMetaDataService.java:125-156`) and uses `KVector`, `KVectorChain`, `ElkMargin`,
  `ElkPadding`, `PortSide`, `SizeConstraint`, `EnumSet`, `Lists`, `Sets`.
- **Impact**: Those classes were pulled into mission 2 (user decision); the test registers the
  cloners itself until mission 5.
- **Confidence**: High

## Observation: `for b in $VAR` does not word-split in zsh

- **Context**: Counting EMF call sites across bundles in one loop.
- **Finding**: Under the zsh Bash tool, `for b in $IN` iterates once over the whole string, so
  every grep silently reported 0 files. `${=IN}` (or an array) restores splitting.
- **Impact**: A zero-hit survey from a loop over a space-separated variable is suspect; check
  the loop before trusting the count.
- **Confidence**: High

## Observation: docs-site was merged by rebase, not merge commit

- **Context**: Choosing the mission 2 branch base.
- **Finding**: `origin/main` carries 49 rebased docs-site commits (new SHAs); the remote branch
  was deleted; the local `feature/docs-site` has one extra journal commit (`fa0981d`) that never
  reached `main`.
- **Impact**: Local `main` fast-forwarded to `be4ddbd`; the stray journal line is the user's call.
- **Confidence**: High
