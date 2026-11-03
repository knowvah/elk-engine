// SPDX-License-Identifier: EPL-2.0
// Sweep and dump modes of the layered edge routing recorder (mission 7e, T12, R11, B6): the oracle's SHA-256 of the
// canonical routing dump at four stops of every edge-bearing level of every realworld/ptolemy model under a models dir.
// Run: tools/oracle/routing-sweep.sh (it compiles this file together with LayeredRoutingVectors.java and runs
//   java -cp <classes>:<classpath> LayeredRoutingSweep --sweep <modelsDir> <outDir>
//   java -cp <classes>:<classpath> LayeredRoutingSweep --dump <case id> <modelsDir> <outDir>).
//
// WHY A SECOND FILE (deviation from the T12 brief): LayeredRoutingVectors.java is at 2,986 of its 3,000 lines and the
// sweep needs its whole pipeline (Base, Dump, Encoder, runPipeline, Spec, Refusal, the option builders). Single-file
// launchers cannot share code (B7), so this class extends the recorder and is compiled with it (javac, one class
// loader); it inherits the recorder's package-private statics by simple name and adds only the sweep. The recorder's
// source, and with it the vector-cache salt of layered-routing-vectors.sh, is untouched.
//
// Cases (R11): for every ptolemy model, every level with edges (the recorder's levels() rule, the 7d targets()), four
// cases with the options of the recorder's rows (SEPARATE_CONNECTED_COMPONENTS=false and the router):
//   <model>/<root|target>/P4/BRANDES_KOEPF                              stop P4 (hyperedge levels are accepted now)
//   <model>/<root|target>/P5/ORTHOGONAL | P5/POLYLINE                   stop P5
//   <model>/<root|target>/FINAL_SPLINE_BENDPOINTS_CALCULATOR/SPLINES   stop FINAL_SPLINE_BENDPOINTS_CALCULATOR
// <model> is the path under the models dir without ".json" (realworld/ptolemy/...).
//
// results.jsonl, one JSON object per case (the 7d line format):
//   ok       { id, model, target, prefix, options, sha256, geometryExtras? }  sha256 of the canonical dump;
//            geometryExtras=true when the oracle's expected.geometry holds ports and labels (N3 presence rule)
//   refused  { id, status: "refused", processor }   the first prefix member outside the 7b-7e sets (R1's categories)
//   throws   { id, status: "throws", model, target, prefix, options, class, message }  prefix = the planned prefix
//            (null when the plan itself cannot be built), class = simple class name of the exception
//   timeout  { id, status: "timeout" }              the case did not finish within CASE_TIMEOUT_SECONDS
//
// Canonical form (extends 7d's PlacementSweep.placementCanonical with R3's geometry.graph, geometry.edges and
// geometry.splines, which are plain members of expected.geometry): `edges` and `changed` sorted by path, int / double
// values as the raw IEEE-754 bits in hex, enum and set classes by their last segment, object keys sorted, no whitespace.
// The geometry hex doubles are already canonical.
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.*;
import org.eclipse.elk.alg.layered.ElkLayered;
import org.eclipse.elk.alg.layered.graph.LGraph;
import org.eclipse.elk.alg.layered.graph.transform.ElkGraphTransformer;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.core.labels.LabelManagementOptions;
import org.eclipse.elk.core.options.EdgeRouting;
import org.eclipse.elk.alg.layered.options.LayeredMetaDataProvider;
import org.eclipse.elk.alg.layered.options.LayeredOptions;
import org.eclipse.elk.graph.ElkNode;
import org.eclipse.elk.graph.json.ElkGraphJson;
import org.eclipse.elk.graph.text.ElkGraphStandaloneSetup;
import org.eclipse.emf.common.util.TreeIterator;
import org.eclipse.emf.ecore.EObject;

public class LayeredRoutingSweep extends LayeredRoutingVectors {
    static final long CASE_TIMEOUT_SECONDS = 20;
    static final long CASE_STACK_BYTES = 64L * 1024 * 1024;
    static final String PTOLEMY_DIR = "realworld/ptolemy";
    static final String JSON_EXTENSION = ".json";
    static final String STATUS = "status";

    record Case(String id, String model, String target, String stop, TreeMap<String, Object> options) { }

    static ElkNode load(String text) {
        return ElkGraphJson.forGraph(text).toElk();
    }

    static List<String> modelIds(Path modelsDir) throws IOException {
        try (var files = Files.walk(modelsDir.resolve(PTOLEMY_DIR))) {
            return files.filter(p -> p.toString().endsWith(JSON_EXTENSION))
                    .map(p -> modelsDir.relativize(p).toString().replace('\\', '/'))
                    .map(s -> s.substring(0, s.length() - JSON_EXTENSION.length())).sorted().toList();
        }
    }

    /** The recorder's level rule (levels()): null (root), then every ElkNode with children and a unique id. */
    static List<String> targets(String text, String model) {
        List<String> targets = new ArrayList<>();
        targets.add(null);
        for (TreeIterator<EObject> it = load(text).eAllContents(); it.hasNext();) {
            if (it.next() instanceof ElkNode n && !n.getChildren().isEmpty()) {
                if (n.getIdentifier() == null || targets.contains(n.getIdentifier())) {
                    System.err.println("skipped level of " + model + ": node id " + n.getIdentifier()
                            + " is missing or not unique");
                } else {
                    targets.add(n.getIdentifier());
                }
            }
        }
        return targets;
    }

    static Case caseOf(String model, String target, String stop, String variant, TreeMap<String, Object> options) {
        return new Case(model + "/" + levelName(target) + "/" + stop + "/" + variant, model, target, stop, options);
    }

    static List<Case> cases(String model, String text) {
        List<Case> out = new ArrayList<>();
        for (String t : targets(text, model)) {
            Base b = new Base(new ElkGraphTransformer().importGraph(importTarget(load(text), t)));
            if (b.edges.isEmpty()) {
                System.err.println("skipped level " + model + " " + levelName(t) + " (no edges)");
                continue;
            }
            out.add(caseOf(model, t, P4S, "BRANDES_KOEPF", opts()));
            out.add(caseOf(model, t, P5S, EdgeRouting.ORTHOGONAL.name(), routing(EdgeRouting.ORTHOGONAL)));
            out.add(caseOf(model, t, P5S, EdgeRouting.POLYLINE.name(), routing(EdgeRouting.POLYLINE)));
            out.add(caseOf(model, t, FSBC, EdgeRouting.SPLINES.name(), routing(EdgeRouting.SPLINES)));
        }
        return out;
    }

    /** Runs the case's pipeline row on a thread with a big stack; null when the timeout fires. */
    static Result run(Case c, String text) throws Throwable {
        Spec s = new Spec(c.id, "models", null, () -> load(text), c.target, c.options, c.stop, null);
        java.util.concurrent.FutureTask<Result> task = new java.util.concurrent.FutureTask<>(
                () -> runPipeline(s, s.prepare().get()));
        Thread t = new Thread(null, task, "case", CASE_STACK_BYTES);
        t.setDaemon(true);
        t.start();
        try {
            return task.get(CASE_TIMEOUT_SECONDS, java.util.concurrent.TimeUnit.SECONDS);
        } catch (java.util.concurrent.TimeoutException e) {
            t.interrupt();
            return null;
        } catch (java.util.concurrent.ExecutionException e) {
            throw e.getCause();
        }
    }

    @SuppressWarnings("unchecked")
    static Map<String, Object> outcome(Case c, String text) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.id);
        try {
            Result r = run(c, text);
            if (r == null) {
                m.put(STATUS, "timeout");
                return m;
            }
            m.put("model", c.model);
            m.put("target", c.target);
            m.put("prefix", r.prefix());
            m.put("options", c.options);
            m.put("sha256", sha256Hex(canonical(routingCanonical(r.expected()))));
            if (((Map<String, Object>) r.expected().get("geometry")).containsKey("ports")) {
                m.put("geometryExtras", true);
            }
        } catch (Refusal r) {
            m.put(STATUS, "refused");
            m.put("processor", r.member);
            if (!REFUSAL_CATEGORIES.contains(r.member)) {
                System.err.println("refusal OUTSIDE R1: " + c.id + " " + r.member);
            }
        } catch (Throwable e) {
            m.put(STATUS, "throws");
            m.put("model", c.model);
            m.put("target", c.target);
            m.put("prefix", planPrefix(c, text));
            m.put("options", c.options);
            m.put("class", e.getClass().getSimpleName());
            m.put("message", String.valueOf(e.getMessage()));
        }
        return m;
    }

    /** The processors getLayoutTestConfiguration lists up to the case's stop (null when even that throws). */
    static List<Object> planPrefix(Case c, String text) {
        try {
            ElkNode target = importTarget(load(text), c.target);
            c.options.forEach((id, c4) -> setProperty(target, id, c4));
            LGraph g = new ElkGraphTransformer().importGraph(target);
            ElkLayered layered = new ElkLayered();
            var plan = layered.getLayoutTestConfiguration(layered.prepareLayoutTest(g));
            String stop = stopName(c.stop, g);
            List<Object> prefix = new ArrayList<>();
            for (var p : plan) {
                prefix.add(nameOf(p));
                if (prefix.get(prefix.size() - 1).equals(stop)) {
                    return prefix;
                }
            }
            return null;
        } catch (RuntimeException e) {
            return null;
        }
    }

    /** The canonical form documented above (7c's orderCanonical; the geometry members need no extra step). */
    @SuppressWarnings("unchecked")
    static Object routingCanonical(Map<String, Object> expected) {
        Map<String, Object> copy = new LinkedHashMap<>(expected);
        for (String key : List.of("edges", "changed")) {
            List<Object> sorted = new ArrayList<>((List<Object>) expected.get(key));
            sorted.sort(Comparator.comparing(e -> (String) ((Map<String, Object>) e).get("path")));
            copy.put(key, sorted);
        }
        return c4Free(copy);
    }

    static String lastSegment(String name) {
        return name.substring(Math.max(name.lastIndexOf('.'), name.lastIndexOf('$')) + 1);
    }

    @SuppressWarnings("unchecked")
    static Object c4Free(Object v) {
        if (v instanceof List<?> l) {
            List<Object> out = new ArrayList<>();
            l.forEach(x -> out.add(c4Free(x)));
            return out;
        }
        if (!(v instanceof Map<?, ?>)) {
            return v;
        }
        Map<String, Object> m = (Map<String, Object>) v;
        Map<String, Object> out = new LinkedHashMap<>();
        Object tag = m.get("t");
        if ("int".equals(tag) || "double".equals(tag)) {
            Object x = m.get("v");
            double d = x instanceof Number n ? n.doubleValue() : Double.parseDouble((String) x);
            out.put("t", "number");
            out.put("v", String.format("%016x", Double.doubleToRawLongBits(d)));
            return out;
        }
        m.forEach((k, x) -> out.put(k, c4Free(x)));
        if ("enum".equals(tag)) {
            out.put("c", lastSegment((String) m.get("c")));
        } else if ("set".equals(tag)) {
            out.put("c", ((List<?>) m.get("items")).isEmpty() ? null : lastSegment((String) m.get("c")));
        }
        return out;
    }

    static String sha256Hex(String s) {
        try {
            StringBuilder sb = new StringBuilder();
            for (byte b : MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8))) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    static String canonical(Object v) {
        StringBuilder sb = new StringBuilder();
        canonical(sb, v);
        return sb.toString();
    }

    static void canonical(StringBuilder sb, Object v) {
        if (v == null) {
            sb.append("null");
        } else if (v instanceof String s) {
            canonicalString(sb, s);
        } else if (v instanceof Boolean || v instanceof Integer) {
            sb.append(v);
        } else if (v instanceof Map<?, ?> m) {
            TreeMap<String, Object> sorted = new TreeMap<>();
            m.forEach((k, x) -> sorted.put((String) k, x));
            sb.append('{');
            int i = 0;
            for (Map.Entry<String, Object> e : sorted.entrySet()) {
                sb.append(i++ == 0 ? "" : ",");
                canonicalString(sb, e.getKey());
                sb.append(':');
                canonical(sb, e.getValue());
            }
            sb.append('}');
        } else if (v instanceof List<?> l) {
            sb.append('[');
            for (int i = 0; i < l.size(); i++) {
                sb.append(i == 0 ? "" : ",");
                canonical(sb, l.get(i));
            }
            sb.append(']');
        } else {
            throw new Bug("uncanonical value of class " + v.getClass().getName());
        }
    }

    /** A JSON string literal as JSON.stringify writes it (well-formed: a lone surrogate becomes \\udxxx). */
    static void canonicalString(StringBuilder sb, String s) {
        sb.append('"');
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            switch (ch) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\b' -> sb.append("\\b");
                case '\f' -> sb.append("\\f");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (ch < 0x20) {
                        sb.append(String.format("\\u%04x", (int) ch));
                    } else if (Character.isHighSurrogate(ch) && i + 1 < s.length()
                            && Character.isLowSurrogate(s.charAt(i + 1))) {
                        sb.append(ch).append(s.charAt(++i));
                    } else if (Character.isSurrogate(ch)) {
                        sb.append(String.format("\\u%04x", (int) ch));
                    } else {
                        sb.append(ch);
                    }
                }
            }
        }
        sb.append('"');
    }

    static void sweep(Path modelsDir, Path outDir) throws IOException {
        Files.createDirectories(outDir);
        Map<String, Integer> counts = new TreeMap<>();
        List<String> models = modelIds(modelsDir);
        long start = System.currentTimeMillis();
        try (var out = Files.newBufferedWriter(outDir.resolve("results.jsonl"), StandardCharsets.UTF_8)) {
            for (int i = 0; i < models.size(); i++) {
                String model = models.get(i);
                String text = Files.readString(modelsDir.resolve(model + JSON_EXTENSION), StandardCharsets.UTF_8);
                for (Case c : cases(model, text)) {
                    Map<String, Object> m = outcome(c, text);
                    counts.merge(String.valueOf(m.getOrDefault(STATUS, "ok")), 1, Integer::sum);
                    out.write(json(m));
                    out.write('\n');
                }
                out.flush();
                System.err.println("model " + (i + 1) + "/" + models.size() + " " + model + " "
                        + (System.currentTimeMillis() - start) / 1000 + " s " + counts);
            }
        }
        System.err.println("sweep done " + counts);
    }

    /** Writes the committed row format of one case: input = the model file inline. */
    static void dump(String id, Path modelsDir, Path outDir) throws Throwable {
        for (String model : modelIds(modelsDir)) {
            if (!id.startsWith(model + "/")) {
                continue;
            }
            String text = Files.readString(modelsDir.resolve(model + JSON_EXTENSION), StandardCharsets.UTF_8);
            for (Case c : cases(model, text)) {
                if (!c.id.equals(id)) {
                    continue;
                }
                Result r = run(c, text);
                if (r == null) {
                    throw new Bug("case " + id + " times out");
                }
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("id", c.id);
                row.put("group", "models");
                row.put("input", single("elk", new Raw(text)));
                row.put("target", c.target);
                row.put("options", c.options);
                row.put("steps", null);
                row.put("prefix", r.prefix());
                row.put("expected", r.expected());
                Files.createDirectories(outDir);
                Path file = outDir.resolve(id.replace('/', '_') + ".json");
                Files.writeString(file, json(row) + "\n", StandardCharsets.UTF_8);
                System.err.println("wrote " + file);
                return;
            }
        }
        throw new Bug("no sweep case has the id " + id);
    }

    public static void main(String[] args) throws Exception {
        try {
            sweepMain(args);
        } catch (Exception | Error e) {
            throw e;
        } catch (Throwable t) {
            throw new IllegalStateException(t);
        }
    }

    static void sweepMain(String[] args) throws Throwable {
        // Same set-up as the recorder's main (constant identity hash, seeded exports, Xtext standalone).
        if (System.identityHashCode(new Object()) != System.identityHashCode(new Object())) {
            throw new IllegalStateException("run with -XX:+UnlockExperimentalVMOptions -XX:hashCode=2 "
                    + "(tools/oracle/routing-sweep.sh does)");
        }
        LayoutMetaDataService svc = LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        svc.registerLayoutMetaDataProviders(new LabelManagementOptions(), new LayeredMetaDataProvider(), new LayeredOptions());
        System.setProperty(SEED_PROPERTY, "1");
        ElkGraphStandaloneSetup.doSetup();
        buildProcessorNames();
        discoverProperties();
        if (args.length == 3 && args[0].equals("--sweep")) {
            sweep(Path.of(args[1]), Path.of(args[2]));
        } else if (args.length == 4 && args[0].equals("--dump")) {
            dump(args[1], Path.of(args[2]), Path.of(args[3]));
        } else {
            throw new IllegalArgumentException(
                    "usage: --sweep <modelsDir> <outDir> | --dump <case id> <modelsDir> <outDir>");
        }
        System.exit(0);
    }
}
