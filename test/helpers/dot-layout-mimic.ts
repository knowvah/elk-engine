// SPDX-License-Identifier: EPL-2.0
// The TS twin of the recorder's LayoutMimic and Gv (tools/vectors/DotExportVectors/DotExportVectorsMimic.java): a copy
// of org.eclipse.elk.alg.graphviz.layouter.LayoutDotExporter over the port's DotExporter, with the
// GraphvizMetaDataProvider options re-declared (Graphviz.melk ids and global defaults). Test code only: a later mission
// ports LayoutDotExporter itself. It mirrors the mimic method for method (setGraphAttributes split into one method per
// block, each block's statements in the Java's order), which exercises every protected seam of DotExporter.
import type { Attribute } from '../../src/alg/graphviz/dot/dot/Attribute.js';
import { AttributeType } from '../../src/alg/graphviz/dot/dot/AttributeType.js';
import { DotFactory } from '../../src/alg/graphviz/dot/dot/DotFactory.js';
import type { GraphvizModel } from '../../src/alg/graphviz/dot/dot/GraphvizModel.js';
import type { Statement } from '../../src/alg/graphviz/dot/dot/Statement.js';
import { Attributes } from '../../src/alg/graphviz/dot/transform/Attributes.js';
import { Command } from '../../src/alg/graphviz/dot/transform/Command.js';
import { DotExporter } from '../../src/alg/graphviz/dot/transform/DotExporter.js';
import type { IDotTransformationData } from '../../src/alg/graphviz/dot/transform/IDotTransformationData.js';
import { NeatoModel } from '../../src/alg/graphviz/dot/transform/NeatoModel.js';
import { OverlapMode } from '../../src/alg/graphviz/dot/transform/OverlapMode.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { Direction } from '../../src/core/options/Direction.js';
import { EdgeLabelPlacement } from '../../src/core/options/EdgeLabelPlacement.js';
import { EdgeRouting } from '../../src/core/options/EdgeRouting.js';
import { HierarchyHandling } from '../../src/core/options/HierarchyHandling.js';
import type { EList } from '../../src/emf/common/util/EList.js';
import type { ElkEdge } from '../../src/graph/ElkEdge.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import type { IProperty } from '../../src/graph/properties/IProperty.js';
import { Property } from '../../src/graph/properties/Property.js';
import * as Float32 from '../../src/java/lang/Float32.js';
import * as Int32 from '../../src/java/lang/Int32.js';
import { d2i, round } from '../../src/java/lang/JavaMath.js';
import { unboxBoolean, unboxDouble, PROPERTY_RETURN_VALUE } from '../../src/java/lang/Unbox.js';

const P = 'org.eclipse.elk.graphviz.';

/** GraphvizMetaDataProvider's options (Graphviz.melk: idPrefix org.eclipse.elk.graphviz, global defaults). */
export const Gv = {
  ADAPT_PORT_POSITIONS: new Property<boolean>(`${P}adaptPortPositions`, true),
  CONCENTRATE: new Property<boolean>(`${P}concentrate`, false),
  EPSILON: new Property<number | null>(`${P}epsilon`),
  ITERATIONS_FACTOR: new Property<number | null>(`${P}iterationsFactor`),
  LABEL_ANGLE: new Property<number>(`${P}labelAngle`, -25.0),
  LABEL_DISTANCE: new Property<number>(`${P}labelDistance`, 1.0),
  LAYER_SPACING_FACTOR: new Property<number>(`${P}layerSpacingFactor`, 1.0),
  MAXITER: new Property<number | null>(`${P}maxiter`),
  NEATO_MODEL: new Property<NeatoModel>(`${P}neatoModel`, NeatoModel.SHORTPATH),
  OVERLAP_MODE: new Property<OverlapMode>(`${P}overlapMode`, OverlapMode.PRISM),
} as const;

/** The ids of the `Property<Double>` options of {@link Gv} (G formats their values as `Double.toString`). */
export const GV_DOUBLE_IDS: ReadonlySet<string> = new Set(
  [Gv.EPSILON, Gv.ITERATIONS_FACTOR, Gv.LABEL_ANGLE, Gv.LABEL_DISTANCE, Gv.LAYER_SPACING_FACTOR].map((p) => p.getId()),
);

/** `NSLIMIT_BASE`, a Java `float` (`100.0f`, exact as a double). */
const NSLIMIT_BASE = Float32.fromDouble(100.0);
const ELK_NODE = 'org.eclipse.elk.graph.ElkNode';
const ELK_EDGE = 'org.eclipse.elk.graph.ElkEdge';

/** The locals of LayoutDotExporter.setGraphAttributes that its blocks share (the mimic's record `Ctx`). */
interface Ctx {
  readonly command: Command;
  readonly parentNode: ElkNode;
  readonly graphAttrs: EList<Attribute>;
  readonly edgeAttrs: EList<Attribute>;
  readonly spacing: number;
  readonly transData: IDotTransformationData<ElkNode, GraphvizModel>;
}

/** `transData.setProperty` with a property of the exporter (the statics are typed as Java's boxed values). */
function set<T>(transData: IDotTransformationData<ElkNode, GraphvizModel>, key: IProperty<T>, value: T): void {
  transData.setProperty(key, value);
}

/** Copy of LayoutDotExporter (GraphvizMetaDataProvider -> Gv), as the recorder's LayoutMimic. */
export class LayoutMimic extends DotExporter {
  override transform(transData: IDotTransformationData<ElkNode, GraphvizModel>): void {
    const sourceGraph = transData.getSourceGraph() as ElkNode;
    const command = transData.getProperty(DotExporter.COMMAND);
    set(transData, DotExporter.USE_EDGE_IDS, true);
    set(
      transData,
      DotExporter.HIERARCHY,
      sourceGraph.getProperty(CoreOptions.HIERARCHY_HANDLING) === HierarchyHandling.INCLUDE_CHILDREN &&
        command === Command.DOT,
    );
    set(transData, DotExporter.TRANSFORM_NODE_LAYOUT, sourceGraph.getProperty(CoreOptions.INTERACTIVE));
    set(transData, DotExporter.TRANSFORM_EDGE_LAYOUT, false);
    set(transData, DotExporter.TRANSFORM_NODE_LABELS, false);
    set(transData, DotExporter.ADAPT_PORT_POSITIONS, sourceGraph.getProperty(Gv.ADAPT_PORT_POSITIONS));
    super.transform(transData);
  }

  protected override setGraphAttributes(
    statements: EList<Statement>,
    parentNode: ElkNode,
    transData: IDotTransformationData<ElkNode, GraphvizModel>,
  ): void {
    const command = transData.getProperty(DotExporter.COMMAND);
    const graphAttrStatement = DotFactory.eINSTANCE.createAttributeStatement();
    graphAttrStatement.setType(AttributeType.GRAPH);
    const graphAttrs = graphAttrStatement.getAttributes();
    statements.add(graphAttrStatement);

    this.setGeneralNodeAttributes(statements);
    const edgeAttrs = this.setGeneralEdgeAttributes(statements);

    let spacing: number | null = parentNode.getProperty(CoreOptions.SPACING_NODE_NODE);
    if (spacing === null || spacing < 0) {
      spacing = LayoutMimic.defaultSpacing(command);
    }
    const ctx: Ctx = { command, parentNode, graphAttrs, edgeAttrs, spacing, transData };
    this.commandAttributes(ctx);
    this.maxiter(ctx);
    if (command !== Command.DOT) {
      this.overlapAndPack(ctx);
    }
    this.routing(ctx);
    if (unboxBoolean(parentNode.getProperty(Gv.CONCENTRATE), PROPERTY_RETURN_VALUE(ELK_NODE))) {
      graphAttrs.add(DotExporter.createAttribute(Attributes.CONCENTRATE, 'true'));
    }
  }

  private static defaultSpacing(command: Command): number {
    switch (command) {
      case Command.CIRCO:
      case Command.FDP:
      case Command.NEATO:
        return DotExporter.DEF_SPACING_LARGE;
      case Command.TWOPI:
        return DotExporter.DEF_SPACING_XLARGE;
      default:
        return DotExporter.DEF_SPACING_SMALL;
    }
  }

  private commandAttributes(c: Ctx): void {
    switch (c.command) {
      case Command.DOT:
        this.dot(c);
        break;
      case Command.TWOPI:
        c.graphAttrs.add(DotExporter.createAttributeDouble(Attributes.RANKSEP, c.spacing / DotExporter.DPI));
        break;
      case Command.CIRCO:
        c.graphAttrs.add(DotExporter.createAttributeDouble(Attributes.MINDIST, c.spacing / DotExporter.DPI));
        break;
      case Command.NEATO:
        this.neato(c);
        break;
      case Command.FDP:
        c.graphAttrs.add(DotExporter.createAttributeDouble(Attributes.SPRING_CONSTANT, c.spacing / DotExporter.DPI));
        break;
      default:
        break;
    }
  }

  /** The `case DOT` block of `commandAttributes` (one more split for the function-length limit). */
  private dot(c: Ctx): void {
    c.graphAttrs.add(DotExporter.createAttributeDouble(Attributes.NODESEP, c.spacing / DotExporter.DPI));
    const rankSepFactor = unboxDouble(
      c.parentNode.getProperty(Gv.LAYER_SPACING_FACTOR),
      PROPERTY_RETURN_VALUE(ELK_NODE),
    );
    c.graphAttrs.add(
      DotExporter.createAttributeDouble(Attributes.RANKSEP, (rankSepFactor * c.spacing) / DotExporter.DPI),
    );
    this.rankdir(c);
    this.iterations(c);
    if (c.parentNode.getProperty(CoreOptions.HIERARCHY_HANDLING) === HierarchyHandling.INCLUDE_CHILDREN) {
      c.graphAttrs.add(DotExporter.createAttribute(Attributes.COMPOUND, 'true'));
    }
  }

  private rankdir(c: Ctx): void {
    switch (c.parentNode.getProperty(CoreOptions.DIRECTION)) {
      case Direction.UP:
        c.graphAttrs.add(DotExporter.createAttribute(Attributes.RANKDIR, 'BT'));
        break;
      case Direction.LEFT:
        c.graphAttrs.add(DotExporter.createAttribute(Attributes.RANKDIR, 'RL'));
        break;
      case Direction.RIGHT:
        c.graphAttrs.add(DotExporter.createAttribute(Attributes.RANKDIR, 'LR'));
        break;
      default: // DOWN
        c.graphAttrs.add(DotExporter.createAttribute(Attributes.RANKDIR, 'TB'));
    }
  }

  private iterations(c: Ctx): void {
    const iterationsFactor = c.parentNode.getProperty(Gv.ITERATIONS_FACTOR);
    if (iterationsFactor !== null && iterationsFactor > 0) {
      c.graphAttrs.add(DotExporter.createAttributeDouble(Attributes.CROSSMIN_LIMIT, iterationsFactor));
      if (iterationsFactor < 1) {
        const simplexLimit = iterationsFactor * NSLIMIT_BASE;
        c.graphAttrs.add(DotExporter.createAttributeDouble(Attributes.SIMPLEX_LIMIT, simplexLimit));
      }
    }
  }

  private neato(c: Ctx): void {
    c.edgeAttrs.add(DotExporter.createAttributeDouble(Attributes.EDGELEN, c.spacing / DotExporter.DPI));
    let seed: number | null = c.parentNode.getProperty(CoreOptions.RANDOM_SEED);
    if (seed === null) {
      seed = 1;
    } else if (seed === 0) {
      seed = -1;
    } else if (seed < 0) {
      seed = Int32.neg(seed);
    }
    c.graphAttrs.add(DotExporter.createAttribute(Attributes.START, `random${String(seed)}`));
    const epsilon = c.parentNode.getProperty(Gv.EPSILON);
    if (epsilon !== null && epsilon > 0) {
      c.graphAttrs.add(DotExporter.createAttributeDouble(Attributes.EPSILON, epsilon));
    }
    const model = c.parentNode.getProperty(Gv.NEATO_MODEL);
    if (model !== NeatoModel.SHORTPATH) {
      c.graphAttrs.add(DotExporter.createAttribute(Attributes.NEATO_MODEL, model.literal()));
    }
  }

  private maxiter(c: Ctx): void {
    if (c.command === Command.NEATO || c.command === Command.FDP) {
      const maxiter = c.parentNode.getProperty(Gv.MAXITER);
      if (maxiter !== null && maxiter > 0) {
        c.graphAttrs.add(DotExporter.createAttributeInt(Attributes.MAXITER, maxiter));
      }
    }
  }

  private overlapAndPack(c: Ctx): void {
    const mode = c.parentNode.getProperty(Gv.OVERLAP_MODE);
    if (mode !== OverlapMode.NONE) {
      c.graphAttrs.add(DotExporter.createAttribute(Attributes.OVERLAP, mode.literal()));
      c.graphAttrs.add(DotExporter.createAttribute(Attributes.SEP, `"+${String(round(c.spacing / 2))}"`));
    }
    const pack: boolean | null = c.parentNode.getProperty(CoreOptions.SEPARATE_CONNECTED_COMPONENTS);
    if (c.command === Command.TWOPI || (pack !== null && pack)) {
      c.graphAttrs.add(DotExporter.createAttributeInt(Attributes.PACK, d2i(c.spacing)));
    }
  }

  private routing(c: Ctx): void {
    const edgeRouting = c.parentNode.getProperty(CoreOptions.EDGE_ROUTING);
    let splineMode: string;
    switch (edgeRouting) {
      case EdgeRouting.POLYLINE:
        splineMode = 'polyline';
        break;
      case EdgeRouting.ORTHOGONAL:
        splineMode = 'ortho';
        break;
      default:
        splineMode = 'spline';
        set(c.transData, LayoutMimic.useSplines(), true);
    }
    c.graphAttrs.add(DotExporter.createAttribute(Attributes.SPLINES, splineMode));
  }

  /** The protected static `USE_SPLINES`, reached from the subclass as Java's subclass reaches it. */
  private static useSplines(): IProperty<boolean> {
    return DotExporter.USE_SPLINES;
  }

  protected override setEdgeLabels(kedge: ElkEdge, attributes: EList<Attribute>, isVertical: boolean): void {
    super.setEdgeLabels(kedge, attributes, isVertical);
    if (
      [...kedge.getLabels()].some((label) => {
        const elp = label.getProperty(CoreOptions.EDGE_LABELS_PLACEMENT);
        return elp === EdgeLabelPlacement.HEAD || elp === EdgeLabelPlacement.TAIL;
      })
    ) {
      const distance = unboxDouble(kedge.getProperty(Gv.LABEL_DISTANCE), PROPERTY_RETURN_VALUE(ELK_EDGE));
      if (distance >= 0.0) {
        attributes.add(DotExporter.createAttributeDouble(Attributes.LABELDISTANCE, distance));
      }
      const angle = unboxDouble(kedge.getProperty(Gv.LABEL_ANGLE), PROPERTY_RETURN_VALUE(ELK_EDGE));
      attributes.add(DotExporter.createAttributeDouble(Attributes.LABELANGLE, angle));
    }
  }
}
