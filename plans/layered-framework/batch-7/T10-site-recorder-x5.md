<!-- SPDX-License-Identifier: EPL-2.0 -->

# T10 — Oracle recorder `LayeredSiteVectors` (re-planned under X5)

**Agent:** java-architect (sonnet) · **Commit:** `test(T10): record layered site vectors from the oracle`

Supersedes [T10-site-recorder.md](T10-site-recorder.md) (kept for the record). Everything that file says still holds
unless this one says otherwise.

## Context

Mission 7a (README), L4 under the user's literal reading (X5, X6). T9 (`plans/layered-framework/unreached.md`) lists
690 branches the framework replays leave untaken: 357 numeric/algorithmic (scenarios S1–S15), 300 structural (J), 4
unreachable (U), 31 excluded factory arms (X). Under X5 the J branches also get oracle rows, grouped as S16–S22 in that
file's "Re-planning input" section. This recorder runs all 22 scenario groups on the oracle and records what the
anchored tests (T11a–T11d) will assert. It follows the 6c `NodespacingSiteVectors` pattern and the T1
`LayeredFrameworkVectors` conventions.

- **Patterns, read first:** `tools/vectors/NodespacingSiteVectors.java` header (row shape, `steps`, round trip,
  stability, cache) and `tools/vectors/nodespacing-site-vectors.sh`; `tools/vectors/LayeredFrameworkVectors.java`
  header and its LGraph dump, path, C4 value encoding and `layerAll` (X4) code — copy what is needed verbatim
  (single-file launchers cannot share code; name the copied line ranges in a comment);
  `tools/vectors/layered-framework-vectors.sh` for the classpath that includes the layered jar.
- **Never edit** `vector-cache.sh`, `JavaVectors.java`, landed refs (`layered-framework.json` included) or other
  recorders; do not run other recorder scripts. AD-9: no OpenJDK or Guava source.
- The T1 recorder (1,858 lines) landed under the same hooks; if a hook blocks a write, report it, do not restructure.

## Design (fixed; the vocabulary within it is yours)

1. **One interpreter.** The recorder builds and exercises every scenario only through its own step interpreter
   (`apply(step)`), never by direct Java calls outside it. A scenario is data: `input` + `steps`. This makes the TS
   replay (T11a) exact by construction: whatever the interpreter can do, the row records.
2. **Row:** `{ id, site, input, steps, expected }`. `id` = `site/<group>/<name>`, unique and stable, the group ids
   below. `site` = the 7a class under test (`LGraphUtil`, `LNode`, …, `enums`, `provider`). `input` = ELK JSON (NS1
   flags, `exportSeed=1`, as T1) imported with `new ElkGraphTransformer().importGraph(root)` (optional `target` as T1),
   or `null` (the interpreter then starts from `new LGraph()` as `g0`). Doubles are 16-hex raw bits; enums, ids and
   class names are strings; property values use T1's C4 encoding.
3. **Steps:** `{ "op": "<Java method>", "on": "<path>", "args": [...], "as": "<label>" }`. `on` addresses an element
   by T1's positional paths (`g0`, `g0/n3`, `g0/n3/p1`, `g0/e2`, `g0/n3/l0`); elements a step creates get the next
   index of their kind on their owner, in creation order, so paths are deterministic. `as` names the result in
   `expected` (omitted for void calls). One op per public Java method used (constructors as `new<Class>`), args as
   hex doubles, strings, enum names, paths or C4 values. Document every op in the header with its Java signature.
   Keep construction ops minimal: prefer `input` JSON wherever the importer can build the structure; use steps for
   what ELK JSON cannot carry (layers, `NodeType`, internal properties, dummies, explicit anchors, margins).
4. **Expected:** `{ <label>: value }` in step order; a call that throws records `{ "exception": { "class":
   "<simple name>", "message": "..." } }` as that label's value and the row continues. Whole-graph results (S11–S15)
   use T1's `lgraph` dump and the NS1 ELK JSON export under labels `lgraph` / `elk`.
5. **Round trip (rows with `input`):** export the prepared graph to `input`, re-import `input` and replay the steps;
   the recorded `expected` is the re-imported run; fail if it differs from the first run. **Stability:** build the
   whole file twice from scratch, byte-identical. **Size:** ≤ 5 MB total (L3); curated-model rows are never trimmed.
6. **Header** `{ jdk, oracle, rowCounts: { "<site>": n }, rows }` as 6c; the header comment documents groups, ops and
   expected shapes so that T11 needs no other source.

## Scenario groups (one row per listed variant; ids as given)

S1–S15 exactly as `unreached.md` § Scenarios (ids `site/lgraphutil/resizeNode`, …, `site/transform/nonMutating`),
each variant in the "Graph"/"Calls" columns its own row (`…/resizeNode/free-move-both`, `…/externalPorts/north-explicit-
anchor-negative-offset`, …). Then, from § Re-planning input:

| Group | Site | Rows | Shape |
| ----- | ---- | ---- | ----- |
| S16 `site/lnode/*` | `LNode` | layered G built by steps: `setLayer` both forms (incl. moving between layers and to `null`), `getPorts` all four forms over every `PortType` × `PortSide`, `getPortSideView` before and after `cachePortSides` (and a write through the view), incoming/outgoing/connected edge iterables, `getIndex` with and without a layer, `isInlineEdgeLabel`, `getGraph` with/without layer | port paths in order, booleans, indices, strings |
| S17 `site/ledge/*` | `LEdge` | `setSource`/`setTarget` (null, move), `setTargetAndInsertAtIndex` (valid, out of range → exception), `reverse` with and without collector ports and head/tail labels (both `adaptPorts` values), `getOther` both forms (incl. a non-endpoint → exception), `isSelfLoop`, `isInLayerEdge`, `toString` with/without names | paths, booleans, exception rows, strings |
| S18 `site/lport/*` | `LPort` | `setNode` (null, move), `setSide` per side with an anchor, degree/net flow, predecessor/successor/connected iterables, `getIndex`, designation and `toString` with and without names/sides | numbers, paths, strings |
| S19 `site/strings/*` and `site/provider/*` | `LGraph`, `LLabel`, `LGraphElement`, `ElkGraphTransformer`, `LayeredLayoutProvider`, `IHierarchyAwareLayoutProcessor` | `toString`/`getDesignation` of each element kind with and without a name and an origin; `getOriginIdentifier` for imported elements with ids at three nesting levels and for unnamed ones; provider rows `flat`, `include-children`, `cancelled` (a monitor whose `isCanceled()` is true) recording the ELK JSON after `layout`; one `hierarchyAware` row listing every class of the layered jar assignable to `IHierarchyAwareLayoutProcessor` (jar scan by reflection, sorted) and `instanceof` for `LayeredLayoutProvider` and `ElkLayered` | strings, `elk`, class-name lists, booleans |
| S20 `site/enums/<SimpleName>` | `enums` | one row per enum: the 35 option enums, `LayeredPhases`, `ComponentOrderingStrategy`, `LNode.NodeType`; by reflection: constants `[{ name, ordinal, toString }]`, `valueOf("NO_SUCH_CONSTANT")` exception, `compareTo` first/last/same, and every public zero-arg instance method per constant (`transpose`, `usesLabelSizeInformation`, `returnValue`, `getColor`, `isFlexibleSizeWhereSpacePermits`, `isFlexiblePorts`) plus `isAtLeast` as a full matrix; never the `create()` factories (X) | `{ class, constants, valueOfMiss, compareTo, methods }` |
| S21 `site/layeredSpacings/targetFilter` | `LayeredSpacings` | `OPTION_TARGET_FILTER` (by reflection if not public) over each LGraph element kind × one option per target set and one with none | boolean matrix |
| S22 `site/nodeFlexibility/*` | `NodeFlexibility` | `getNodeFlexibility` for a node with the option, without it (graph default), graph without it | enum names |

The U list and the X arms get no rows.

## Task

1. `tools/vectors/LayeredSiteVectors.java` per the design; `tools/vectors/layered-site-vectors.sh` (cache namespace
   `layered-sites`, writes `test/golden/refs/java/layered-sites.json`, `shellcheck -x` clean), run twice (second a
   cache hit).
2. A cross-check printed at the end of the run: every scenario id of `unreached.md` (S1–S22 groups) has at least one
   row and every row's group is listed there.

## Write-set

`tools/vectors/{LayeredSiteVectors.java,layered-site-vectors.sh}`, `test/golden/refs/java/layered-sites.json`.

## Read-set

`plans/layered-framework/unreached.md`; the pattern recorders and scripts above; the Java classes the table names
(`$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/{graph,options,…}`).

## Acceptance criteria

- Given two consecutive runs, then the JSON is byte-identical and the second is a cache hit.
- Given every row with an `input`, when re-imported and replayed, then it equals the first run.
- Given `unreached.md`, then every S1–S22 group has at least one row and every row belongs to a listed group;
  `rowCounts` sums to `rows.length`.
- Given `git status`, then no landed file under `test/golden/refs/` changed; the file is ≤ 5 MB.
- Given `ls`, then no other recorder or landed ref was run or touched.

## Observability / Rollback

N/A — test tooling. Reversible: revert the commit.
