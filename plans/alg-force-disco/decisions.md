<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions — alg-force-disco, mission 8b (issue #38; auto-confirmed at planning, 2026-11-11)

Planned unattended (`/plan-mission --unattended`): every row below is the planner's recommendation, recorded under
[Auto-confirmed (unattended)](#auto-confirmed-unattended) with the rejected options and the evidence, for the maintainer to audit.
They amend, and never rewrite, AD-1…AD-16 and the earlier missions' rows. Cite rows with their mission (`alg-force-disco FD3`).

Paths: `F` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.force/src/org/eclipse/elk/alg/force`, `D` = the same for `alg.disco`;
`FT` = `test/org.eclipse.elk.alg.force.test/src/org/eclipse/elk/alg/force/test`, `DT` = `test/org.eclipse.elk.alg.disco.test/...`.

| ID | Decision |
|----|----------|
| FD1 | **Evidence: two JVM recorders**, `force.json` + `stress.json` and `disco.json`, rows with the input embedded as ELK JSON (NS1), groups `full`, `stops`, `throws`; recorded with `-XX:hashCode=2` |
| FD2 | **Goldens: a new `force-disco` set** (`regen-goldens.sh --set force-disco`), designed inputs carrying `elk.algorithm` and their option set, one golden per option value (one factor at a time) |
| FD3 | **`Math.log` in `EadesModel` is the fdlibm algorithm**, a full-domain `JavaMath.log`, proven against JVM vectors; V8's `Math.log` is not used there |
| FD4 | **Hashed containers:** identity-hashed sites in insertion order (AD-10), with a reversed-order twin at the one order-observable site (`adjustedPorts`); parallel streams become sequential in encounter order |
| FD5 | **Staging and registration:** three provider classes staged (`// @staged 8b`) until wired, `MARKER` widened by one token; tests register providers explicitly, `PolyominoOptions` next to `DisCoMetaDataProvider` as `ElkOracle.java:218-221` does |
| FD6 | **Sweep:** oracle `sweep.sh --filter` over `force`, `stress`, `disco` with `-XX:hashCode=2`; TS through `ts-layout-compare.ts`, which gains the registrations |
| FD7 | **Recursion:** verbatim; probe `ComponentsProcessor.dfs` and `ElkGraphComponentsProcessor.dfs` on a 2,000-deep path under `--jitless`; convert only a site that overflows where the oracle does not |
| FD8 | **JUnit:** `ForceImportTest` (3 runs) and `TwoBitGridTest` (3 runs) ported whole; baseline in [java-baseline.md](java-baseline.md) |
| FD9 | **Scope edges:** issue #58 stays with the maintainer; debug properties kept; cross-bundle suites to 8x |
| FD10 | **Commit:** squash to one commit on the base sha, tag `alg-force-disco/pre-squash`, footer `Refs: #38` |

## FD1 — Recorders and row contract

Single-file launchers copied from `tools/vectors/VertiFlexVectors.java`, each with an `ORIGIN:` header line, run by a `*-vectors.sh`
that exports `-XX:hashCode=2` and the oracle classpath of `vertiflex-vectors.sh`. Row: `{ id, group, input, expected }`, with
`input` exported by `ElkGraphJson.forGraph(root)` and re-imported before the run (round-trip self-check). `expected` holds doubles
as 16-hex raw bits (NS6). `throws`: `expected.throws = { class, message, frame }`.

| Recorder | Refs | Stops after |
|----------|------|-------------|
| `ForceVectors.java`, `force-vectors.sh` | `force.json`, `stress.json` | **force:** import, split, each component's `initialize` (positions after the random draws; `dispBound`, `k`, `temperature`), iteration checkpoints 1, 2, 10 and last, recombine, applyLayout. **stress:** force pass or micro layout, import, split, each component's `initialize` (`apsp`, `w`) and `execute`, label refresh, recombine, applyLayout |
| `DiscoVectors.java`, `disco-vectors.sh` | `disco.json` | `ElkGraphComponentsProcessor.split`, `importGraph` (element multisets, extensions), cell sizes, each polyomino's grid, packing, `applyToDCGraph`, `applyLayout` |

- The recorder may reach protected and private state by reflection (it is test code). Iteration checkpoints drive the body of
  `AbstractForceModel.layout` (`F/model/AbstractForceModel.java`) through reflection, in the Java's order.
- Disco's stop rows record hash-ordered collections sorted by a stable key (FD4), so the row does not encode identity-hash order.
- `force.json` carries a `log` group: 20,000 `Math.log` input/output pairs as raw bits (FD3).
- Scenarios (seeded `java.util.Random`, seed ≠ 0): **force, stress:** path, star, cycle, K5, random connected, forests, mixed sizes,
  edge labels (NS4 sizes), multi-edges, self-loops, ports, the corpus input `test/corpus/generated/force-graph-small.json`, each
  crossed with the option values of FD2 one factor at a time; preset coincident positions with `interactive=true` to reach both
  arms of `avoidSamePosition` (`F/model/AbstractForceModel.java:184`); at least one Eades row with `iterations=1000` (FD3).
  **disco:** multi-component graphs with preset coordinates and one section per edge, bends, labels on nodes, ports and edges;
  parent-port edges in both directions (`importExtension`, extensions); two extension edges sharing one port (FD4), at most 8
  extension entries; `aspectRatio` above, below and null; `componentLayoutAlgorithm` naming force, layered and an unknown id.
- Throw rows: disco's edge without a section (`ElkGraphUtil.firstEdgeSection`), an out-of-grid extension
  (`PlanarGrid.weaklyIntersectsArea`, § Revision 2026-10-26), and what each bundle's validation rejects.
- Sizes: 16 MiB per ref, 5,000 lines per launcher. Cap stress matrix rows near 30 nodes.
- **Rejected:** goldens and JUnit only (a final-layout mismatch then has no localisation).

## FD2 — The `force-disco` golden set

`tools/oracle/regen-goldens.sh` gains `--set force-disco`: manifest `test/golden/force-disco.json`, refs
`test/golden/refs/elk-force-disco/`, inputs in `test/golden/force-disco-inputs/`, `jvmFlags: -XX:hashCode=2`. Landed sets stay
byte-identical.

- **Option sets (about 45 goldens):** per algorithm the default, plus one golden per non-default value of every algorithm-specific
  enum or boolean option and one non-default value of every numeric option, enumerated from `tools/melk/sources/{Force,Stress,Disco}.melk`
  and `Polyomino.melk`. Force: `model`, `iterations`, `temperature`, `repulsion` (under EADES), `repulsivePower` per edge,
  `spacing.nodeNode`, `aspectRatio`, `randomSeed` (never 0), `separateConnectedComponents=false`, `padding`, `interactive`,
  `edgeLabels.inline`, `priority`. Stress: `interactive`, `fixed`, `desiredEdgeLength` root and edge, `dimension` X and Y, `epsilon`,
  `iterationLimit`, `edgeLabels.inline`. Disco: `spacing.componentComponent`, `edge.thickness`, `aspectRatio`, `padding`,
  `polyomino.fill`, every `lowLevelSort`, `highLevelSort` and `traversalStrategy` value, `componentCompaction.componentLayoutAlgorithm`.
  Options on a node or edge set them in the input. The two generated corpus inputs are added.
- **The `retarget` lesson (8a T4):** an input that does not name `elk.algorithm` records layered. A probe at planning confirms it:
  `disco-components-small.json` runs with `resolvedAlgorithm: …layered` in the oracle. Every input names the algorithm or its entry
  has `retarget`; a test asserts each ref's `resolvedAlgorithm` is the entry's algorithm.
- Disco needs preset coordinates and one section per edge, or it throws in `firstEdgeSection`.
- **Rejected:** new `variants.json` keys (multiplies every native corpus case); retargeted ptolemy models (mostly unusable inputs).

## FD3 — `Math.log` in `EadesModel`

`EadesModel.attractive` (`F/model/EadesModel.java:100`) calls `Math.log` once per connected pair per iteration.

**Evidence (2026-11-11, oracle JVM 21.0.1, arm64; 200,000 seeded inputs, half in 0.01–20, half in 10^-3–10^3):**

- V8 `Math.log` differs from the JVM's in 858 inputs (0.43%), by one unit in the last place. The same 858 count against
  `StrictMath.log`, with the same first five samples.
- HotSpot's `Math.log` and `StrictMath.log` gave bit-identical Eades layouts in 18 of 18 runs (n ≤ 50, up to 3,000 iterations).
- **Amplification:** perturbing 1 in 256 calls by one ulp changes the final coordinates by at most 1.2e-12 at 300 iterations, and by
  390 at 1,000 iterations (n = 20, seed 1). The iteration is chaotic: the ulp matters for any row above the default iterations.

**Decision.** Add a full-domain `log` to `src/java/lang/JavaMath.ts` (netlib fdlibm `e_log`, the public algorithm `Random.ts` already
implements for `0 < x < 1`): zero, negative, NaN, infinity, subnormal and `x ≥ 1` included, because `d / s` is unconstrained
(`spacing.nodeNode` of 0 gives infinity). `EadesModel.attractive` calls it. `Random.ts` imports it only if its own tests stay
byte-identical (`Random.test.ts:125`); otherwise it keeps its private copy and the journal says why. `force.json` group `log`
(20,000 pairs, raw bits) proves it; the row bar is exact equality.

- No other site in `alg.force` calls a transcendental `Math` function; `Math.sqrt` is correctly rounded.
- **Platform:** the equality is measured on the oracle's arm64 JVM. It is not verified on x86_64 (LOW confidence that it holds),
  so the journal records the platform as issue #52 does for the label metrics.
- **Rejected:** native `Math.log` with a known-divergences entry (violates the issue's 1e-6 goldens for iterated rows, and
  `docs/conformance.md:145` prefers a bit-exact algorithm over a wider tolerance); a recorded replay table in tests only (it proves
  the port but leaves the shipped layout diverging).

## FD4 — Hashed containers

From `docs/translation-rules-collections.md` and a grep at the pin. `DCElement`, `ElkNode`, `ElkEdge`, `ElkPort` have identity hashes
(`MapPropertyHolder` defines neither `hashCode` nor `equals`).

| Site | Keys | Iterated | Port |
|------|------|----------|------|
| `F/ElkGraphImporter.java:61` `elemMap` | ElkNode | lookup only | `Map` |
| `F/stress/StressMajorization.java:60` `connectedEdges` | FNode | `get` in insertion order | landed `LinkedListMultimap` with identity strategies |
| `D/graph/DCGraph.java:40` `components` | DCComponent | linked | `Set` |
| `D/graph/DCComponent.java:55` `shapes` | DCElement | `update` (min, max), `intersects` (any), `DCPolyomino` loop → `addExtension` | `Set`; extension order is read only as a length and a direction set (`src/alg/common/polyomino/*`), journal it |
| `D/transform/ElkGraphTransformer.java:68` `elementMapping` | ElkGraphElement | `forEach(OffsetApplier)`, each entry independent | `Map` |
| `D/transform/ElkGraphTransformer.java:70-71` `incoming/outgoingExtensionsMapping` | ElkEdge | **order-observable** at `adjustedPorts`: the first edge at a port sets its position | `Map`, insertion order, reversed-order twin |
| `D/transform/ElkGraphTransformer.java:113,159` `edgeSet` | ElkEdge | yes, feeds the two maps above | `Set` |
| `D/transform/ElkGraphComponentsProcessor.java:47,74,102,104` | ElkNode, ElkPort | `dfs` over the adjacency set | `Map`, `Set` |
| `D/transform/ElkGraphComponentsProcessor.java:110,115,137,142,180` parallel streams | ElkEdge | collected | sequential, encounter order; predicates are pure; `Collectors.toSet` to a `Set` |

Each site gets an `ad10` journal row. The twin (T9) is a test-only switch iterating the extension maps in reversed order: run every
row with extensions both ways and record per row whether the result differs. A row whose result depends on a treeified bucket
(more than 8 equal-hash entries under `-XX:hashCode=2`) is classified, not re-recorded (8a TR3).

**Rejected:** `JavaHashMap` with a modelled identity hash: identity hashes are not stable across JVM runs without the flag.

## FD5 — Staging and registration

Every option class imports its provider, and the providers need the whole bundle, so neither side can land first with a green
typecheck. The 8a deviation applies: T4 generates the options and adds three staged providers (`ForceLayoutProvider`,
`StressLayoutProvider`, `DisCoLayoutProvider`; line-2 marker `// @staged 8b`, non-throwing constructor, a `layout` that throws)
with rows in `test/architecture/staged-classes.json`. T8, T9 and T10 replace the bodies and keep marker and row; T10 removes all
three, so the list ends `[]`.

- **Fitness extension (pre-approved at planning):** `test/architecture/staged-classes.fitness.test.ts:22` accepts `7f2|7[b-h]|8a`.
  T4 widens `MARKER` by the token `8b` and the header comment. No expected value, ref or tolerance changes; listed for audit below.
- `PENDING_TYPES` stays `[]`: the tripwire at `test/melk/model-algorithms.test.ts:121-123` pins it (AD-13).
- `StressMajorization.Dimension` lands as `src/alg/force/stress/Dimension.ts` (the `PackingMode` convention, `tools/melk/imports.ts:37`),
  and `StressMajorization` gets `static readonly Dimension = Dimension`. `Dimension`, `ForceModelStrategy` and `CompactionStrategy`
  are leaf enums, so `NON_LEAF_DEFAULT_TYPES` should not change; run the per-module import smoke, and add an entry if it says so.
- Tests and replays register the providers explicitly. Registering `PolyominoOptions` next to `DisCoMetaDataProvider` answers the
  roadmap note "nothing registers `PolyominoOptions` before disco"; `getInstance()` is unchanged (YAGNI).

## FD6 — Sweep

Oracle: `JAVA_TOOL_OPTIONS="-XX:+UnlockExperimentalVMOptions -XX:hashCode=2" tools/oracle/sweep.sh --filter /<alg>/ --out $TMPDIR/alg-force-disco/sweep-<alg>`
for `force`, `stress`, `disco` (`docs/parity-report.md`: 898 retarget cases each, plus 7 generated for force and disco; 89, 89 and 87
oracle throws). TS: `npx tsx tools/corpus/ts-layout-compare.ts --algorithms force,stress,disco --sweep-dir <dir> --out <json>`. T11
adds the three metadata providers and `PolyominoOptions` to that tool. Journaled per algorithm and category; nothing from the sweep is
committed (AD-5). Target: 0 `mismatch`, 0 `ts-only-throw`, 0 `oracle-only-throw`. A `both-throw` compares class. Timeouts are counted.

## FD7 — Recursion

Input-depth recursions: `F/ComponentsProcessor.java` `dfs` and `D/transform/ElkGraphComponentsProcessor.java` `dfs`. T12 runs each
algorithm on a 2,000-deep path in the oracle (default `-Xss`) and in TS under `node --jitless`, and converts only a site that
overflows in TS while the oracle completes (AC6 recipe).

## FD8 — JUnit suites

`FT/ForceImportTest.java` → `src/alg/force/ForceImportTest.test.ts`; `DT/TwoBitGridTest.java` → `src/alg/disco/TwoBitGridTest.test.ts`
(it exercises the landed `TwoBitGrid` from `alg.common`, and `alg.disco` may import it). Assertions verbatim.

## FD9 — Scope edges and hand-offs

- **Issue #58 (`needs-ruling`):** the maintainer has not ruled, and the mission must not decide it. `STRESS_PENDING` and its tests
  stay untouched. T12 runs the three stress cases from a scratch copy, reports the evidence on the issue, and hands off. If a ruling
  appears before T12, follow it and journal it.
- **Issue #68** (8 residual tree sweep cases, 7 needing rectpacking or force keys): not in scope; the T13 roadmap hand-off says the
  force keys are now registered.
- `DEBUG_DISCO_GRAPH` and `DEBUG_DISCO_POLYS` are kept (programmatic options, set verbatim). The probe found them absent from the
  oracle's JSON output.
- `System.out.println` in `D/DisCoLayoutProvider.java` becomes `console.log` (layered-pipeline F2); its `default` arm is unreachable
  (`CompactionStrategy` has one value), so it is a `U` row.
- `ElkGraphComponentsProcessor`'s static fields stay class statics reset in `split`, not module-level `let` (the fitness test).
- `uVector == vVector` (`F/model/AbstractForceModel.java:184` block) compares two distinct objects and is always false; port
  verbatim with a comment. `serialVersionUID` is dropped. `(float) Math.sqrt` and `1.0f / n` use `Math.fround`.
- **Handed off:** `NodeMicroLayoutTest` (needs rectpacking, 8x); `PlainJavaInitializationTest`, `ElkReflectTest` (8x, after 8c);
  `alg.disco.debug` is reference only.

## FD10 — Commit

Per-task commits during the run; at the end `git tag alg-force-disco/pre-squash`, `git reset --soft <base>` and one commit
`feat(force): port force, stress and disco (8b)` with a body and `Refs: #38`.

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
| Whole-ref test loops carry an explicit 60 s timeout | 8a batch 2 `fix` |

## Auto-confirmed (unattended)

| Row | Rejected options | Evidence |
|-----|------------------|----------|
| FD1 | goldens + JUnit only | every layered and tree mission's stop rows localised its divergences; 16 MiB cap per ref |
| FD2 | `variants.json` keys; retargeted ptolemy models | `tools/corpus/sweep.ts:120-135`; the planning probe of `disco-components-small.json` |
| FD3 | native `Math.log` + known divergence; test-only replay | the planning probe (above); `docs/conformance.md:145` |
| FD4 | a modelled identity hash | grep at the pin; `MapPropertyHolder.java` has no `hashCode`; 8a TR3 |
| FD5 (+ the one-token `MARKER` widening) | `PENDING_TYPES`; one task per bundle | `test/melk/model-algorithms.test.ts:121-123`; 8a TR5 deviation |
| FD6 | defer every TS sweep to row 9 | `ts-layout-compare.ts` already takes `--algorithms`; 8a TR6 |
| FD7 | convert every recursion up front | 7h C7; AC6 targets overflows |
| FD8 | port the suites through a TS runner | neither suite uses `LayoutTestRunner` |
| FD9 | removing `STRESS_PENDING` (the 7h hand-off's wording) | issue #58 carries `needs-ruling` and no ruling; the filter is pinned by a landed test |
| FD10 | per-batch commits | queue rules |

Audit points: the `MARKER` widening (FD5), and FD3's new shim (the Java calls `Math.log`, the port calls `JavaMath.log`).
