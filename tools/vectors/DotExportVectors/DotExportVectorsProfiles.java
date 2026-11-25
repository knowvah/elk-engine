// SPDX-License-Identifier: EPL-2.0
// Helper 3 of 3 of the recorder tools/vectors/DotExportVectors.java: the profiles (property sets) and the export and transfer case tables.
// The helpers are one chain of superclasses (Dumps <- Mimic <- Profiles <- the entry class); the header of the entry
// file documents the program, its inputs and the ref.
import com.google.inject.Injector;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.function.Supplier;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.eclipse.elk.alg.graphviz.dot.GraphvizDotStandaloneSetup;
import org.eclipse.elk.alg.graphviz.dot.dot.*;
import org.eclipse.elk.alg.graphviz.dot.transform.*;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.core.options.*;
import org.eclipse.elk.graph.*;
import org.eclipse.elk.graph.properties.IProperty;
import org.eclipse.elk.graph.properties.IPropertyHolder;
import org.eclipse.elk.graph.properties.Property;
import org.eclipse.elk.graph.text.ElkGraphStandaloneSetup;
import org.eclipse.emf.common.util.Enumerator;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.EStructuralFeature;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;
import org.eclipse.xtext.resource.SaveOptions;
import org.eclipse.xtext.resource.XtextResource;
import org.eclipse.xtext.resource.XtextResourceSet;
import org.eclipse.xtext.serializer.ISerializer;

class DotExportVectorsProfiles extends DotExportVectorsMimic {
    /** One property set: the exporter class and what is set where before transform. */
    record Profile(String exporter, Map<IProperty<?>, Object> data, Map<IProperty<?>, Object> graph,
            Map<IProperty<?>, Object> edges) { }

    static Map<IProperty<?>, Object> props(Object... kv) {
        Map<IProperty<?>, Object> m = new LinkedHashMap<>();
        // Key and value alternate, so i + 1 < length is the same bound as i < length; written out so the pair access
        // below is visibly in bounds.
        for (int i = 0; i + 1 < kv.length; i += 2) {
            m.put((IProperty<?>) kv[i], kv[i + 1]);
        }
        return m;
    }

    static final Map<String, Profile> PROFILES = new LinkedHashMap<>();

    static void profile(String name, String exporter, Map<IProperty<?>, Object> data, Map<IProperty<?>, Object> graph) {
        PROFILES.put(name, new Profile(exporter, data, graph, props()));
    }

    static {
        profile("default", DOT, props(), props());
        profile("explicit-defaults", DOT, props(DotExporter.COMMAND, Command.DOT, DotExporter.USE_EDGE_IDS, false,
                DotExporter.HIERARCHY, false, DotExporter.TRANSFORM_NODE_LAYOUT, true, DotExporter.TRANSFORM_EDGE_LAYOUT,
                true, DotExporter.TRANSFORM_NODE_LABELS, true, DotExporter.ADAPT_PORT_POSITIONS, false), props());
        profile("edge-ids", DOT, props(DotExporter.USE_EDGE_IDS, true), props());
        profile("hierarchy", DOT, props(DotExporter.HIERARCHY, true), props());
        profile("hierarchy-edge-ids", DOT, props(DotExporter.HIERARCHY, true, DotExporter.USE_EDGE_IDS, true), props());
        profile("hierarchy-no-node-layout", DOT, props(DotExporter.HIERARCHY, true,
                DotExporter.TRANSFORM_NODE_LAYOUT, false), props());
        profile("no-node-layout", DOT, props(DotExporter.TRANSFORM_NODE_LAYOUT, false), props());
        profile("no-edge-layout", DOT, props(DotExporter.TRANSFORM_EDGE_LAYOUT, false), props());
        profile("no-node-labels", DOT, props(DotExporter.TRANSFORM_NODE_LABELS, false), props());
        profile("adapt-ports", DOT, props(DotExporter.USE_EDGE_IDS, true, DotExporter.ADAPT_PORT_POSITIONS, true), props());
        profile("flipped", DOT, props(DotExporter.USE_EDGE_IDS, true, DotExporter.HIERARCHY, true,
                DotExporter.TRANSFORM_NODE_LAYOUT, false, DotExporter.TRANSFORM_EDGE_LAYOUT, false,
                DotExporter.TRANSFORM_NODE_LABELS, false, DotExporter.ADAPT_PORT_POSITIONS, true), props());
        profile("command-invalid", DOT, props(DotExporter.COMMAND, Command.INVALID), props());
        profile("splines", SPLINE, props(DotExporter.USE_EDGE_IDS, true), props());
        for (Command c : Command.values()) {
            profile("layouter-" + c, MIMIC, props(DotExporter.COMMAND, c), props());
        }
        profile("layouter-dot-opts", MIMIC, props(DotExporter.COMMAND, Command.DOT), props(
                CoreOptions.DIRECTION, Direction.UP, Gv.ITERATIONS_FACTOR, 0.5,
                CoreOptions.HIERARCHY_HANDLING, HierarchyHandling.INCLUDE_CHILDREN, CoreOptions.INTERACTIVE, true,
                CoreOptions.EDGE_ROUTING, EdgeRouting.POLYLINE, Gv.CONCENTRATE, true, CoreOptions.SPACING_NODE_NODE, -1.0,
                Gv.LAYER_SPACING_FACTOR, 2.5, Gv.ADAPT_PORT_POSITIONS, false));
        profile("layouter-dot-left", MIMIC, props(DotExporter.COMMAND, Command.DOT), props(
                CoreOptions.DIRECTION, Direction.LEFT, Gv.ITERATIONS_FACTOR, 2.0, CoreOptions.EDGE_ROUTING,
                EdgeRouting.ORTHOGONAL, CoreOptions.SPACING_NODE_NODE, 13.7));
        profile("layouter-dot-right", MIMIC, props(DotExporter.COMMAND, Command.DOT), props(
                CoreOptions.DIRECTION, Direction.RIGHT, Gv.ITERATIONS_FACTOR, 0.0,
                CoreOptions.HIERARCHY_HANDLING, HierarchyHandling.SEPARATE_CHILDREN));
        profile("layouter-dot-down", MIMIC, props(DotExporter.COMMAND, Command.DOT), props(
                CoreOptions.DIRECTION, Direction.DOWN, CoreOptions.EDGE_ROUTING, EdgeRouting.SPLINES));
        profile("layouter-neato-opts", MIMIC, props(DotExporter.COMMAND, Command.NEATO), props(
                CoreOptions.RANDOM_SEED, 0, Gv.EPSILON, 0.25, Gv.NEATO_MODEL, NeatoModel.CIRCUIT, Gv.MAXITER, 77,
                Gv.OVERLAP_MODE, OverlapMode.NONE, CoreOptions.SPACING_NODE_NODE, -5.0,
                CoreOptions.SEPARATE_CONNECTED_COMPONENTS, true, CoreOptions.HIERARCHY_HANDLING,
                HierarchyHandling.INCLUDE_CHILDREN, CoreOptions.INTERACTIVE, true));
        profile("layouter-neato-seed", MIMIC, props(DotExporter.COMMAND, Command.NEATO), props(
                CoreOptions.RANDOM_SEED, -7, Gv.EPSILON, 0.0, Gv.NEATO_MODEL, NeatoModel.SUBSET,
                Gv.OVERLAP_MODE, OverlapMode.SCALEXY, Gv.MAXITER, 0));
        profile("layouter-neato-positive-seed", MIMIC, props(DotExporter.COMMAND, Command.NEATO), props(
                CoreOptions.RANDOM_SEED, 42, Gv.NEATO_MODEL, NeatoModel.SHORTPATH));
        profile("layouter-fdp-opts", MIMIC, props(DotExporter.COMMAND, Command.FDP), props(
                Gv.MAXITER, 12, Gv.OVERLAP_MODE, OverlapMode.COMPRESS, CoreOptions.SEPARATE_CONNECTED_COMPONENTS, false,
                CoreOptions.SPACING_NODE_NODE, 33.3, Gv.CONCENTRATE, true));
        profile("layouter-twopi-opts", MIMIC, props(DotExporter.COMMAND, Command.TWOPI), props(
                CoreOptions.SPACING_NODE_NODE, -1.0, Gv.OVERLAP_MODE, OverlapMode.SCALE));
        profile("layouter-circo-opts", MIMIC, props(DotExporter.COMMAND, Command.CIRCO), props(
                CoreOptions.SPACING_NODE_NODE, -1.0, CoreOptions.SEPARATE_CONNECTED_COMPONENTS, true,
                Gv.OVERLAP_MODE, OverlapMode.NONE));
        profile("layouter-invalid-opts", MIMIC, props(DotExporter.COMMAND, Command.INVALID), props(
                CoreOptions.SPACING_NODE_NODE, -1.0, Gv.OVERLAP_MODE, OverlapMode.NONE));
        PROFILES.put("layouter-dot-labels", new Profile(MIMIC, props(DotExporter.COMMAND, Command.DOT), props(),
                props(Gv.LABEL_DISTANCE, -1.0, Gv.LABEL_ANGLE, 30.5)));
        PROFILES.put("layouter-dot-label-distance", new Profile(MIMIC, props(DotExporter.COMMAND, Command.DOT), props(),
                props(Gv.LABEL_DISTANCE, 0.0, Gv.LABEL_ANGLE, 0.1)));
    }

    /** scenario -> profiles of its export rows (scenario files without an entry fail the recording). */
    static final Map<String, List<String>> EXPORT_CASES = new LinkedHashMap<>();

    static void cases(String scenario, String... profiles) {
        EXPORT_CASES.put(scenario, List.of(profiles));
    }

    static {
        cases("edge-label-no-font-size", "default", "layouter-dot");
        cases("edge-labels", "default", "flipped", "layouter-dot", "layouter-dot-labels", "layouter-dot-label-distance",
                "layouter-neato", "layouter-circo", "layouter-twopi");
        cases("edge-labels-right", "default", "layouter-dot", "layouter-dot-labels");
        cases("edge-sections", "default", "explicit-defaults", "no-edge-layout", "hierarchy", "flipped", "edge-ids");
        cases("empty", "default", "layouter-dot");
        cases("flat-basic", "default", "explicit-defaults", "edge-ids", "flipped", "no-node-labels", "command-invalid", "splines",
                "layouter-dot", "layouter-neato", "layouter-fdp", "layouter-twopi", "layouter-circo", "layouter-invalid",
                "layouter-dot-opts", "layouter-dot-left", "layouter-dot-right", "layouter-dot-down",
                "layouter-neato-opts", "layouter-neato-seed", "layouter-neato-positive-seed", "layouter-fdp-opts",
                "layouter-twopi-opts", "layouter-circo-opts", "layouter-invalid-opts");
        cases("flat-positions", "default", "no-node-layout", "flipped", "layouter-dot", "layouter-dot-opts");
        cases("hierarchy", "default", "explicit-defaults", "hierarchy", "hierarchy-edge-ids", "hierarchy-no-node-layout", "flipped",
                "no-node-layout", "layouter-dot", "layouter-dot-opts", "layouter-dot-right", "layouter-fdp",
                "layouter-neato-opts");
        cases("hierarchy-edge-to-root", "default", "hierarchy");
        cases("hyperedge", "default");
        cases("labels-escape", "default", "no-node-labels", "layouter-dot");
        cases("many-ids", "default", "edge-ids", "hierarchy-edge-ids");
        cases("ports-sides", "default", "adapt-ports", "flipped", "layouter-dot", "layouter-neato");
        cases("self-loops", "default", "edge-ids", "layouter-dot", "layouter-neato");
        cases("size-constraints", "default", "flipped");
    }

    /** One transferLayout row: scenario, profile and the laid-out DOT file (relative to tools/vectors). */
    record Transfer(String scenario, String profile, String layout) { }

    static final List<Transfer> TRANSFERS = new ArrayList<>();

    static void fixture(String scenario, String... algorithms) {
        for (String alg : algorithms) {
            TRANSFERS.add(new Transfer(scenario, "layouter-" + alg, FIXTURES + "/" + scenario + "." + alg + ".dot"));
        }
    }

    static void layout(String scenario, String profile, String name) {
        TRANSFERS.add(new Transfer(scenario, profile, LAYOUTS + "/" + name + ".dot"));
    }

    static {
        fixture("flat-basic", "dot", "neato", "fdp", "twopi", "circo");
        fixture("ports-sides", "dot", "neato");
        fixture("hierarchy", "dot", "fdp");
        fixture("edge-labels", "dot", "circo", "twopi");
        fixture("self-loops", "dot", "neato");
        layout("flat-basic", "edge-ids", "flat-basic-full");
        layout("flat-basic", "edge-ids", "flat-basic-quirks");
        layout("flat-basic", "edge-ids", "flat-basic-nobb");
        layout("flat-basic", "default", "flat-basic-full");
        layout("flat-basic", "splines", "flat-basic-full");
        layout("edge-labels", "layouter-dot", "edge-labels-lp");
        layout("hierarchy", "hierarchy-edge-ids", "hierarchy-bb");
        layout("hierarchy", "layouter-dot", "hierarchy-bb");
        layout("ports-sides", "adapt-ports", "ports-adapt");
        layout("ports-sides", "splines", "ports-adapt");
        layout("self-loops", "edge-ids", "self-loops-splines");
        layout("hierarchy", "hierarchy-edge-ids", "err-unknown-subgraph");
        layout("flat-basic", "edge-ids", "err-comment-node");
        layout("flat-basic", "edge-ids", "err-node-is-edge");
        layout("flat-basic", "edge-ids", "err-syntax");
        layout("flat-basic", "edge-ids", "err-empty");
    }

}
