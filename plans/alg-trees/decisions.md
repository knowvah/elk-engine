<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions — alg-trees, mission 8a (issue #37; auto-confirmed at planning, 2026-11-10)

Planned unattended (`/plan-mission --unattended`): every row below is the planner's recommendation, recorded under
[Auto-confirmed (unattended)](#auto-confirmed-unattended) with the rejected options and the evidence, for the maintainer to
audit. They amend, and never rewrite, AD-1…AD-16 and the earlier missions' rows. Cite rows with their mission (`alg-trees TR3`),
because ids repeat across missions (`.agent-notes/layered-framework.md`).

Paths: `M` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree`, `R` = the same for
`alg.radial`, `V` = for `alg.vertiflex`; `MT` = `test/org.eclipse.elk.alg.mrtree.test/src/.../mrtree/test`, `RT` = the radial test
bundle.

| ID | Decision |
|----|----------|
| TR1 | **Evidence: one JVM recorder per algorithm**, rows with the input embedded as ELK JSON (alg-common-nodespacing NS1), groups `full`, `stops`, `throws`; recorded with `-XX:hashCode=2` |
| TR2 | **Goldens: a new `trees` set** (`regen-goldens.sh --set trees`), designed inputs carrying their option set, one golden per option value (one factor at a time) |
| TR3 | **Hashed containers:** V1 and V4 on `JavaHashMap` with the landed strategies; identity-hashed sites in insertion order (AD-10), I30 with a reversed-order twin |
| TR4 | **Factory-enum staging (7a precedent):** the radial option enums, `RadialLayoutPhases` and radial `IntermediateProcessorStrategy` (T5), and mrtree `TreeLayoutPhases` and `IntermediateProcessorStrategy` (T6) are ported whole; their 16 + 15 `create()` targets are staged (`// @staged 8a` + `staged-classes.json` row) until their task; T13 and T17 remove the markers and rows |
| TR5 | **Provider registration:** `PENDING_TYPES` holds back the three providers until each wiring task; tests register providers explicitly (the `registerLayered()` precedent); `LayoutMetaDataService.getInstance()` is unchanged |
| TR6 | **Tree sweep:** oracle `sweep.sh --filter` over the three algorithms into a scratch dir with `-XX:hashCode=2`; TS through `ts-layout-compare.ts --algorithms mrtree,radial,vertiflex`, which gains the three registrations |
| TR7 | **Recursion (AC6, C7):** port recursive methods verbatim; probe each input-depth recursion under `--jitless`; convert only a site that overflows where the oracle does not, against a verbatim recursive reference |
| TR8 | **JUnit:** `MrTreeGraphSizeTest` (6 runs) and `CenterOnRootTest` (2 runs) ported whole with the Java tolerances; oracle baseline in [java-baseline.md](java-baseline.md) |
| TR9 | **Scope edges:** debug and `elkjs-exclude` per M2/F2; cross-bundle suites and other-bundle follow-ups handed off (below) |
| TR10 | **Commit:** squash to one commit on the base sha, tag `alg-trees/pre-squash`, footer `Refs: #37` |

## TR1 — Recorders and row contract

Three single-file launchers, copied from the landed shape (`tools/vectors/NodeMicroLayoutVectors.java` for the ELK JSON input,
`LayeredCompoundVectors.java` for stops and throw rows), each with an `ORIGIN:` header line, run by a `*-vectors.sh` that exports
`-XX:hashCode=2` and the oracle classpath of `tools/vectors/layered-compound-vectors.sh`.

| Recorder | Ref | Stops after |
|----------|-----|-------------|
| `MrTreeVectors.java`, `mrtree-vectors.sh` | `test/golden/refs/java/mrtree.json` | import, each component split, each processor of `MrTree`'s assembled list (`M/MrTree.java:104-199`), the components merge |
| `RadialVectors.java`, `radial-vectors.sh` | `test/golden/refs/java/radial.json` | each processor/phase of `RadialLayoutProvider`'s assembled list (`R/RadialLayoutProvider.java:40-112`) |
| `VertiFlexVectors.java`, `vertiflex-vectors.sh` | `test/golden/refs/java/vertiflex.json` | each phase of `VertiFlexLayoutProvider` (`V/VertiFlexLayoutProvider.java`) |

- **Row:** `{ id, group, input, expected }`. `input` is the prepared graph exported with `ElkGraphJson.forGraph(root)` and the
  flags of NS1, re-imported by the recorder before the run (round-trip self-check: a row whose re-imported run differs from the
  original-graph run fails recording).
- **`full`:** the result of `RecursiveGraphLayoutEngine` on the input (`NodeMicroLayout` included, as the providers call it):
  per node x, y, width, height, `MARGINS`, `PADDING`; per edge its sections (start, end, bend points); per label x, y, w, h; model
  order. Doubles as 16-hex raw bits (NS6).
- **`stops`:** the internal graph after each step. mrtree: every `TNode` (id, position, size, children order, the
  `InternalProperties` and `MrTreeOptions` values the step sets) and `TEdge` bend points; radial and vertiflex: every `ElkNode`
  geometry and the bundle's `InternalProperties`. The recorder may reach private assembly state by reflection (it is test code);
  the TS replay uses the same step list.
- **`throws`:** `expected.throws = { class, message, frame }` (the 7h T14 shape); a replay compares class and the first ELK frame.
- **Scenarios** (each recorder documents its generator in its header, seeded `java.util.Random`, seed ≠ 0): designed shapes (path,
  star, binary and random trees, forests, DAGs and cyclic graphs for mrtree's treeifier, mixed node sizes, labels sized by NS4),
  the generated corpus input of the algorithm (`test/corpus/generated/<alg>-*.json`); crossed with the
  option values of TR2 one factor at a time. Sizes: 16 MiB per ref, 5,000 lines per launcher (§ Revision 2026-11-03).
- **Rejected:** (a) goldens and JUnit only (the issue's minimum): a final-layout mismatch then has no localisation; every layered
  mission recorded stops. (b) One recorder for all three: one 16 MiB budget and one serial task for three disjoint bundles.

## TR2 — The `trees` golden set

`tools/oracle/regen-goldens.sh` gains `--set trees`: manifest `test/golden/trees.json`, refs `test/golden/refs/elk-trees/`,
inputs read from `test/golden/trees-inputs/` in the repository (not `$ELK_MODELS_DIR`), `jvmFlags: -XX:hashCode=2` in `_meta.json`
(H4). The default, `algorithms` and `layered` sets stay byte-identical.

- **Option sets:** per algorithm the default, plus one golden per non-default value of every algorithm-specific enum or boolean
  option and one non-default value of every numeric option, enumerated from `tools/melk/sources/{Tree,Radial,VertiFlex}.melk`;
  mrtree also each of the four directions and `separateConnectedComponents=false`. Options that need per-node values
  (`mrtree.positionConstraint` with `weighting=CONSTRAINT`, `radial.orderId` with `sorter=ID`, `vertiflex.verticalConstraint`) set
  them in the input. About 40 goldens with the three generated corpus inputs.
- **Inputs** are designed ELK JSON files carrying the option set at the root, so `test/corpus/variants.json` (which feeds the corpus
  sweep, 7h note) is untouched; `test/golden/inputs/` stays the elk-models mirror its manifest pins.
- **Evidence:** the same cases run without the flag; a byte difference is journaled with its site (I30 is the expected one).
- **Rejected:** (a) new keys in `variants.json`: multiplies every native corpus case. (b) Retargeted ptolemy models (the
  `algorithms` set): radial throws on 365 of 905 retarget cases (`docs/parity-report.md`) and they exercise no tree option; the
  sweep (TR6) covers retargets.

## TR3 — Hashed containers

From `docs/translation-rules-collections.md` and a grep of the three bundles at the pin:

| Site | Keys | Iterated | Port |
|------|------|----------|------|
| V1 `M/ComponentsProcessor.java:240-262` `propMerge` over `getAllProperties()` | IProperty (`id.hashCode()`) | yes, last-writer-wins | landed `MapPropertyHolder` `JavaHashMap` + `JavaHashMap` with the `PROPERTY` strategy |
| V4 `M/intermediate/FanProcessor.java:123,135` `locFanMap` | String | yes | `JavaHashMap` with the String strategy; `gloFanMap`/`gloDescMap` (`:39,42`) the same |
| `M/ElkGraphImporter.java:60` `elemMap` | ElkNode (identity) | lookup only | `Map` |
| `M/intermediate/CompactionProcessor.java:250` `cand` | TNode (identity) | lookup only | `Map` |
| `M/p4route/EdgeRouter.java:167` `nodeGaps` | Long | lookup only | `JavaHashMap` (value-hashed; order unobservable, journal) |
| `M/intermediate/LevelProcessor.java:36` `gloLevelMap` | Integer | lookup only | `JavaHashMap` (as above) |
| I30 `R/RadialUtil.java:224-231` → `R/intermediate/overlaps/RadiusExtensionOverlapRemoval.java:79-93` | ElkNode (identity) | yes: `nodes.get(0)` of the next level and the recursion order | insertion order (AD-10) + a reversed-order twin classifying observability (H3 precedent) |
| `R/RadialUtil.java:56,78` `children` | ElkNode (identity) | lookup only | `Set` |
| `R/intermediate/compaction/AnnulusWedgeCompaction.java:37,40` contours | ElkNode (identity) | `contourOverlap` any-match (`:174-182`) | `LinkedHashMultimap.create(identity, identity)` (W6 precedent) |

Each site gets an `ad10` journal row. A row whose result depends on a treeified bucket (more than 8 equal-hash entries under
`-XX:hashCode=2`) is classified, not re-recorded (7h: that order is not established). The `TreeSet` of
`M/intermediate/CompactionProcessor.java:246` uses the landed `TreeSet` or the `TreeMultimap` precedent; the executor picks the
landed shim and journals it.

## TR4 — Factory-enum staging

A factory enum constructs every implementation in `create()`, while every implementation imports the enum (a phase class is an
`ILayoutPhase<XLayoutPhases, …>` whose `getLayoutProcessorConfiguration` names `IntermediateProcessorStrategy` values) or the
generated options that import it. Neither side can land first with a green typecheck. The 7a precedent (whole enum early,
targets staged) applies:

| Enum (ported whole by) | Staged targets |
|------------------------|----------------|
| `R/options/{AnnulusWedgeCriteria,CompactionStrategy,OverlapRemovalStrategy,RadialTranslationStrategy,SortingStrategy}` (T5) | `AnnulusWedgeByLeafs`, `AnnulusWedgeByNodeSpace`, `RadialCompaction`, `AnnulusWedgeCompaction`, `RadiusExtensionOverlapRemoval`, `EdgeLengthOptimization`, `EdgeLengthPositionOptimization`, `CrossingMinimizationPosition`, `PolarCoordinateSorter`, `IDSorter` |
| `R/RadialLayoutPhases`, `R/intermediate/IntermediateProcessorStrategy` (T5) | `EadesRadial`, `StraightLineEdgeRouter`, `GeneralCompactor`, `GeneralRotator`, `CalculateGraphSize`, `EdgeAngleCalculator` (16 radial in all) |
| `M/TreeLayoutPhases`, `M/intermediate/IntermediateProcessorStrategy` (T6) | `DFSTreeifyer`, `NodeOrderer`, `NodePlacer`, `EdgeRouter`, and the 11 processors `Root`, `Fan`, `Level`, `Neighbors`, `LevelHeight`, `LevelCoordinates`, `Direction`, `NodePosition`, `Compaction` (`*Processor`), `GraphBoundsProcessor`, `Untreeifyer` (15) |

- A staged file has the `// @staged 8a` marker on line 2, the Java class's public surface with bodies throwing the staged message,
  and a row in `test/architecture/staged-classes.json` (the fitness test `staged-classes.fitness.test.ts` checks both).
- **Fitness extension (pre-approved at planning):** `test/architecture/staged-classes.fitness.test.ts:22` accepts only
  `7f2|7[b-h]`. T5 widens `MARKER` to `/^\/\/ @staged (7f2|7[b-h]|8a)$/` and updates the header comment ("empty after mission 8a").
  No expected value, ref, tolerance or registry row of a landed file changes, and every existing check stays, so AD-13 does not
  apply; it is listed for the maintainer's audit below.
- The porting task replaces the bodies and keeps marker and row; the wiring task of the algorithm (T13 radial, T17 mrtree) removes
  every marker and row of its bundle, so the list ends `[]`.
- T5 also ports the seven radial interfaces whole (`IAnnulusWedgeCriteria`, `IRadialCompactor`, `IEvaluation`, `IOverlapRemoval`,
  `IRadialRotator`, `IRadialSorter`, `IRadialEdgeRouter`). vertiflex needs no staging: `V/VertiFlexLayoutPhases` is a leaf enum and
  each `*Strategy` enum lands with its phase class.
- `NON_LEAF_DEFAULT_TYPES` gains the enums whose module graph needs lazy defaults (7a note; run the per-module import smoke).
- **Rejected:** one task per bundle (about 2,750 and 5,800 Java lines in one agent); enums without `create()` until later (splits a
  class, against "keep method boundaries"); a dependency-ordered schedule without staging (mrtree's four phases would have to land
  in one task with `TreeLayoutPhases`, about 2,000 Java lines).

## TR5 — Provider registration

T5 adds `org.eclipse.elk.alg.{mrtree.TreeLayoutProvider,radial.RadialLayoutProvider,vertiflex.VertiFlexLayoutProvider}` to
`PENDING_TYPES` (X3: the options class is still emitted). The wiring tasks (T11 vertiflex, T13 radial, T17 mrtree) remove their
entry and regenerate. Tests and replays register with `LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(new
<X>MetaDataProvider())`, the TS form of `PlainJavaInitialization` (`src/core/RecursiveGraphLayoutEngine.test.ts:4-12`). No
auto-registration is added to `getInstance()` (YAGNI; the landed service registers core only).

## TR6 — Tree sweep

Oracle: `JAVA_TOOL_OPTIONS="-XX:+UnlockExperimentalVMOptions -XX:hashCode=2" tools/oracle/sweep.sh --filter /<alg>/ --out
$TMPDIR/alg-trees/sweep-<alg>` for mrtree, radial and vertiflex (898 retarget + 7 generated cases each at planning). TS:
`npx tsx tools/corpus/ts-layout-compare.ts --algorithms mrtree,radial,vertiflex --sweep-dir <dir> --out <json>`. T18 adds the three
metadata providers to that tool and its test (row 9 registers the rest, layered included). Results are journaled per algorithm
and category; nothing from the sweep is committed (AD-5). Target: 0 `mismatch`, 0 `ts-only-throw`, 0 `oracle-only-throw`; a
`both-throw` compares class. The vertiflex timeout case of the parity report is counted, not chased.

## TR7 — Recursion

Input-depth recursions at the pin include `M/p1treeify/DFSTreeifyer.java:140`, `M/ComponentsProcessor.java:129`,
`M/p3place/NodePlacer.java:137,319` (`firstWalk`, `secondWalk`), the level recursions of `M/intermediate/{Neighbors,LevelHeight,Level}Processor`,
`R/intermediate/overlaps/RadiusExtensionOverlapRemoval.java:57` (`extend`), the radial compactors and `V/p2relative/RelativeXPlacer.java:156,295`.
T19 lists them all, runs each algorithm on a 2,000-deep path in the oracle (default `-Xss`) and in TS under `node --jitless`, and
converts only a site that overflows in TS while the oracle completes (AC6 recipe, journaled per site; C7: kept recursion is fine).

## TR8 — JUnit suites

`MT/MrTreeGraphSizeTest.java` → `src/alg/mrtree/MrTreeGraphSizeTest.test.ts` (parameterised, 3 × 2 cases; `DOUBLE_EQ_EPSILON =
10e-5`); `RT/CenterOnRootTest.java` → `src/alg/radial/CenterOnRootTest.test.ts` (2 cases, delta 0.1). Assertions verbatim. The oracle
baseline uses a scratch copy of `tools/oracle/java-tests.sh` with the two bundles added (7f S1 / 7h precedent).

## TR9 — Scope edges and hand-offs

- `M/MrTree.java:77-83` is an `elkjs-exclude` block: dropped (core-engine M2). `System.err.println`
  (`M/ComponentsProcessor.java:251`) becomes `console.error`, `System.out.println` (`V/p2relative/OutlineNode.java:98`)
  `console.log` (layered-pipeline F2). `TEdge.toString`'s `hashCode()` (`M/graph/TEdge.java:63`) follows the landed identity-hash
  text precedent (`src/guava/Multimap.ts`), journaled.
- Kept upstream oddities are ported verbatim and listed in `docs/conformance.md`: e.g. `R/p1position/EadesRadial.java:108`
  (`currentRadius / currentRadius + radius`), the discarded sort at `R/intermediate/overlaps/RadiusExtensionOverlapRemoval.java:91`,
  the unused `M/options/CompactionMode` and `R/options/OverlapRemovalStrategy` (ported anyway).
- **Handed off, not in 8a:** `NodeMicroLayoutTest`, `PlainJavaInitializationTest`, `ElkReflectTest` need force, stress, disco,
  rectpacking and spore (→ 8x, after 8c); `DepthFirstCompaction` recursion is spore's (→ 8c); `TwoBitGridTest`, `PlanarGrid`,
  `PolyominoOptions` registration are disco's (→ 8b; the "8a (disco)" label in § Revision 2026-10-26 is a mislabel).

## TR10 — Commit

Per-task commits during the run (`git -c commit.gpgsign=false commit -F <file>`); at the end `git tag alg-trees/pre-squash`,
`git reset --soft <base>` and one commit `feat(trees): port mrtree, radial and vertiflex (8a)` with a body and `Refs: #37`.

## Pre-made (carried over)

| Rule | Source |
|------|--------|
| Expectations from the oracle, JVM vectors or the Java before the code; no hand-derived numeric expectation | AD-13, 7h L4 |
| `@see` per symbol; one class per file; Java names; sections behind a facade only where a limit forces it | AD-7, 7h push-forward |
| Inputs embedded as ELK JSON; doubles as raw bits; 1e-6 | alg-common-nodespacing NS1, NS6, AD-4 |
| Label sizes for 0×0 labels: `6.5 * text.length()` × `13.0` | NS4 |
| `assert` sites stay comments naming the Java line | NS5 |
| A green replay is evidence only when replay-alone coverage shows the code ran | 7a X4 note |
| Temporal dead zone: `NON_LEAF_DEFAULT_TYPES` + per-module import smoke; never an entry-order import | 7a note, F10 |

## Auto-confirmed (unattended)

| Row | Rejected options | Evidence |
|-----|------------------|----------|
| TR1 | goldens + JUnit only; one shared recorder | the layered missions' stop rows localised every divergence; 16 MiB cap per ref |
| TR2 | `variants.json` keys; retargeted ptolemy models | `tools/corpus/sweep.ts:120-135` plans one native case per variant; parity report radial 365 throws of 905 |
| TR3 | plain `Map` everywhere | translation rules §2 (V1, V4, I30); `MapPropertyHolder.ts:23` already `JavaHashMap` |
| TR4 (+ the one-token `MARKER` widening) | single task per bundle; split enum methods; unstaged ordering | `R/options/*.java`, `M/TreeLayoutPhases.java:37-59` `create()`; `M/p1treeify/DFSTreeifyer.java:45-50`; 7a/7h staging precedent |
| TR5 | auto-register in `getInstance()` | YAGNI; `RecursiveGraphLayoutEngine.test.ts:4-12` |
| TR6 | defer every TS sweep to row 9 | `ts-layout-compare.ts:258` already takes `--algorithms`; oracle sweep 2 min (parity report) |
| TR7 | convert every recursion up front | 7h C7 kept recursion; AC6 targets overflows |
| TR8 | run suites through a TS LayoutTestRunner | neither suite uses the runner (`PlainJavaInitialization` only) |
| TR9 | port the debug block; port `NodeMicroLayoutTest` with stubs | M2, F2; the test needs four unported bundles |
| TR10 | per-batch commits | queue rules: one squashed commit per mission |
