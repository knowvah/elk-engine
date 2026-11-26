// SPDX-License-Identifier: EPL-2.0
// Helper 2 of 3 of the recorder tools/vectors/DotExportVectors.java: SplineExporter, Gv and LayoutMimic (the verbatim LayoutDotExporter).
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

class DotExportVectorsMimic extends DotExportVectorsDumps {
    /** DotExporter with the protected USE_SPLINES set, as LayoutDotExporter.setGraphAttributes does for spline routing. */
    static final class SplineExporter extends DotExporter {
        @Override
        public void transform(IDotTransformationData<ElkNode, GraphvizModel> transData) {
            transData.setProperty(USE_SPLINES, true);
            super.transform(transData);
        }
    }

    /** GraphvizMetaDataProvider's options (Graphviz.melk: idPrefix org.eclipse.elk.graphviz, global defaults). */
    static final class Gv {
        static final String P = "org.eclipse.elk.graphviz.";
        static final IProperty<Boolean> ADAPT_PORT_POSITIONS = new Property<>(P + "adaptPortPositions", true);
        static final IProperty<Boolean> CONCENTRATE = new Property<>(P + "concentrate", false);
        static final IProperty<Double> EPSILON = new Property<>(P + "epsilon");
        static final IProperty<Double> ITERATIONS_FACTOR = new Property<>(P + "iterationsFactor");
        static final IProperty<Double> LABEL_ANGLE = new Property<>(P + "labelAngle", -25.0);
        static final IProperty<Double> LABEL_DISTANCE = new Property<>(P + "labelDistance", 1.0);
        static final IProperty<Double> LAYER_SPACING_FACTOR = new Property<>(P + "layerSpacingFactor", 1.0);
        static final IProperty<Integer> MAXITER = new Property<>(P + "maxiter");
        static final IProperty<NeatoModel> NEATO_MODEL = new Property<>(P + "neatoModel", NeatoModel.SHORTPATH);
        static final IProperty<OverlapMode> OVERLAP_MODE = new Property<>(P + "overlapMode", OverlapMode.PRISM);
    }

    /**
     * Copy of org.eclipse.elk.alg.graphviz.layouter.LayoutDotExporter (GraphvizMetaDataProvider -> Gv). transform and
     * setEdgeLabels are verbatim; setGraphAttributes is split into one method per block (rankdir, iterations, start
     * seed, maxiter, overlap/pack, routing) for the method-length limit, each block's statements in the Java's order.
     */
    static final class LayoutMimic extends DotExporter {
        @Override
        public void transform(final IDotTransformationData<ElkNode, GraphvizModel> transData) {
            ElkNode sourceGraph = transData.getSourceGraph();
            Command command = transData.getProperty(COMMAND);
            transData.setProperty(USE_EDGE_IDS, true);
            transData.setProperty(HIERARCHY,
                    sourceGraph.getProperty(CoreOptions.HIERARCHY_HANDLING) == HierarchyHandling.INCLUDE_CHILDREN
                            && command == Command.DOT);
            transData.setProperty(TRANSFORM_NODE_LAYOUT, sourceGraph.getProperty(CoreOptions.INTERACTIVE));
            transData.setProperty(TRANSFORM_EDGE_LAYOUT, false);
            transData.setProperty(TRANSFORM_NODE_LABELS, false);
            transData.setProperty(ADAPT_PORT_POSITIONS, sourceGraph.getProperty(Gv.ADAPT_PORT_POSITIONS));
            super.transform(transData);
        }

        private static final float NSLIMIT_BASE = 100.0f;

        /** The locals of LayoutDotExporter.setGraphAttributes that its blocks share. */
        private record Ctx(Command command, ElkNode parentNode, List<Attribute> graphAttrs, List<Attribute> edgeAttrs,
                Double spacing, IDotTransformationData<ElkNode, GraphvizModel> transData) { }

        @Override
        protected void setGraphAttributes(final List<Statement> statements, final ElkNode parentNode,
                final IDotTransformationData<ElkNode, GraphvizModel> transData) {
            Command command = transData.getProperty(COMMAND);
            AttributeStatement graphAttrStatement = DotFactory.eINSTANCE.createAttributeStatement();
            graphAttrStatement.setType(AttributeType.GRAPH);
            List<Attribute> graphAttrs = graphAttrStatement.getAttributes();
            statements.add(graphAttrStatement);

            setGeneralNodeAttributes(statements);
            List<Attribute> edgeAttrs = setGeneralEdgeAttributes(statements);

            Double spacing = parentNode.getProperty(CoreOptions.SPACING_NODE_NODE);
            if (spacing == null || spacing < 0) {
                spacing = defaultSpacing(command);
            }
            Ctx ctx = new Ctx(command, parentNode, graphAttrs, edgeAttrs, spacing, transData);
            commandAttributes(ctx);
            maxiter(ctx);
            if (command != Command.DOT) {
                overlapAndPack(ctx);
            }
            routing(ctx);
            if (parentNode.getProperty(Gv.CONCENTRATE)) {
                graphAttrs.add(createAttribute(Attributes.CONCENTRATE, "true"));
            }
        }

        private static double defaultSpacing(final Command command) {
            switch (command) {
            case CIRCO:
            case FDP:
            case NEATO:
                return DEF_SPACING_LARGE;
            case TWOPI:
                return DEF_SPACING_XLARGE;
            default:
                return DEF_SPACING_SMALL;
            }
        }

        private void commandAttributes(final Ctx c) {
            switch (c.command()) {
            case DOT:
                c.graphAttrs().add(createAttribute(Attributes.NODESEP, c.spacing() / DPI));
                double rankSepFactor = c.parentNode().getProperty(Gv.LAYER_SPACING_FACTOR);
                c.graphAttrs().add(createAttribute(Attributes.RANKSEP, rankSepFactor * c.spacing() / DPI));
                rankdir(c);
                iterations(c);
                if (c.parentNode().getProperty(CoreOptions.HIERARCHY_HANDLING) == HierarchyHandling.INCLUDE_CHILDREN) {
                    c.graphAttrs().add(createAttribute(Attributes.COMPOUND, "true"));
                }
                break;
            case TWOPI:
                c.graphAttrs().add(createAttribute(Attributes.RANKSEP, c.spacing() / DPI));
                break;
            case CIRCO:
                c.graphAttrs().add(createAttribute(Attributes.MINDIST, c.spacing() / DPI));
                break;
            case NEATO:
                neato(c);
                break;
            case FDP:
                c.graphAttrs().add(createAttribute(Attributes.SPRING_CONSTANT, c.spacing() / DPI));
                break;
            default:
                break;
            }
        }

        private void rankdir(final Ctx c) {
            switch (c.parentNode().getProperty(CoreOptions.DIRECTION)) {
            case UP:
                c.graphAttrs().add(createAttribute(Attributes.RANKDIR, "BT"));
                break;
            case LEFT:
                c.graphAttrs().add(createAttribute(Attributes.RANKDIR, "RL"));
                break;
            case RIGHT:
                c.graphAttrs().add(createAttribute(Attributes.RANKDIR, "LR"));
                break;
            default: // DOWN
                c.graphAttrs().add(createAttribute(Attributes.RANKDIR, "TB"));
            }
        }

        private void iterations(final Ctx c) {
            Double iterationsFactor = c.parentNode().getProperty(Gv.ITERATIONS_FACTOR);
            if (iterationsFactor != null && iterationsFactor > 0) {
                c.graphAttrs().add(createAttribute(Attributes.CROSSMIN_LIMIT, iterationsFactor));
                if (iterationsFactor < 1) {
                    double simplexLimit = iterationsFactor * NSLIMIT_BASE;
                    c.graphAttrs().add(createAttribute(Attributes.SIMPLEX_LIMIT, simplexLimit));
                }
            }
        }

        private void neato(final Ctx c) {
            c.edgeAttrs().add(createAttribute(Attributes.EDGELEN, c.spacing() / DPI));
            Integer seed = c.parentNode().getProperty(CoreOptions.RANDOM_SEED);
            if (seed == null) {
                seed = 1;
            } else if (seed == 0) {
                seed = -1;
            } else if (seed < 0) {
                seed = -seed;
            }
            c.graphAttrs().add(createAttribute(Attributes.START, "random" + seed));
            Double epsilon = c.parentNode().getProperty(Gv.EPSILON);
            if (epsilon != null && epsilon > 0) {
                c.graphAttrs().add(createAttribute(Attributes.EPSILON, epsilon));
            }
            NeatoModel model = c.parentNode().getProperty(Gv.NEATO_MODEL);
            if (model != NeatoModel.SHORTPATH) {
                c.graphAttrs().add(createAttribute(Attributes.NEATO_MODEL, model.literal()));
            }
        }

        private void maxiter(final Ctx c) {
            if (c.command() == Command.NEATO || c.command() == Command.FDP) {
                Integer maxiter = c.parentNode().getProperty(Gv.MAXITER);
                if (maxiter != null && maxiter > 0) {
                    c.graphAttrs().add(createAttribute(Attributes.MAXITER, maxiter));
                }
            }
        }

        private void overlapAndPack(final Ctx c) {
            OverlapMode mode = c.parentNode().getProperty(Gv.OVERLAP_MODE);
            if (mode != OverlapMode.NONE) {
                c.graphAttrs().add(createAttribute(Attributes.OVERLAP, mode.literal()));
                c.graphAttrs().add(createAttribute(Attributes.SEP, "\"+" + Math.round(c.spacing() / 2) + "\""));
            }
            Boolean pack = c.parentNode().getProperty(CoreOptions.SEPARATE_CONNECTED_COMPONENTS);
            if (c.command() == Command.TWOPI || pack != null && pack.booleanValue()) {
                c.graphAttrs().add(createAttribute(Attributes.PACK, c.spacing().intValue()));
            }
        }

        private void routing(final Ctx c) {
            EdgeRouting edgeRouting = c.parentNode().getProperty(CoreOptions.EDGE_ROUTING);
            String splineMode;
            switch (edgeRouting) {
            case POLYLINE:
                splineMode = "polyline";
                break;
            case ORTHOGONAL:
                splineMode = "ortho";
                break;
            default:
                splineMode = "spline";
                c.transData().setProperty(USE_SPLINES, true);
            }
            c.graphAttrs().add(createAttribute(Attributes.SPLINES, splineMode));
        }

        @Override
        protected void setEdgeLabels(final ElkEdge kedge, final List<Attribute> attributes, final boolean isVertical) {
            super.setEdgeLabels(kedge, attributes, isVertical);
            if (kedge.getLabels().stream().anyMatch((ElkLabel label) -> {
                EdgeLabelPlacement elp = label.getProperty(CoreOptions.EDGE_LABELS_PLACEMENT);
                return elp == EdgeLabelPlacement.HEAD || elp == EdgeLabelPlacement.TAIL;
            })) {
                double distance = kedge.getProperty(Gv.LABEL_DISTANCE);
                if (distance >= 0.0) {
                    attributes.add(createAttribute(Attributes.LABELDISTANCE, distance));
                }
                double angle = kedge.getProperty(Gv.LABEL_ANGLE);
                attributes.add(createAttribute(Attributes.LABELANGLE, angle));
            }
        }
    }
}
