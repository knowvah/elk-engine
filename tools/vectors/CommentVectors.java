// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, R6) for org.eclipse.elk.core.comments: what CommentAttacher does at
// the pinned ELK commit. comments/* has no Java tests and nothing in ELK calls it, so the oracle is its only spec.
// This program only CALLS ELK and records results; it embeds no ELK implementation.
// Run: tools/vectors/comment-vectors.sh <outDir>  (java -cp ... CommentVectors.java <outDir> <tools/vectors dir>)
//
// Inputs, in <vectors dir>/comment-scenarios/ (one scenario = two files with the same stem):
//   <name>.json         ELK JSON graph; comment boxes have layoutOptions {"org.eclipse.elk.commentBox": true};
//                       every node id is unique in the file; no edges.
//   <name>.config.json  the attacher configuration (vocabulary below; EVERY key is present).
//
// CONFIGURATION VOCABULARY (T19 implements exactly this):
//   includeHierarchy: bool                         -> attacher.limitToCurrentHierarchyLevel(!includeHierarchy)
//   keepHeuristicsEnabledWithExplicitAttachments: bool
//   explicit: "none" | "byLabelPrefix:<p>"         "none" = no provider installed. byLabelPrefix:<p> (recorder-
//        defined): text = text of the comment's FIRST label (null when it has no label); if text is null or does not
//        start with <p> (case-sensitive) the provider returns null; otherwise id = text.substring(len(<p>)).trim()
//        and the result is the first SIBLING (child of the comment's parent, in order) other than the comment whose
//        identifier equals id, or null when there is none. No preprocess/cleanup.
//   boundsProvider: { type: "ElkGraphBoundsProvider", cached: bool }   cached -> provider.cached(); this one
//        instance is given to attacher.withBoundsProvider and to every filter/matcher below that takes one.
//   filters: [ one of, applied via addFilter in this order
//        { type: "SizeFilter", maxArea }                         withMaximumArea
//        { type: "TextPrefixFilter", prefixes: [string], caseSensitive: bool, requiredForEligibility: bool }
//             comment text = first label text (null when no label); addPrefix each in order;
//             caseSensitive -> withCaseSensitiveMatching(); requiredForEligibility -> withPrefixMatchRequired...() ]
//   matchers: [ one of, applied via addMatcher in this order; at most one per type (the attacher keys results by
//        matcher class)
//        { type: "DistanceMatcher", maxDistance, normalization: "LINEAR"|"BINARY" }
//        { type: "AlignmentMatcher", maxOffset, normalization: "LINEAR"|"BINARY" }
//        { type: "NodeReferenceMatcher", fuzzy: bool, maxDistance }   comment text = target name = first label text
//             (null when no label); fuzzy -> withFuzzyMatching(); maxDistance -1 = unlimited (always passed) ]
//   decider: { aggregator: "max"|"min"|"avg"|"sum", lowerBoundary, included: bool }
//        AggregatedMatchDecider.withAggregator(AggregatedMatchDecider::<aggregator>)
//        .withLowerAttachmentBoundary(lowerBoundary).withLowerBoundaryIncluded(included)
// The attacher runs as attachComments(new ElkGraphDataProvider(root).cached()) (that is the only data provider).
//
// R6 tie rule: CommentAttacher and AggregatedMatchDecider iterate identity-hashed HashMaps, so a decision with two
// equal best aggregates depends on JVM identity hashes. Every scenario must be tie-free: the decider is wrapped to
// record, for each decision that attaches (best aggregate passes the boundary), best minus second best aggregate
// (best itself when there is one candidate); minMargin = the minimum over the scenario's decisions, rounded to 6
// decimals. A scenario fails when minMargin < MIN_MARGIN or when no decision attached. Each scenario runs twice on
// freshly imported graphs; differing results fail the recording.
//
// Output <outDir>/comments.json (2-space top level, one compact JSON row per scenario line, trailing newline):
//   { jdk, oracle, scenarios: [ { name, input: "comment-scenarios/<name>.json", config: <config file, verbatim
//       key order>, attachments: [[commentId, targetId], ...] sorted by (commentId, targetId) in String order,
//       minMargin } ] }
// Scenarios are ordered by name (byte order of the stems).
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.function.Function;
import java.util.function.ToDoubleFunction;
import org.eclipse.elk.core.comments.*;
import org.eclipse.elk.core.comments.AbstractNormalizedMatcher.NormalizationFunction;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.graph.ElkEdge;
import org.eclipse.elk.graph.ElkLabel;
import org.eclipse.elk.graph.ElkNode;
import org.eclipse.elk.graph.json.ElkGraphJson;

public class CommentVectors {
    private static final String ELK_COMMIT = "8aaa3c145c2a18a38aabbc725aa3791ddc517a76";
    private static final String SCENARIO_DIR = "comment-scenarios";
    private static final String CONFIG_SUFFIX = ".config.json";
    private static final String GRAPH_SUFFIX = ".json";
    private static final String OUTPUT = "comments.json";
    private static final String EXPLICIT_PREFIX = "byLabelPrefix:";
    private static final String TYPE = "type";
    private static final double MIN_MARGIN = 0.05;
    private static final double MARGIN_SCALE = 1e6;

    /** The attachments read back from the graph, and the smallest best-vs-second margin of an attaching decision. */
    record Outcome(List<List<String>> attachments, double minMargin) { }

    public static void main(String[] args) throws IOException {
        LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        Path scenarios = Path.of(args[1], SCENARIO_DIR);
        List<String> names = new ArrayList<>();
        try (var files = Files.list(scenarios)) {
            files.map(p -> p.getFileName().toString()).filter(n -> n.endsWith(CONFIG_SUFFIX))
                .forEach(n -> names.add(n.substring(0, n.length() - CONFIG_SUFFIX.length())));
        }
        Collections.sort(names);
        StringBuilder out = new StringBuilder("{\n");
        out.append("  \"jdk\": ");
        string(out, System.getProperty("java.version"));
        out.append(",\n  \"oracle\": \"").append(ELK_COMMIT).append("\",\n  \"scenarios\": [\n");
        for (int i = 0; i < names.size(); i++) {
            out.append("    ").append(scenarioRow(scenarios, names.get(i)));
            out.append(i + 1 < names.size() ? ",\n" : "\n");
        }
        out.append("  ]\n}\n");
        Files.createDirectories(Path.of(args[0]));
        Files.writeString(Path.of(args[0], OUTPUT), out, StandardCharsets.UTF_8);
    }

    private static String scenarioRow(Path dir, String name) throws IOException {
        String graphText = Files.readString(dir.resolve(name + GRAPH_SUFFIX), StandardCharsets.UTF_8);
        JsonObject config = JsonParser.parseString(
            Files.readString(dir.resolve(name + CONFIG_SUFFIX), StandardCharsets.UTF_8)).getAsJsonObject();
        Outcome first = run(graphText, config);
        Outcome second = run(graphText, config);
        if (!first.equals(second)) {
            throw new IllegalStateException(name + ": two runs differ (identity-order tie?): " + first + " vs " + second);
        }
        if (first.minMargin() < MIN_MARGIN) {
            throw new IllegalStateException(name + ": minMargin " + first.minMargin() + " < " + MIN_MARGIN);
        }
        System.err.println(name + ": " + first.attachments().size() + " attachments, minMargin " + first.minMargin());
        StringBuilder row = new StringBuilder("{\"name\":");
        string(row, name);
        row.append(",\"input\":");
        string(row, SCENARIO_DIR + "/" + name + GRAPH_SUFFIX);
        row.append(",\"config\":");
        json(row, config);
        row.append(",\"attachments\":[");
        for (int i = 0; i < first.attachments().size(); i++) {
            row.append(i == 0 ? "" : ",");
            string(row.append('['), first.attachments().get(i).get(0));
            string(row.append(','), first.attachments().get(i).get(1)).append(']');
        }
        row.append("],\"minMargin\":").append(first.minMargin()).append('}');
        return row.toString();
    }

    // ---- one run ----

    private static Outcome run(String graphText, JsonObject config) {
        ElkNode root = ElkGraphJson.forGraph(graphText).lenient(false).toElk();
        MarginDecider decider = new MarginDecider(config.getAsJsonObject("decider"));
        buildAttacher(config, decider).attachComments(new ElkGraphDataProvider(root).cached());
        if (decider.margins.isEmpty()) {
            throw new IllegalStateException("no decision attached a comment");
        }
        double min = Collections.min(decider.margins);
        if (min < MIN_MARGIN) {
            System.err.println("decisions (unordered aggregates per candidate): " + decider.details);
        }
        return new Outcome(readAttachments(root), Math.round(min * MARGIN_SCALE) / MARGIN_SCALE);
    }

    private static List<List<String>> readAttachments(ElkNode root) {
        List<List<String>> pairs = new ArrayList<>();
        Deque<ElkNode> todo = new ArrayDeque<>(List.of(root));
        while (!todo.isEmpty()) {
            ElkNode node = todo.poll();
            for (ElkEdge edge : node.getOutgoingEdges()) {
                pairs.add(List.of(((ElkNode) edge.getSources().get(0)).getIdentifier(),
                    ((ElkNode) edge.getTargets().get(0)).getIdentifier()));
            }
            todo.addAll(node.getChildren());
        }
        pairs.sort(Comparator.<List<String>, String>comparing(p -> p.get(0)).thenComparing(p -> p.get(1)));
        return pairs;
    }

    // ---- configuration ----

    private static CommentAttacher<ElkNode, ElkNode> buildAttacher(JsonObject config, IDecider<ElkNode> decider) {
        CommentAttacher<ElkNode, ElkNode> attacher = new CommentAttacher<>();
        attacher.limitToCurrentHierarchyLevel(!config.get("includeHierarchy").getAsBoolean());
        attacher.keepHeuristicsEnabledWithExplicitAttachments(
            config.get("keepHeuristicsEnabledWithExplicitAttachments").getAsBoolean());
        String explicit = config.get("explicit").getAsString();
        if (explicit.startsWith(EXPLICIT_PREFIX)) {
            attacher.withExplicitAttachmentProvider(explicitProvider(explicit.substring(EXPLICIT_PREFIX.length())));
        }
        IBoundsProvider<ElkNode, ElkNode> bounds = boundsProvider(config.getAsJsonObject("boundsProvider"));
        attacher.withBoundsProvider(bounds);
        for (JsonElement f : config.getAsJsonArray("filters")) {
            attacher.addFilter(filter(f.getAsJsonObject(), bounds));
        }
        for (JsonElement m : config.getAsJsonArray("matchers")) {
            attacher.addMatcher(matcher(m.getAsJsonObject(), bounds));
        }
        return attacher.withAttachmentDecider(decider);
    }

    @SuppressWarnings("unchecked")
    private static IBoundsProvider<ElkNode, ElkNode> boundsProvider(JsonObject spec) {
        if (!"ElkGraphBoundsProvider".equals(spec.get(TYPE).getAsString())) {
            throw new IllegalArgumentException("bounds provider: " + spec);
        }
        IBoundsProvider<?, ?> base = new ElkGraphBoundsProvider();
        return (IBoundsProvider<ElkNode, ElkNode>) (spec.get("cached").getAsBoolean() ? base.cached() : base);
    }

    private static String firstLabel(ElkNode node) {
        List<ElkLabel> labels = node.getLabels();
        return labels.isEmpty() ? null : labels.get(0).getText();
    }

    private static IExplicitAttachmentProvider<ElkNode, ElkNode> explicitProvider(String prefix) {
        return comment -> {
            String text = firstLabel(comment);
            if (text == null || !text.startsWith(prefix)) {
                return null;
            }
            String id = text.substring(prefix.length()).trim();
            for (ElkNode sibling : comment.getParent().getChildren()) {
                if (sibling != comment && id.equals(sibling.getIdentifier())) {
                    return sibling;
                }
            }
            return null;
        };
    }

    private static IFilter<ElkNode> filter(JsonObject spec, IBoundsProvider<ElkNode, ElkNode> bounds) {
        switch (spec.get(TYPE).getAsString()) {
            case "SizeFilter":
                return new SizeFilter<ElkNode>().withBoundsProvider(bounds)
                    .withMaximumArea(spec.get("maxArea").getAsDouble());
            case "TextPrefixFilter":
                TextPrefixFilter<ElkNode> f = new TextPrefixFilter<ElkNode>()
                    .withCommentTextProvider(CommentVectors::firstLabel);
                for (JsonElement p : spec.getAsJsonArray("prefixes")) {
                    f.addPrefix(p.getAsString());
                }
                if (spec.get("caseSensitive").getAsBoolean()) {
                    f.withCaseSensitiveMatching();
                }
                if (spec.get("requiredForEligibility").getAsBoolean()) {
                    f.withPrefixMatchRequiredForEligibility();
                }
                return f;
            default:
                throw new IllegalArgumentException("filter: " + spec);
        }
    }

    private static IMatcher<ElkNode, ElkNode> matcher(JsonObject spec, IBoundsProvider<ElkNode, ElkNode> bounds) {
        switch (spec.get(TYPE).getAsString()) {
            case "DistanceMatcher":
                return new DistanceMatcher<ElkNode, ElkNode>().withBoundsProvider(bounds)
                    .withMaximumAttachmentDistance(spec.get("maxDistance").getAsDouble())
                    .withNormalizationFunction(normalization(spec));
            case "AlignmentMatcher":
                return new AlignmentMatcher<ElkNode, ElkNode>().withBoundsProvider(bounds)
                    .withMaximumAlignmentOffset(spec.get("maxOffset").getAsDouble())
                    .withNormalizationFunction(normalization(spec));
            case "NodeReferenceMatcher":
                NodeReferenceMatcher<ElkNode, ElkNode> m = new NodeReferenceMatcher<ElkNode, ElkNode>()
                    .withBoundsProvider(bounds)
                    .withCommentTextProvider(CommentVectors::firstLabel)
                    .withTargetNameProvider(CommentVectors::firstLabel)
                    .withMaximumAttachmentDistance(spec.get("maxDistance").getAsDouble());
                return spec.get("fuzzy").getAsBoolean() ? m.withFuzzyMatching() : m;
            default:
                throw new IllegalArgumentException("matcher: " + spec);
        }
    }

    private static NormalizationFunction normalization(JsonObject spec) {
        return NormalizationFunction.valueOf(spec.get("normalization").getAsString());
    }

    /** Delegates to AggregatedMatchDecider and records best-vs-second margins of the decisions that attach. */
    static final class MarginDecider implements IDecider<ElkNode> {
        final List<Double> margins = new ArrayList<>();
        final List<String> details = new ArrayList<>();
        private final AggregatedMatchDecider<ElkNode> delegate = new AggregatedMatchDecider<>();
        private final ToDoubleFunction<Collection<Double>> aggregator;
        private final double lowerBoundary;
        private final boolean included;

        MarginDecider(JsonObject spec) {
            aggregator = switch (spec.get("aggregator").getAsString()) {
                case "max" -> AggregatedMatchDecider::max;
                case "min" -> AggregatedMatchDecider::min;
                case "avg" -> AggregatedMatchDecider::avg;
                case "sum" -> AggregatedMatchDecider::sum;
                default -> throw new IllegalArgumentException("aggregator: " + spec);
            };
            lowerBoundary = spec.get("lowerBoundary").getAsDouble();
            included = spec.get("included").getAsBoolean();
            delegate.withAggregator(aggregator).withLowerAttachmentBoundary(lowerBoundary)
                .withLowerBoundaryIncluded(included);
        }

        @Override
        public ElkNode makeAttachmentDecision(
            Map<ElkNode, Map<Class<? extends IMatcher<?, ElkNode>>, Double>> normalizedHeuristics) {
            List<Double> aggregates = new ArrayList<>();
            StringBuilder detail = new StringBuilder();
            for (var entry : normalizedHeuristics.entrySet()) {
                double aggregate = aggregator.applyAsDouble(entry.getValue().values());
                aggregates.add(aggregate);
                detail.append(entry.getKey().getIdentifier()).append('=').append(aggregate).append(' ');
            }
            details.add(detail.toString().trim());
            aggregates.sort(Comparator.reverseOrder());
            ElkNode decision = delegate.makeAttachmentDecision(normalizedHeuristics);
            if (decision != null) {
                double best = aggregates.get(0);
                margins.add(aggregates.size() > 1 ? best - aggregates.get(1) : best);
            }
            return decision;
        }
    }

    // ---- compact JSON writer ----

    private static void json(StringBuilder sb, JsonElement e) {
        if (e.isJsonObject()) {
            sb.append('{');
            boolean first = true;
            for (Map.Entry<String, JsonElement> member : e.getAsJsonObject().entrySet()) {
                sb.append(first ? "" : ",");
                first = false;
                string(sb, member.getKey()).append(':');
                json(sb, member.getValue());
            }
            sb.append('}');
        } else if (e.isJsonArray()) {
            JsonArray a = e.getAsJsonArray();
            sb.append('[');
            for (int i = 0; i < a.size(); i++) {
                sb.append(i == 0 ? "" : ",");
                json(sb, a.get(i));
            }
            sb.append(']');
        } else if (e.isJsonPrimitive() && e.getAsJsonPrimitive().isString()) {
            string(sb, e.getAsString());
        } else {
            sb.append(e.isJsonNull() ? "null" : e.getAsString());
        }
    }

    private static StringBuilder string(StringBuilder sb, String s) {
        sb.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.append('"');
    }
}
