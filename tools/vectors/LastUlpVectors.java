// SPDX-License-Identifier: EPL-2.0
// ORIGIN: header shape, hex doubles, the input table and the strict parse copied in shape from
//         tools/vectors/RadialVectors.java; the Math against StrictMath rows follow the `log` rows of tools/vectors/ForceVectors.java
//         (logRows); the layout run mirrors the oracle harness, which is package-private and compiled apart from this program:
//         tools/oracle/harness/CaseRunner.java (run, export), GraphOverlay.java (retarget), ElkModelReader.java (readElkt) and
//         ElkOracle.java (registerMetaDataProviders). Mission last-ulp-bar (issue #74), T3, decision D4.
//
// Generates the frozen JVM evidence (AD-13) for the last-ulp `Math.*` entries of docs/conformance.md (AD-4 amendment of 2026-11-13:
// a last-ulp case is a known divergence only with a demonstrated HotSpot-against-V8 mechanism and an effect at or below 0.01 px).
// Java's Math.sin and Math.cos need not equal StrictMath (the Javadoc allows 1 ulp), and HotSpot's differ from it on some inputs;
// V8 equals StrictMath on every input recorded here. This program only CALLS JDK and ELK APIs and records results; it embeds no
// ELK algorithm.
// Run: tools/vectors/last-ulp-vectors.sh <outDir>   (java -cp ... LastUlpVectors.java <outDir> <tools/vectors dir>, JVM flags
//      -XX:+UnlockExperimentalVMOptions -XX:hashCode=2 -XX:-OmitStackTraceInFastThrow). Writes last-ulp.json; landed copy:
//      test/golden/refs/java/last-ulp.json. Re-record: run the script into a scratch dir (ELK_VECTORS_CACHE=off for a cold run), then
//      copy the file over the ref and journal the regeneration. The values are those of the reference platform (macOS arm64,
//      JDK 21.0.1): another JDK or CPU architecture may give other `cold` and `warm` bits, and the header records both.
//
// INPUTS: tools/vectors/last-ulp-inputs.txt, lines `<entry> <sin|cos> <16 hex digits of the input>` after `#` comments (collected
//   on the TS side; its header says how), and the model of the E1 layout, pinned here (the script checks the hash before a run):
//   cbee772a79738d47f1dff2e61debb90f815f498eeca81cf63e612656316553ff  repo:test/golden/inputs/tests/layered/splines/sloppy_overlaps_2.elkt
//
// FILE: 2-space top level, one compact JSON row per line, trailing newline, strict JSON (Gson JsonReader):
//   { jdk, arch, rowCounts: { math, layout }, rows: [row...] }
//   jdk = java.version, arch = os.arch of the recording JVM. The file carries no `oracle` stamp (issue #173): the landed
//   fitness test test/architecture/elk-pin.fitness.test.ts pins the number of recorders that stamp the pin, and AD-13 freezes that
//   number. The script still refuses to run unless the oracle was built from tools/oracle/ELK_COMMIT.
//
// ROW: ids are unique. Every double is a 16-hex-digit lowercase string, Long.toHexString(Double.doubleToLongBits(d)) zero-padded
//   (a NaN fails the recording).
//   math    { id: "math/<entry>/<fn>/<x>", group: "math", entry, fn: "sin" | "cos", x, cold, warm, strict }, in input-file order.
//           cold   = Math.<fn>(x) on the first pass over the inputs, the first time the evaluating method runs (interpreted);
//           warm   = Math.<fn>(x) on the last of WARM_PASSES further passes (WARM_PASSES x the number of inputs calls, at least
//                    MIN_WARM_CALLS, with a live sink), when the method is compiled; the recording fails unless the last
//                    STABLE_PASSES passes all gave these bits;
//           strict = StrictMath.<fn>(x).
//   layout  { id: "layout/<entry>/<run>", group: "layout", entry, run: "cold" | "warm", caseId, algorithm, input, childAreaHeight,
//             runsAgree, output }
//           the model at `input` (repository path) read as ElkModelReader.readElkt does, retargeted as GraphOverlay.retarget does
//           (randomSeed = 1 on the root, `algorithm` on every node with children; variant `default` sets nothing), laid out by
//           new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor()) and exported as CaseRunner.export does but
//           on one line (omitLayout(false).omitZeroDimension(false).omitZeroPositions(false).omitUnknownLayoutOptions(true)
//           .prettyPrint(false)) under exportSeed = 1, with every provider ElkOracle registers. output = that export, embedded.
//           run cold = the first layout of the JVM; run warm = the layout after LAYOUT_WARMUPS further layouts of the same model
//           (each from a fresh read), the last STABLE_LAYOUTS of which must all equal it. childAreaHeight = the root's
//           layoutOptions.childAreaHeight string of that run; runsAgree = the cold and warm exports are the same string.
//           caseId names the sweep case this reproduces (tools/oracle/sweep.sh).
// Order in the JVM: the cold math pass, the cold layout, the layout warm-up and the warm layout, then the math warm-up.
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

import org.eclipse.elk.alg.common.compaction.options.PolyominoOptions;
import org.eclipse.elk.alg.disco.options.DisCoMetaDataProvider;
import org.eclipse.elk.alg.force.options.ForceMetaDataProvider;
import org.eclipse.elk.alg.force.options.StressMetaDataProvider;
import org.eclipse.elk.alg.layered.options.LayeredMetaDataProvider;
import org.eclipse.elk.alg.mrtree.options.MrTreeMetaDataProvider;
import org.eclipse.elk.alg.radial.options.RadialMetaDataProvider;
import org.eclipse.elk.alg.rectpacking.options.RectPackingMetaDataProvider;
import org.eclipse.elk.alg.spore.options.SporeMetaDataProvider;
import org.eclipse.elk.alg.topdownpacking.options.TopdownpackingMetaDataProvider;
import org.eclipse.elk.alg.vertiflex.options.VertiFlexMetaDataProvider;
import org.eclipse.elk.core.RecursiveGraphLayoutEngine;
import org.eclipse.elk.core.data.ILayoutMetaDataProvider;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.core.options.CoreOptions;
import org.eclipse.elk.core.util.BasicProgressMonitor;
import org.eclipse.elk.graph.ElkNode;
import org.eclipse.elk.graph.json.ElkGraphJson;
import org.eclipse.elk.graph.text.ElkGraphStandaloneSetup;
import org.eclipse.emf.common.util.TreeIterator;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

public class LastUlpVectors {
    static final String OUTPUT = "last-ulp.json";
    static final String INPUTS = "last-ulp-inputs.txt";
    static final String PROGRAM = "tools/vectors/LastUlpVectors.java";
    static final String SEED_PROPERTY = "org.eclipse.elk.graph.json.exportSeed";
    static final String IDENTIFIER_SEED_PROPERTY = "org.eclipse.elk.graph.util.identifierSeed";
    static final String G_MATH = "math";
    static final String G_LAYOUT = "layout";
    static final String FN_SIN = "sin";
    static final String FN_COS = "cos";
    static final String RUN_COLD = "cold";
    static final String RUN_WARM = "warm";
    static final String INPUT_LINE = "E[0-9]+ (sin|cos) [0-9a-f]{16}";
    static final int HEX_RADIX = 16;

    /** Passes over the inputs after the cold one; with the 334 inputs of the landed file that is 1,336,000 calls. */
    static final int WARM_PASSES = 4000;
    static final int MIN_WARM_CALLS = 200_000;
    static final int STABLE_PASSES = 500;

    /** The E1 case: the one sweep case with a last-ulp difference beyond 1e-6 (issue #68 item B). */
    static final String E1 = "E1";
    static final String E1_CASE = "retarget/radial/default/tests/layered/splines/sloppy_overlaps_2";
    static final String E1_ALGORITHM = "org.eclipse.elk.radial";
    static final String E1_INPUT = "test/golden/inputs/tests/layered/splines/sloppy_overlaps_2.elkt";
    static final String CHILD_AREA_HEIGHT = "childAreaHeight";
    /** GraphOverlay.RANDOM_SEED. */
    static final int RANDOM_SEED = 1;
    static final int LAYOUT_WARMUPS = 3000;
    static final int STABLE_LAYOUTS = 500;

    static Path repo;
    static final List<String> NOTES = new ArrayList<>();

    /** A recorder failure (never an oracle throw). */
    static final class Bug extends RuntimeException {
        Bug(String m) {
            super(m);
        }
    }

    static void need(boolean ok, String message) {
        if (!ok) {
            throw new Bug(message);
        }
    }

    // ------------------------------------------------------------------------------------------------------------
    // JSON helpers

    /** 16 hex digits of Double.doubleToLongBits (a NaN would be the canonical 7ff8000000000000, #72); the guard rejects a NaN. */
    static String bits(double d) {
        if (Double.isNaN(d)) {
            throw new Bug("NaN in a recorded value");
        }
        return String.format("%016x", Double.doubleToLongBits(d));
    }

    static String str(String s) {
        StringBuilder sb = new StringBuilder("\"");
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            switch (ch) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                default -> {
                    if (ch < 0x20) {
                        sb.append(String.format("\\u%04x", (int) ch));
                    } else {
                        sb.append(ch);
                    }
                }
            }
        }
        return sb.append('"').toString();
    }

    static void strictParse(Path file) throws IOException {
        try (java.io.Reader in = Files.newBufferedReader(file, StandardCharsets.UTF_8);
                com.google.gson.stream.JsonReader reader = new com.google.gson.stream.JsonReader(in)) {
            reader.skipValue();
            if (reader.peek() != com.google.gson.stream.JsonToken.END_DOCUMENT) {
                throw new IllegalStateException(file + " has content after the top-level JSON value");
            }
        }
    }

    // ------------------------------------------------------------------------------------------------------------
    // math rows

    /** One line of the inputs file. */
    record MathInput(String entry, String fn, String xHex, double x) {
        String id() {
            return G_MATH + "/" + entry + "/" + fn + "/" + xHex;
        }
    }

    static List<MathInput> readInputs(Path file) throws IOException {
        List<MathInput> inputs = new ArrayList<>();
        Set<String> ids = new HashSet<>();
        for (String line : Files.readAllLines(file, StandardCharsets.UTF_8)) {
            if (line.isEmpty() || line.startsWith("#")) {
                continue;
            }
            need(line.matches(INPUT_LINE), "bad line in " + INPUTS + ": " + line);
            String[] p = line.split(" ");
            MathInput input = new MathInput(p[0], p[1], p[2], Double.longBitsToDouble(Long.parseUnsignedLong(p[2], HEX_RADIX)));
            need(bits(input.x).equals(input.xHex), "input is not a canonical double: " + line);
            need(ids.add(input.id()), "duplicate input: " + line);
            inputs.add(input);
        }
        need(!inputs.isEmpty(), INPUTS + " holds no input");
        return inputs;
    }

    /** One pass: Math.sin or Math.cos of every input into {@code out}; the sum keeps the calls live. The only caller of Math here. */
    static double mathPass(boolean[] isSin, double[] xs, double[] out) {
        double sink = 0;
        for (int i = 0; i < xs.length; i++) {
            double y = isSin[i] ? Math.sin(xs[i]) : Math.cos(xs[i]);
            out[i] = y;
            sink += y;
        }
        return sink;
    }

    /** The inputs as the arrays of mathPass, and the cold pass, taken before anything else runs. */
    static final class MathRun {
        final List<MathInput> inputs;
        final boolean[] isSin;
        final double[] xs;
        final double[] cold;
        double sink;

        MathRun(List<MathInput> inputs) {
            this.inputs = inputs;
            isSin = new boolean[inputs.size()];
            xs = new double[inputs.size()];
            cold = new double[inputs.size()];
            for (int i = 0; i < xs.length; i++) {
                isSin[i] = inputs.get(i).fn.equals(FN_SIN);
                xs[i] = inputs.get(i).x;
            }
            sink = mathPass(isSin, xs, cold);
        }

        /** The warm passes: the bits of the last one, which the last STABLE_PASSES passes must all have given. */
        double[] warm() {
            int n = xs.length;
            need((long) WARM_PASSES * n >= MIN_WARM_CALLS, "fewer than " + MIN_WARM_CALLS + " warm calls");
            double[] warm = new double[n];
            double[] pass = new double[n];
            int lastChange = 0;
            for (int p = 1; p <= WARM_PASSES; p++) {
                sink += mathPass(isSin, xs, pass);
                if (p == 1 || !sameBits(pass, warm)) {
                    lastChange = p;
                }
                System.arraycopy(pass, 0, warm, 0, n);
            }
            need(lastChange <= WARM_PASSES - STABLE_PASSES, "Math value still changing at warm pass " + lastChange);
            NOTES.add("math: " + WARM_PASSES + " warm passes (" + (long) WARM_PASSES * n + " calls), last change at pass " + lastChange
                    + ", sink live " + (sink != 0));
            return warm;
        }

        /** The rows, in input order, and the per-entry counts for the journal. */
        List<String> rows() {
            double[] warm = warm();
            List<String> rows = new ArrayList<>();
            Map<String, int[]> counts = new TreeMap<>();
            for (int i = 0; i < xs.length; i++) {
                MathInput in = inputs.get(i);
                String c = bits(cold[i]);
                String w = bits(warm[i]);
                String s = bits(isSin[i] ? StrictMath.sin(xs[i]) : StrictMath.cos(xs[i]));
                int[] count = counts.computeIfAbsent(in.entry + " " + in.fn, k -> new int[COUNTERS]);
                count[0]++;
                count[1] += differ(c, s);
                count[2] += differ(w, s);
                count[3] += differ(c, w);
                rows.add("{\"id\": " + str(in.id()) + ", \"group\": " + str(G_MATH) + ", \"entry\": " + str(in.entry) + ", \"fn\": "
                        + str(in.fn) + ", \"x\": " + str(in.xHex) + ", \"cold\": " + str(c) + ", \"warm\": " + str(w)
                        + ", \"strict\": " + str(s) + "}");
            }
            counts.forEach((k, c) -> NOTES.add("math " + k + ": " + c[0] + " inputs, cold != strict " + c[1] + ", warm != strict "
                    + c[2] + ", cold != warm " + c[3]));
            return rows;
        }
    }

    static final int COUNTERS = 4;

    static int differ(String a, String b) {
        return a.equals(b) ? 0 : 1;
    }

    static boolean sameBits(double[] a, double[] b) {
        for (int i = 0; i < a.length; i++) {
            if (Double.doubleToLongBits(a[i]) != Double.doubleToLongBits(b[i])) {
                return false;
            }
        }
        return true;
    }

    // ------------------------------------------------------------------------------------------------------------
    // layout rows

    /** ElkOracle.registerMetaDataProviders (ElkOracle.java:216-231): the registry decides the option keys the exporter writes. */
    static void registerMetaDataProviders() {
        LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(new ILayoutMetaDataProvider[] {
            new CoreOptions(), new PolyominoOptions(), new DisCoMetaDataProvider(), new ForceMetaDataProvider(),
            new LayeredMetaDataProvider(), new MrTreeMetaDataProvider(), new RadialMetaDataProvider(),
            new RectPackingMetaDataProvider(), new SporeMetaDataProvider(), new StressMetaDataProvider(),
            new TopdownpackingMetaDataProvider(), new VertiFlexMetaDataProvider() });
    }

    /** ElkModelReader.readElkt (ElkModelReader.java:52-70), after ElkGraphStandaloneSetup.doSetup(). */
    static ElkNode readElkt(Path input) throws IOException {
        Resource resource = new ResourceSetImpl().getResource(URI.createFileURI(input.toAbsolutePath().toString()), true);
        need(resource.getErrors().isEmpty(), "errors in " + input);
        resource.load(Collections.emptyMap());
        EObject root = resource.getContents().isEmpty() ? null : resource.getContents().get(0);
        need(root instanceof ElkNode, "no ElkNode root in " + input);
        return (ElkNode) root;
    }

    /** GraphOverlay.retarget (GraphOverlay.java:73-96): the seed on the root, the algorithm on every node with children. */
    static void retarget(ElkNode root, String algorithm) {
        need(LayoutMetaDataService.getInstance().getAlgorithmData(algorithm) != null, "unknown algorithm " + algorithm);
        root.setProperty(CoreOptions.RANDOM_SEED, RANDOM_SEED);
        List<ElkNode> nodes = new ArrayList<>();
        nodes.add(root);
        TreeIterator<EObject> all = root.eAllContents();
        while (all.hasNext()) {
            if (all.next() instanceof ElkNode node) {
                nodes.add(node);
            }
        }
        for (ElkNode node : nodes) {
            if (!node.getChildren().isEmpty()) {
                node.setProperty(CoreOptions.ALGORITHM, algorithm);
            }
        }
    }

    /** CaseRunner.run for a layout case (CaseRunner.java:46-60) and CaseRunner.export, on one line. */
    static String layoutOnce(Path input, String algorithm) throws IOException {
        ElkNode graph = readElkt(input);
        retarget(graph, algorithm);
        new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor());
        return ElkGraphJson.forGraph(graph).omitLayout(false).omitZeroDimension(false).omitZeroPositions(false)
                .omitUnknownLayoutOptions(true).prettyPrint(false).toJson();
    }

    static String childAreaHeight(String export) {
        JsonObject options = JsonParser.parseString(export).getAsJsonObject().getAsJsonObject("layoutOptions");
        need(options != null && options.has(CHILD_AREA_HEIGHT), "the export has no layoutOptions." + CHILD_AREA_HEIGHT);
        return options.get(CHILD_AREA_HEIGHT).getAsString();
    }

    static String layoutRow(String run, String export, boolean runsAgree) {
        need(!export.contains("\n"), "the export is not one line");
        return "{\"id\": " + str(G_LAYOUT + "/" + E1 + "/" + run) + ", \"group\": " + str(G_LAYOUT) + ", \"entry\": " + str(E1)
                + ", \"run\": " + str(run) + ", \"caseId\": " + str(E1_CASE) + ", \"algorithm\": " + str(E1_ALGORITHM)
                + ", \"input\": " + str(E1_INPUT) + ", \"" + CHILD_AREA_HEIGHT + "\": " + str(childAreaHeight(export))
                + ", \"runsAgree\": " + runsAgree + ", \"output\": " + export + "}";
    }

    /** The cold layout, LAYOUT_WARMUPS further layouts and the warm one. */
    static List<String> layoutRows() throws IOException {
        Path input = repo.resolve(E1_INPUT);
        String cold = layoutOnce(input, E1_ALGORITHM);
        int differing = 0;
        int lastChange = 0;
        String previous = cold;
        for (int i = 1; i <= LAYOUT_WARMUPS; i++) {
            String export = layoutOnce(input, E1_ALGORITHM);
            differing += export.equals(cold) ? 0 : 1;
            if (!export.equals(previous)) {
                lastChange = i;
            }
            previous = export;
        }
        String warm = layoutOnce(input, E1_ALGORITHM);
        need(warm.equals(previous) && lastChange <= LAYOUT_WARMUPS - STABLE_LAYOUTS,
                "the layout still changed at warm-up " + lastChange);
        boolean runsAgree = cold.equals(warm);
        NOTES.add("layout " + E1 + ": cold " + CHILD_AREA_HEIGHT + " " + childAreaHeight(cold) + ", warm " + childAreaHeight(warm)
                + ", runsAgree " + runsAgree + ", " + LAYOUT_WARMUPS + " warm-ups of which " + differing
                + " differ from cold, last change at warm-up " + lastChange);
        return List.of(layoutRow(RUN_COLD, cold, runsAgree), layoutRow(RUN_WARM, warm, runsAgree));
    }

    // ------------------------------------------------------------------------------------------------------------
    // file

    /** Every "<sha256>  repo:<path>" line of this program's header must match the file on disk (the script checks it too). */
    static void verifyTable() throws Exception {
        String src = Files.readString(repo.resolve(PROGRAM), StandardCharsets.UTF_8);
        for (String line : src.split("\n")) {
            String t = line.trim();
            if (t.startsWith("//   ") && t.contains("  repo:")) {
                String[] p = t.substring(2).trim().split("\\s+");
                String path = p[1].substring("repo:".length());
                String actual = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(repo.resolve(path))));
                need(actual.equals(p[0]), "file changed: " + path);
            }
        }
    }

    static String file(List<String> math, List<String> layout) {
        StringBuilder out = new StringBuilder("{\n  \"jdk\": ").append(str(System.getProperty("java.version")));
        out.append(",\n  \"arch\": ").append(str(System.getProperty("os.arch")));
        out.append(",\n  \"rowCounts\": {\"").append(G_MATH).append("\": ").append(math.size());
        out.append(", \"").append(G_LAYOUT).append("\": ").append(layout.size()).append("},\n  \"rows\": [\n");
        List<String> rows = new ArrayList<>(math);
        rows.addAll(layout);
        for (int i = 0; i < rows.size(); i++) {
            out.append("    ").append(rows.get(i)).append(i + 1 < rows.size() ? ",\n" : "\n");
        }
        return out.append("  ]\n}\n").toString();
    }

    public static void main(String[] args) throws Exception {
        if (System.identityHashCode(new Object()) != System.identityHashCode(new Object())) {
            throw new IllegalStateException("run with -XX:+UnlockExperimentalVMOptions -XX:hashCode=2 "
                    + "(tools/vectors/last-ulp-vectors.sh does)");
        }
        Path vectorsDir = Path.of(args[1]).toAbsolutePath().normalize();
        repo = vectorsDir.getParent().getParent();
        // The cold math pass comes first: nothing else has called Math.sin or Math.cos through mathPass yet.
        MathRun math = new MathRun(readInputs(vectorsDir.resolve(INPUTS)));
        verifyTable();
        registerMetaDataProviders();
        System.setProperty(SEED_PROPERTY, "1");
        System.setProperty(IDENTIFIER_SEED_PROPERTY, "1");
        ElkGraphStandaloneSetup.doSetup();
        List<String> layout = layoutRows();
        String file = file(math.rows(), layout);
        NOTES.forEach(System.err::println);
        Files.createDirectories(Path.of(args[0]));
        Files.writeString(Path.of(args[0], OUTPUT), file, StandardCharsets.UTF_8);
        strictParse(Path.of(args[0], OUTPUT));
        System.err.println("strict JSON parse ok, " + OUTPUT + " bytes " + file.getBytes(StandardCharsets.UTF_8).length);
    }
}
