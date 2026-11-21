// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, mission 7g layered-loops-wrapping-compaction, T1, W1, W3, W4, W7) for the self loop,
// wrapping and compaction family of org.eclipse.elk.alg.layered: SelfLoopPreProcessor, SelfLoopPortRestorer, SelfLoopRouter,
// SelfLoopPostProcessor (with intermediate/loops/**), DummySelfLoopProcessor, BreakingPointInserter, BreakingPointProcessor,
// BreakingPointRemover, SingleEdgeGraphWrapper (intermediate/wrapping/**), HorizontalGraphCompactor (intermediate/compaction/** and
// compaction/**) and ComponentsCompactor (components/**, reached through COMPACTION_CONNECTED_COMPONENTS). The Java is the spec; this
// program only CALLS ELK APIs (reflection where a member is private or protected) and records results; it embeds no ELK implementation.
// Expectations come from the oracle only, before any TypeScript of the mission exists.
// Run: tools/vectors/layered-loops-vectors.sh <outDir>   (program arguments: <outDir> <tools/vectors dir>)
// A MULTI-FILE program (issue #50): this entry file plus the helper sources in tools/vectors/LayeredLoopsVectors/, compiled by javac and
//   started by jp_run of tools/vectors/java-program.sh (the script and tools/oracle/loops-sweep.sh go through it). JDK 21's source
//   launcher takes one file, so `java LayeredLoopsVectors.java` no longer compiles. The helpers hold the former single file, cut at its
//   section comments and kept in its order: LayeredLoopsVectorsEncoding, -Inputs, -PhaseDump, -Steps, -Builders, -ModelRows, -Scenarios,
//   -Sites, -Build, -Sweep. They are ONE CHAIN OF SUPERCLASSES that ends in this class, for two reasons:
//     (1) a superclass is initialized before its subclass (JLS 12.4.1), so every static initializer runs in the single file's textual
//         order, before main, as it did;
//     (2) a class inherits static members and member types, so a helper names everything an earlier helper declares without a
//         qualifier, as the single file did.
//   A helper qualifies only what it does not inherit: a member of a later helper (LayeredLoopsVectorsSteps.parseLongArg) and what stays
//   in this file (LayeredLoopsVectors.Bug). Staying here: main, elkCommit(), the model table (the script greps this file for it), the
//   exception classes, and ShrinkWidthManager, whose binary name layered-loops.json records. A record component read from another
//   file goes through its accessor (s.id()): the record's private field is visible only in the file that declares the record.
//   EVERY HELPER'S NAME STARTS WITH "LayeredLoopsVectors": elkFrame tells this program's stack frames from ELK's by that prefix.
// Plan dump (diagnosis): layered-loops-vectors.sh --plan-dump <tools/vectors dir> <modelsDir> <path>... [-o CONSTANT=value]...
//   prints "PLAN <path> <level path> <member>,..." per hierarchy level (a directory path is expanded to its .elkt / .json files).
// Sweep (T19, W5): layered-loops-vectors.sh --sweep <modelsDir> <outDir>   (writes <outDir>/results.jsonl; run from the repo root)
//                  layered-loops-vectors.sh --dump <case id> <modelsDir> <outDir>  (writes the canonical form of one case)
//   tools/oracle/loops-sweep.sh runs them. Three parts, each case id prefixed by its part:
//     a/level/<model>/<root|target>/<ROUTING>, a/model/<model>/<DIRECTION>   the pipeline sweep's enumeration (LayeredPipelineVectors.java
//         --sweep, 7f T14, copied: every realworld/ptolemy/**.json, every edge-bearing level x ORTHOGONAL/POLYLINE/SPLINES through
//         ElkGraphTransformer + ElkLayered.doLayout, every whole model x RIGHT/LEFT/DOWN/UP through RecursiveGraphLayoutEngine)
//     b/model/<model>/<default|DIRECTION>   the label sweep's enumeration (LayeredLabelsVectors.java --sweep, 7f2 T15, copied: every
//         label- or comment-bearing .elkt of tests/layered, tickets/layered, examples)
//     c/model/<model with extension>/<option id>=<value>   an option family over tests/layered/{self_loops,compaction_oned,
//         connected_components}/**, the vendored test/golden/inputs/loops/** files (copies of corpus files, read from the models dir) and
//         every ptolemy .json: wrapping.strategy SINGLE_EDGE and MULTI_EDGE (default cutting), compaction.postCompaction.strategy
//         EDGE_LENGTH and LEFT_RIGHT_CONNECTION_LOCKING, set on every node with children (the root included)
//   Parts a and b keep a case only where the WHOLE plan of some level holds one of the nine arms (SEVEN_G) or a node has
//   compaction.connectedComponents on (the cases the pipeline and label sweeps refused); a case outside that scope is dropped and counted
//   on stderr. Refusals: 7h's categories only (REFUSAL_CATEGORIES), counted; any other member outside the ported sets stops the sweep
//   naming the case. results.jsonl, one JSON object per case, the line format of the labels sweep with `part` and `variant`:
//     ok       { id, part, kind, model, target, variant, sha256 }   sha256 of the canonical form (UTF-8, compact, object keys sorted)
//     refused  { id, part, status: "refused", processor, category }
//     throws   { id, status: "throws", part, kind, model, target, variant, class, message[, frame] }  frame: first ELK "File.java:line"
//     timeout  { id, status: "timeout" }                                not finished within CASE_TIMEOUT_SECONDS
//   Canonical form: as 7f's sweep (elkDump: boxes, labels, ports, children, contained edges, raw IEEE hex) with one change: every NaN
//   is the canonical NaN 7ff8000000000000 (rawHex), because the JVM's NaN sign bit is not reproducible between runs. The no-flag
//   recording path never calls the sweep.
//
// ORIGIN (B7: single-file launchers share no code): copied from tools/vectors/LayeredLabelsVectors.java (7f2, T1; itself copied from
// LayeredRoutingVectors.java, LayeredPlacementVectors.java and LayeredOrderVectors.java): the JSON helpers, the LGraph Dump, the C4
// Encoder and decode, importGraph/normalise/Base/phaseDump, the step interpreter, Spec/execute/buildRow, strictNumbers/strictParse, the
// row timeout, levels(), planOfGraph/chainOf, the ELK JSON builders, PlanRecorder and runFull, the --plan-dump and the sweep. The row
// format, the C4 values, the BFS guard, the re-run / build-twice / strict-parse / size checks are 7c's through 7f2's (see their headers).
// What this recorder changes or adds is listed below; the 7f2 families (labels, comments, unzipping, interactive, logged), the 7f2
// sites group and the label scenario builders are not copied. The step ops labelManager, interactive and logging, the "logged"
// terminal dump and the interactive/logging full modes stay in the interpreter (inherited, no row of this file uses them).
//
// Output: ONE file <outDir>/layered-loops.json (2-space top level, one compact JSON row per line, trailing newline, under 16 MiB):
//   { jdk, oracle, rowCounts: { full, models, scenarios, sites }, rows }      groups full, models, scenarios, sites (sites: T20)
//   row = { id, group, input, target, options, steps, prefix, expected }; ids are unique and stable. input = { path, sha256 } (vendored
//   file) or { elk } (inline ELK JSON). Rows are built in memory in a fixed order, from lists and LinkedHashMaps only, and the whole build
//   runs twice and must agree byte for byte (the second run of the script is a cache hit).
//
// REFUSAL (W3): decided on the WHOLE plan of every level, never on a prefix, so no row is pinned. A row whose plan holds an
//   IntermediateProcessorStrategy member outside the ported sets (SEVEN_B..SEVEN_F2, SEVEN_G, P1-P5) exits 1 naming the row, unless
//   the member is in REFUSAL_CATEGORIES (7h: INCLUDE_CHILDREN, HIERARCHICAL_NODE_RESIZER): then the row is not recorded and counted per
//   category on stderr ("accepted refusals (7h): n rows"). INCLUDE_CHILDREN is also refused by option (refuseOptions). The nine arms of
//   7g (SEVEN_G) are allowed, and the COMPACTION_CONNECTED_COMPONENTS option refusal of the labels recorder is lifted. This file's rows
//   hold no 7h plan, so the accepted count is 0.
//
// ORACLE THROWS: a row whose oracle run throws inside ELK (the first frame outside this program is an org.eclipse.elk frame) is not
//   recorded; the recorder prints "ORACLE THROWS <row id> <exception>: <message> at <first ELK frame>" and "oracle throws: n rows" on
//   stderr (the JDK 21 source launcher masks short-stack exceptions, so they are caught and printed inside the recorder). The rows are
//   deterministic: the second build throws the same rows. Every other exception stops the recording.
//
// Group full (F4), id full/<family>/<model>/<variant>: target null, steps null, prefix null, options = the FINAL option values applied
//   to the ROOT node before layout (C4 values; a hierarchical model has them baked into its inline input at every level that has
//   children, options = {}: 7f2's padding-0 precedent), expected = { layout, plans } as in 7f (compact exported ELK JSON of the root
//   after new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor()); plans = { "<level path>": [member names] }
//   captured in the real run). Families (model = the model id: tests/layered/<dir>/<name> -> "<dir>-<name>", tickets/layered/<name> ->
//   "ticket-<name>", realworld/ptolemy/**/<file> -> "ptolemy-<last token of the file name, lower case>"; inline graphs name themselves):
//     self-loops           31 models: 24 of the corpus (tests/layered/self_loops 6, compaction_oned/selfloop 3, the self loop tickets 079,
//                          128 x2, 302, 340, 360, 368, 403, 416, 418, 419, 433, 444, 463, 870), the pinned ptolemy sinewaveoptimization and
//                          six more vendored ptolemy self loop models (conwayrandom, eratosthenes, trafficlight, channelfaultmodel,
//                          brewery, trialmodule); variant "default" (the model's own options) and
//                          "<DIRECTION>-<ROUTING>" (direction RIGHT, LEFT, DOWN, UP x edgeRouting ORTHOGONAL, POLYLINE, SPLINES; nine
//                          models the whole grid, the others RIGHT x the three routings); and on self_loops-hyperLoops, -label,
//                          -fixedSide the variants "distribution-<D>-ordering-<O>" for every value of
//                          edgeRouting.selfLoopDistribution (EQUALLY, NORTH, NORTH_SOUTH) x selfLoopOrdering (STACKED,
//                          REVERSE_STACKED, SEQUENCED). SelfLoopPlacementStrategy has no option at the pin.
//     wrapping             variant "<WrappingStrategy>-<CuttingStrategy>-<ValidifyStrategy>" (SINGLE_EDGE, MULTI_EDGE x ARD, MSD,
//                          MANUAL (cuts [2, 4, 6]) x NO, GREEDY, LOOK_BACK (forbidden indices [3] unless NO)) on the long chains of the
//                          vendored inputs (preserve_order simpleLongEdges01, longConflictingExample, timedAutomaton), two ptolemy
//                          models (router, randomwalk) and the inline graphs chain12 and ladder16 (no corpus model sets
//                          wrapping); the variants multi-improve-cuts-off, multi-improve-wrapped-edges-off, multi-distance-penalty-0 / -8,
//                          multi-msd-freedom-0 / -3, multi-correction-0.5 / -2, single-correction-0.5 / -2 and
//                          single/multi-additional-edge-spacing-30 on simpleLongEdges01, chain12 and ladder16.
//     compaction           the compaction_oned models (12) x compaction.postCompaction.strategy (LEFT, RIGHT, LEFT_RIGHT_CONSTRAINT_LOCKING,
//                          LEFT_RIGHT_CONNECTION_LOCKING, EDGE_LENGTH) x postCompaction.constraints (SCANLINE, QUADRATIC; QUADRATIC only
//                          with the two main strategies) x edgeRouting (ORTHOGONAL, SPLINES, and POLYLINE with EDGE_LENGTH only: a
//                          POLYLINE plan holds no HORIZONTAL_COMPACTOR); variant "<strategy>-<constraints>-<routing>" lower case, and "default".
//     compaction-splines   W7: SPLINES with every strategy x constraints (as above) over tests/layered/splines/hyperedges/* and
//                          tests/layered/hyperedge_merging/*; variant "<strategy>-<constraints>" and "default".
//     components-compaction connected_components flat01 (SimpleRowGraphPlacer), all_four_port_sides and compound01..07
//                          (ComponentGroupGraphPlacer; "off", "on", "on-<DIRECTION>-<ROUTING>"), all_four_port_sides with
//                          considerModelOrder.components GROUP_MODEL_ORDER (ComponentGroupModelOrderGraphPlacer, variant
//                          "group-model-order-<DIRECTION>"), and four inline compound graphs with external ports on four sides, eight
//                          ports, north/south and east/west only plus free components ("inline-<name>": "compaction-<DIRECTION>",
//                          "group-model-order-<DIRECTION>", DIRECTION RIGHT and DOWN).
//     converted            W4: full/converted/labels/ticket-213_componentsCompaction: the input and (empty) options of the row
//                          full/labels/ticket-213_componentsCompaction/default that layered-labels.json refused.
//     issues               Issue433Test, Issue444Test, Issue463Test, Issue870Test: the ticket inputs, default configuration.
//
// Group models, id models/<model>/<target or root>/<stop>/<variant> (7e's rows; stops of this brief): the stops SELF_LOOP_PREPROCESSOR,
//   SELF_LOOP_PORT_RESTORER, SELF_LOOP_ROUTER, SELF_LOOP_POSTPROCESSOR (variant "default", and LEFT, DOWN, UP on self_loops-hyperLoops,
//   self_loops-south and ticket-418), SINGLE_EDGE_GRAPH_WRAPPER ("single-edge", "single-edge-msd"), BREAKING_POINT_INSERTER, _PROCESSOR,
//   _REMOVER ("multi-edge", "multi-edge-msd", "multi-edge-manual") on the five wrapping models (preserve_order simpleLongEdges01, longConflictingExample, timedAutomaton, ptolemy router, randomwalk), and HORIZONTAL_COMPACTOR ("default" and
//   "<strategy>-<constraints>" lower case) on the seven compaction models, for every level whose plan has the stop (a stop not in the
//   plan skips the row and is counted on stderr). The pinned row's model (W4): ptolemy-sinewaveoptimization level N1, EVERY member of
//   its plan as a stop (a phase as P1..P5), variant "DOWN" (the options of the pinned row: direction DOWN, no components split).
//   expected as 7e/7f (layers, layerless, hidden, edges, ports, changed, geometry, dump under ten nodes) with the changes below.
//
// Group scenarios, id scenarios/<Class>/<name>[/<dir>][/end]: inline graphs (3-16 nodes), importGraph, normalise, then every plan member
//   in order up to the stop (runProcessor for an intermediate member, runPhase for P1-P5), dump last; "/end" rows run the whole plan.
//     SelfLoopPreProcessor, SelfLoopPortRestorer, SelfLoopRouter, SelfLoopPostProcessor: node a (80 x 80) between n0 and n2 with a bypass b
//       and the loops: side pairs e-e, w-w, n-n, s-s, n-s, e-w, same-port (all four directions), hyper loops over three or more ports (east,
//       north/east/south, west), several and nested loops, parallel loops, mixed sides, FREE ports, FIXED_ORDER, FIXED_POS ports, loops with
//       center/head/tail labels, port labels, a node with only loops, two nodes with loops, POLYLINE and SPLINES routing, every
//       selfLoopDistribution x selfLoopOrdering value.
//     DummySelfLoopProcessor (W3): the 16 side pairs (N, E, S, W)^2 on one node in RIGHT, five pairs in LEFT, DOWN, UP, several loops in
//       one layer, a hyper loop, loops on two nodes. The plan WITHOUT the SELF_LOOP_* arms (they hide the self loops the processor works
//       on), the op ["processor", "DummySelfLoopProcessor"] in front of NORTH_SOUTH_PORT_PREPROCESSOR (or the first P3 member when the
//       plan has none: the Javadoc of NorthSouthPortPreprocessor.java:110-140 wants it before that processor), the row ends there
//       (<name>) or runs the rest of the plan (<name>/end; for north/south loops this reaches NorthSouthPortPostprocessor.processSelfLoop).
//     BreakingPointInserter, BreakingPointProcessor, BreakingPointRemover, SingleEdgeGraphWrapper: the graphs chain (12 nodes, three skip
//       edges), ladder (16 nodes), chain-loop (a self loop on the fifth node), chain-labels (center labels) with wrapping.strategy
//       MULTI_EDGE / SINGLE_EDGE and wrapping.cutting.strategy ARD, MSD, MANUAL (the cuts [2, 4, 6] as a setProperty step on g0 after
//       importGraph, since a List<Integer> option has no ELK JSON form); every direction on chain and ladder with MSD.
//     HorizontalGraphCompactor: the graphs dag, comments (comment boxes), ns-ports (north/south ports), labels with every strategy and
//       constraints, ORTHOGONAL and SPLINES, EDGE_LENGTH and LEFT_RIGHT_CONNECTION_LOCKING in all four directions.
//     ComponentsCompactor: terminal step ["layout"] over the compound node "c" (importGraph target "c") with compaction.connectedComponents,
//       external ports (four sides, eight ports, north/south), ComponentGroupGraphPlacer and ComponentGroupModelOrderGraphPlacer in
//       every direction; a flat graph with components under the SimpleRowGraphPlacer for the three routings.
//   STEP OPS (JSON arrays; the rows use importGraph, normalise, setProperty, runProcessor, runPhase, processor, layout, dump):
//     ["importGraph", target]  ["normalise"]  ["setProperty", path, id, C4 value]  ["runProcessor", member]  ["runPhase", phase, strategy]
//     ["layout"] (terminal: imported graph dump plus "layout", the export after a LayeredLayoutProvider run)  ["dump"] (terminal)
//     ["processor", "<SimpleClassName>"] (W3): runs ONE processor that no IntermediateProcessorStrategy member creates, with a fresh
//       BasicProgressMonitor, at its position in the step list; the only name is "DummySelfLoopProcessor" (any other is a recorder bug).
//
// What changes in a dump (every row, W3): (a) the property selfLoopHolder (InternalProperties.SELF_LOOP_HOLDER) is NOT recorded under
//   changed / dump properties (reflected, the nested SelfLoopHolder graph was about one megabyte per node); expected.selfLoops holds it
//   instead, present on a row only when a node has the property: { "<node path>": { portsHidden, slotCounts [routing slot count per
//   PortSide ordinal], ports: [{ port, hadOnlySelfLoops, hidden }] in SelfLoopHolder.getSLPortMap() order, loops: [{ type, ports,
//   edges (getSLEdges() order), occupiedSides, slots [getRoutingSlot per PortSide.values()], leftmost, rightmost, labels: null |
//   { labels, side, alignment, size, position, reference } }] } }, elements as paths of the row's path map (hidden ports and removed
//   edges keep their baseline paths). (b) geometry carries ports and labels for the nine stops of this brief (PORT_LABEL_STOPS).
//   Every other rule is the labels recorder's: breakingPoint.info and other ELK objects are reflected by the Encoder as before.
//
// Option values the TS replay registry needs (C4 enum types): WrappingStrategy (OFF, SINGLE_EDGE, MULTI_EDGE), CuttingStrategy (ARD, MSD,
//   MANUAL), ValidifyStrategy (NO, GREEDY, LOOK_BACK), GraphCompactionStrategy (NONE, LEFT, RIGHT, LEFT_RIGHT_CONSTRAINT_LOCKING,
//   LEFT_RIGHT_CONNECTION_LOCKING, EDGE_LENGTH), ConstraintCalculationStrategy (QUADRATIC, SCANLINE), SelfLoopDistributionStrategy
//   (EQUALLY, NORTH, NORTH_SOUTH), SelfLoopOrderingStrategy (STACKED, REVERSE_STACKED, SEQUENCED), ComponentOrderingStrategy (NONE,
//   MODEL_ORDER, GROUP_MODEL_ORDER), plus Direction and EdgeRouting. Non-enum options: wrapping.cutting.cuts and
//   wrapping.validify.forbiddenIndices (C4: a JSON array of {t:int,v}), wrapping.multiEdge.improveCuts / improveWrappedEdges (bool),
//   wrapping.multiEdge.distancePenalty, wrapping.correctionFactor, wrapping.additionalEdgeSpacing (double), wrapping.cutting.msd.freedom
//   (int), compaction.connectedComponents (bool).
//
// Size (journaled trims, LOOPS_STATS=1 prints the bytes per family): the unrestricted grid is about 70 MB. Trims, all of variants, never
//   of models: the SelfLoopHolder summary replaces the reflected holder; direction variants of the self loop stops on three models; the
//   wrapping grid on five models and two inline graphs; QUADRATIC constraints on the two main strategies; POLYLINE only with EDGE_LENGTH;
//   scenario directions as above.
//
// Group sites (T20), id sites/<Class>/<name>[/<variant>]: one step row per scenario of plans/layered-loops-wrapping-compaction/unreached.md
//   (Sc1-Sc34) that an oracle graph reaches, recorded by the same step interpreter and ops as the scenarios (no new op): the chain up to the
//   plan member that decides the arm (setProperty steps on g0 for the cuts and the forbidden indices) and a dump, or importGraph, normalise
//   and the terminal layout of the imported graph (nested level c: the import target). Rows are appended after the scenarios, so no earlier
//   row changes. Sc22 (the DummySelfLoopProcessor plan under POLYLINE and SPLINES) is recorded here too: sites/DummySelfLoopProcessor/...
//   Scenarios no graph reaches are not recorded (Sc25, Sc28, Sc34; arms of Sc12, Sc22, Sc26): the verdicts are in the T20 journal entry.
//
// Identity hashes: the script runs the JVM with -XX:+UnlockExperimentalVMOptions -XX:hashCode=2 so identity-hashed collections iterate in
//   insertion order (AD-10; up to 10 entries, then HashMap treeifies); main fails without it. The seed properties are those of
//   tools/oracle/run.sh (export and identifier seed 1) so exported ids agree with refs/elk (F4). No row sets a random seed of 0.
//
// Diagnosis aids (environment, output unchanged when unset): LOOPS_FILTER=<text> builds only rows whose id contains the text (no coverage
//   check, one build); LOOPS_DISCOVER=1 prints refusals instead of stopping; LOOPS_MARKERS=1 writes "ROW <id>" to stdout per row;
//   PHASE_TRACE=1 one stderr line per row; LOOPS_STATS=1 prints the bytes per row family and model; LOOPS_CAP_MB=<n> raises the size cap
//   for a measuring run (never for the ref).
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import org.eclipse.elk.core.math.KVector;
import org.eclipse.elk.graph.ElkLabel;
import org.eclipse.elk.core.labels.ILabelManager;

public class LayeredLoopsVectors extends LayeredLoopsVectorsSweep {
    /** The pinned ELK commit: the recorder script passes tools/oracle/ELK_COMMIT as -Delk.commit (issue #96). */
    static String elkCommit() {
        String commit = System.getProperty("elk.commit");
        if (commit == null || !commit.matches("[0-9a-f]{40}")) {
            throw new IllegalStateException("system property elk.commit is " + commit
                + ", not a 40-digit sha; run this recorder through its tools/vectors/*-vectors.sh script");
        }
        return commit;
    }

    // SHA-256 of every vendored input read, "<sha256>  repo:<path under the repo root>". Keep these lines: the shell
    // script parses them (grep for 64 hex digits, two spaces, "repo:"). The table is the list of every model of this recorder: the
    // model path is the part after inputs/ (and after labels/, loops/ or pipeline/, the directories that mirror the models repository).
    static final String MODEL_TABLE = """
baf8158831ca83d2a057d68ebec643a1a285607c910ba9339f43d5042aafb88d  repo:test/golden/inputs/labels/tests/layered/compaction_oned/hierarchical_ports/hports1.elkt
62829d8cdad4d7f3723998ba212c7b121234bc739fff41dcdda4da1c3dbd32f4  repo:test/golden/inputs/labels/tests/layered/connected_components/compound01.elkt
35d6a522ae9b9423f72a5c9200072ba51563e4b520f6a24b7bb3e7c3158caad5  repo:test/golden/inputs/labels/tests/layered/connected_components/compound02.elkt
4b52133344f4a678ee6bf29c27c7fd9e1725a96a0474bd07b6c90d59d45af47a  repo:test/golden/inputs/labels/tests/layered/connected_components/compound03.elkt
a9ef14dea1e007f0189561caf7bf5311d36a82197dcafd98e469d68bf4aed2b8  repo:test/golden/inputs/labels/tests/layered/connected_components/compound04.elkt
42b04dabe75d53f85988c441c18254a22ab2a32fe50fbbd726963b36cc613ebd  repo:test/golden/inputs/labels/tests/layered/connected_components/compound05.elkt
ca7130b3755aecf5b8f157c004108c94dc9d933492428174c50173715e379efc  repo:test/golden/inputs/labels/tests/layered/connected_components/compound07.elkt
4df035d742bb5b5c2a587f66fbdcb185b7b0c9f806cf87e7daeb33b941100e2f  repo:test/golden/inputs/labels/tests/layered/connected_components/flat01.elkt
ce2112306749ed9d9b72cb49551b4ee06693c35948bf80e08779451676dd57b3  repo:test/golden/inputs/labels/tickets/layered/213_componentsCompaction.elkt
1c83d9a85faefc2aa1318d135f5ab1ba63086c425effd71a003c4a6f70e1209a  repo:test/golden/inputs/loops/realworld/ptolemy/flattened/backtrack_trialmodule_TrialModule.json
6fc29196ccbb63de20413537ddf532c6a31017cee1f905ee95ca10a508e8a398  repo:test/golden/inputs/loops/realworld/ptolemy/flattened/ca_conwayrandom_ConwayRandom.json
24d7fda72c3b8161134d2eec4951263214aaf4d25dc922103f1c40886155da9c  repo:test/golden/inputs/loops/realworld/ptolemy/flattened/ddf_eratosthenes_Eratosthenes.json
1f100ccec0400a2efdda58a1debff09bce95c0253dbd256c67cc1c1401b804d1  repo:test/golden/inputs/loops/realworld/ptolemy/flattened/ptera_trafficlight_TrafficLight.json
03df4af8d24b6611becfb5125ea68ea022cc04b1a5797beeeb9f3a774989d474  repo:test/golden/inputs/loops/realworld/ptolemy/flattened/ptolemy_brewery_Brewery.json
25f09f4bea569580d312f48e22b75db3d02f47b2499cbf61e2e6ace6236c37a0  repo:test/golden/inputs/loops/realworld/ptolemy/flattened/ptolemy_probabilisticmodels_ChannelFaultModel.json
40cd0886cd688d3f1843fe69010773ebabbadb3466c66d5060cc29519ee40127  repo:test/golden/inputs/loops/tests/layered/compaction_oned/labels/edgeLabelAndSplines.elkt
4857cd3fa71681d509839d9f366985938e5245530e09edc9991154739cba0372  repo:test/golden/inputs/loops/tests/layered/compaction_oned/labels/edgeLabelShouldBeCentered.elkt
8233fd2d987b2a50f3c0ebc7244dfde0523cbc25514b53d3e7bb88fa3c9c836c  repo:test/golden/inputs/loops/tests/layered/compaction_oned/labels/edgeLabelSideSelection01.elkt
0df3b9ca8d225d5330152566bf365c9dbd81d467a6e31be951560544198d31ec  repo:test/golden/inputs/loops/tests/layered/compaction_oned/labels/labels1.elkt
eb9c06b9a4fecba16f3ecf41a2f2ebbf5599316d2a78fa3a948786182ab03e15  repo:test/golden/inputs/loops/tests/layered/compaction_oned/labels/labels2.elkt
b8a46251666118ab7b698d8cda13f00d6ce92130518da7524a9e078b4a48d008  repo:test/golden/inputs/loops/tests/layered/compaction_oned/nsport/south_port.elkt
43eec7ee4aac8fe2ec7db9952cda0635ffe9519b386e2bbd51547b7e82d250f3  repo:test/golden/inputs/loops/tests/layered/compaction_oned/selfloop/selfloop_crash.elkt
3b64c2454a6f2d7f09756cf37d7cb6e85389207d6edb0327eb468a38560fe740  repo:test/golden/inputs/loops/tests/layered/compaction_oned/selfloop/selfloop_orthogonal.elkt
744b7429099c8bd2e520d372cf50960ec6ed89363a273e7fe764bc8c687a1ae8  repo:test/golden/inputs/loops/tests/layered/compaction_oned/selfloop/selfloop_spline.elkt
07599a704c0c390f6cec7b24e9b94a33b23c2ed178baff4ada71713691a0d402  repo:test/golden/inputs/loops/tests/layered/compaction_oned/splines/moreThanOneStraightSegmentPath.elkt
71d29a43907866b2e4480e0f11950f44fa48f3b3ecf9883462f3ddc2810f8e64  repo:test/golden/inputs/loops/tests/layered/compaction_oned/splines/moreThanOneStraightSegmentPath2.elkt
ba76bdedc5fac17b21b421aa452eff2fcc2fc1025d2dc310e9de26836921fd55  repo:test/golden/inputs/loops/tests/layered/connected_components/all_four_port_sides.elkt
be4432e044af040bbf605122abce5191d1a8c32c0398f85afd72038118020b57  repo:test/golden/inputs/loops/tests/layered/connected_components/compound06.elkt
e01cbc88fe04dea7ba33f638117ac38a9d1f400f7b463d0a92b6efa9d7d22acf  repo:test/golden/inputs/loops/tests/layered/self_loops/fixedSide.elkt
98c95311b0338e544f0012a6b360ccc60481e42e1bf614053cb58cc3012034be  repo:test/golden/inputs/loops/tests/layered/self_loops/free.elkt
5562f0070f81eca2dbf3255e4fee7e31387cd81ee945d33344a9a53c0e4f8aa7  repo:test/golden/inputs/loops/tests/layered/self_loops/hyperLoops.elkt
bdcd7c2aec80ace521a0d1078b36415a819d48eb5c4264a07649a99ad5277b48  repo:test/golden/inputs/loops/tests/layered/self_loops/inside_outside.elkt
b35c1e4e70c564c6f7135c6cb33e30d4996ae65d45c7da22a0d7d0cb0b48ecfc  repo:test/golden/inputs/loops/tests/layered/self_loops/label.elkt
6ad82549e3f651ada0bb754de8a9145c15f6114144eafcbcca65ddb453e928c3  repo:test/golden/inputs/loops/tests/layered/self_loops/south.elkt
8a69ac97f5a8d58d666b0b4f01b128e7b8e5325a35e4439b6e7265f370d142a9  repo:test/golden/inputs/loops/tickets/layered/079_selfLoopLabels.elkt
2de0f2034ee94c7635100a46700be5b465626b25fc00a1df3144f7512919ad9a  repo:test/golden/inputs/loops/tickets/layered/128_selfLoopLabelSpacing_complex.elkt
d0b06deea3a57d8665abcbf46b54f327e2a2189aff20bf09fb4c3097fb5ce45e  repo:test/golden/inputs/loops/tickets/layered/128_selfLoopLabelSpacing_simple.elkt
173ce8736616ea3770ffd746f40d6c4b4a8007b3be7dc693b9317a090a9bee41  repo:test/golden/inputs/loops/tickets/layered/302_brokenSplineSelfLoops.elkt
bd51cb9da91baed348b762426050cceb4eac1271ff9fc6cab13960ab076af598  repo:test/golden/inputs/loops/tickets/layered/340_classCastExceptionGreedySwitch.elkt
87b2633a34d7ae5f53b74fb9f8e8cb67e528dafb888b56e695cb6a5002450290  repo:test/golden/inputs/loops/tickets/layered/360_badSelfLoopLabelPlacement.elkt
7bf41603ffa5b9fe675c50aac1cb1329757726473cb14f822016f1075d36a981  repo:test/golden/inputs/loops/tickets/layered/368_selfLoopLabelsIOOBE.elkt
fa2da4f4b9bebc51ba79d5685806a4f3037467c6f6966a7e235a43b41e7aed44  repo:test/golden/inputs/loops/tickets/layered/403_stackedSelfLoopLabels.elkt
5cfa58ad61b88a859f3ed3ce8667ef73956fc3867ec39fc130867974111ea403  repo:test/golden/inputs/loops/tickets/layered/416_longSelfLoops.elkt
34130b6eb753e8f34d3e4ee6041909bb0c38b98ea26cb6f2889077bbd2001d4d  repo:test/golden/inputs/loops/tickets/layered/418_northPortsWithSelfLoops.elkt
465a89b33d88582c7a467c5d82ae1888b8a2d3095691901998110394afad6df5  repo:test/golden/inputs/loops/tickets/layered/419_northSelfLoopsAndRegularEdges.elkt
42f217f05a54e953127635cace59551f6874b1fb3af89ba8e6779c7087fb4684  repo:test/golden/inputs/loops/tickets/layered/433_graphSizeWithSelfLoopLabel.elkt
1c96e4e624e5368ce72969e53c3ef0a65791b5164ce3c6cf6d32534fc0e05a1b  repo:test/golden/inputs/loops/tickets/layered/444_selfLoopsNPE.elkt
7bc67fe6cacec988481bc0ff3c4b67b6a89e17c04f637dc48bd4fcb0b28da83e  repo:test/golden/inputs/loops/tickets/layered/463_aioobe_with_self_loops.elkt
c8774eb4067211ee046580f881a339794ca64a14249c5b1b7a3d36214d6caf01  repo:test/golden/inputs/loops/tickets/layered/870_networkSimplexNodePlacer.elkt
a78212a04054c839dce3f947456062160c5d668370c43a0945e0e395d865c57b  repo:test/golden/inputs/pipeline/realworld/ptolemy/hierarchical/comm_scrambler_Scrambler.json
ce3418acfa52e7afca791ec96756021d02268d6996185bc588e974e00c702f70  repo:test/golden/inputs/pipeline/realworld/ptolemy/hierarchical/de_afdx_AFDXMulticastSimple.json
8d3f9d6477c3849c5406992c893b0d365cab19e225802d0442b47a3bb537c3c2  repo:test/golden/inputs/pipeline/realworld/ptolemy/hierarchical/de_clockdrift_ClockDriftHierarchy.json
7a3828beab03773ed1e6acac596c7ef2d7fc7038ce36af07da2ebcf69eaf04a7  repo:test/golden/inputs/pipeline/realworld/ptolemy/hierarchical/de_switch_CrossbarSwitch.json
83193114e73feb7aafee5bff340ec96aa7c9925244bd4d0db0861a44c7e7dc4a  repo:test/golden/inputs/realworld/ptolemy/flattened/continuous_levelcrossingdetector_LevelCrossingDetector.json
89c039382505a18941c9441f26c7f7ef654e1bccc649a413ba280ef2a942a0a5  repo:test/golden/inputs/realworld/ptolemy/flattened/ddf_randomwalk_RandomWalk.json
a047cb61956067337c91aa2d9aff3d86902817e3dcdf80a0c3c7552d31d998f1  repo:test/golden/inputs/realworld/ptolemy/flattened/de_router_Router.json
6f30f5a5f316c40eaf2536869477d40af063608a5243e63df6eb20742fbfd745  repo:test/golden/inputs/realworld/ptolemy/flattened/hlacerti_multidatatypes_producer.json
2c7d5115b347e663f35906eb3f5ecff3535405fa3c7d46373d9a33b567d4a5dc  repo:test/golden/inputs/realworld/ptolemy/flattened/pthales_dynamic_ThalesDynamicModalModelPN.json
2d1317aa12c8e43668a681b79af12002f3da3e35efd70b6e841153e7658a1381  repo:test/golden/inputs/realworld/ptolemy/hierarchical/de_compositeqm_CheckExecutionTimeConstraints.json
1cd5f7c806664cf80e1a7d1a81fe0a9b5c2d22d532367a46127f9bc19d932ca4  repo:test/golden/inputs/realworld/ptolemy/hierarchical/gt_sinewaveoptimization_SinewaveOptimization.json
55668b77428b4b4cf28704a02cf6953683b263222b6978e1602db80aacc6fde1  repo:test/golden/inputs/realworld/ptolemy/hierarchical/hoc_threadedcomposite_MulticoreExecution.json
438ef5a74dadd23bbe7faff63f012e03d99dc8f49477ca2341176b5d8de4d075  repo:test/golden/inputs/realworld/ptolemy/hierarchical/sdf_htvq_HTVQ4.json
e01f73a626343e3bdd04bc53df7a071aff002dffa9a1d2e7d187f258f26e6c18  repo:test/golden/inputs/tests/layered/hyperedge_merging/hyperedge_labels.elkt
e83d20235f71efdb5457912ce8ce511769bffa6aeec6b55028d560939102f9b2  repo:test/golden/inputs/tests/layered/hyperedge_merging/hyperedges01.elkt
c5a03df0bd66d97aa5366a95a92190beb9ad4cca41e178c18f364ce7afa8913f  repo:test/golden/inputs/tests/layered/hyperedge_merging/inverted_ports.elkt
9edf4186fc3b8dad415ff631fe8110b24aed8989c9b1658d9971e0fd7626a1c4  repo:test/golden/inputs/tests/layered/hyperedge_merging/north_south_ports_01.elkt
16a029cc17643b42dd5e0e79e64a6fe093ce343c5bff76742a6ac9b8dbd36dde  repo:test/golden/inputs/tests/layered/hyperedge_merging/north_south_ports_02.elkt
f1880960129542711274042d8979bb3c61e5d8c998635ce3d3425bca312aee66  repo:test/golden/inputs/tests/layered/hyperedge_merging/north_south_ports_03.elkt
c8e464721526830bd48744a2b33c6ad9492dd16ee1991428152592607caa97fd  repo:test/golden/inputs/tests/layered/hyperedge_merging/unequal_src_tgt.elkt
4248ffd82104950274cf5cedb5db9da7eea69e60f91a03a6af0efd484e1767c1  repo:test/golden/inputs/tests/layered/hyperedge_merging/unequal_src_tgt_with_labels.elkt
46ec2d3ee84d7e6a34cc4639818c923f32bb9132a574a26553f17ecd3e327aab  repo:test/golden/inputs/tests/layered/preserve_order/longConflictingExample.elkt
6a079c8ed64b9ce9b9bc531517be6bb8cc86d759d4fe869ae291e74c9b5eb4f3  repo:test/golden/inputs/tests/layered/preserve_order/noCrossings.elkt
163d8b2d720cd453c48f12e7fc5715c1bea73523ddeaf6552fae438f13627a74  repo:test/golden/inputs/tests/layered/preserve_order/simpleLongEdges01.elkt
9be7c4c086ff3d4539116c99f27dc018d98040d2738c54ef893dd5099211e357  repo:test/golden/inputs/tests/layered/preserve_order/simpleLongEdges02.elkt
33e5d6d148f0bf7e02b654d1073351ee088005a75344b676552df267351d5ce3  repo:test/golden/inputs/tests/layered/preserve_order/timedAutomaton.elkt
fcde69b053e5fa8b6fa07258d3643424e6138006bfe90bf41db1936fcf0ddcfc  repo:test/golden/inputs/tests/layered/preserve_order/timedAutomatonMoreEdges.elkt
aade476173d1f260bc0f10e2431e4e6e36965c93bd109933f8359745de161700  repo:test/golden/inputs/tests/layered/splines/hyperedges/hyperedges_1.elkt
bf0f9655c77c6ca7e4672130cc39c2e7350120087f76e45683785458ebcbbb2b  repo:test/golden/inputs/tests/layered/splines/hyperedges/hyperedges_2.elkt
""";


    /** A recorder or scenario bug: stops the recording. */
    static final class Bug extends RuntimeException {
        Bug(String message) {
            super(message);
        }
    }

    /** A pipeline row whose prefix names a processor outside the 7b set (exit 1, B4). */
    static final class Refusal extends RuntimeException {
        final String member;
        Refusal(String message, String member) {
            super(message);
            this.member = member;
        }
    }

    /** G6: the label manager of kind "shrink-width" (see the header): shrinks a wider label to the target width and keeps its height. */
    static final class ShrinkWidthManager implements ILabelManager {
        @Override
        public KVector manageLabelSize(final Object label, final double targetWidth) {
            ElkLabel l = (ElkLabel) label;
            return l.getWidth() > targetWidth ? new KVector(targetWidth, l.getHeight()) : null;
        }
    }

    /** A processor stop the assembled algorithm of the row does not contain (a models row, skipped and counted). */
    static final class NotInPlan extends RuntimeException {
        NotInPlan(String message) {
            super(message);
        }
    }

    /** A case outside the sweep's scope (W5: the whole plan of no level holds one of the nine arms and no connectedComponents option is on). */
    static final class OutOfScope extends RuntimeException {
        OutOfScope(String reason) {
            super(reason, null, false, false);
        }
    }

    public static void main(String[] args) throws Exception {
        if (args.length > 0 && (args[0].equals("--sweep") || args[0].equals("--dump"))) {
            try {
                sweepMain(args);
            } catch (Exception | Error e) {
                throw e;
            } catch (Throwable t) {
                throw new IllegalStateException(t);
            }
            return;
        }
        if (args.length > 0 && args[0].equals("--plan-dump")) {
            planDump(args);
            return;
        }
        elkCommit(); // refuse before the first row is recorded, not at the stamp, when the pin was not passed
        setup(args[1]);
        String file;
        try {
            file = buildAll();
            if (FILTER == null) {
                String again = buildAll();
                if (!file.equals(again)) {
                    throw new IllegalStateException("two builds differ\n" + clip(file, again) + "\n" + clip(again, file));
                }
            }
        } catch (Refusal r) {
            System.err.println("refused: " + r.getMessage());
            System.exit(1);
            return;
        }
        Files.createDirectories(Path.of(args[0]));
        long bytes = file.getBytes(StandardCharsets.UTF_8).length;
        if (bytes > MAX_BYTES) {
            throw new IllegalStateException(OUTPUT + " is " + bytes + " bytes, over the 16 MiB cap");
        }
        Files.writeString(Path.of(args[0], OUTPUT), file, StandardCharsets.UTF_8);
        strictParse(Path.of(args[0], OUTPUT));
        System.err.println("strict JSON parse ok, " + OUTPUT + " bytes " + bytes);
    }
}
