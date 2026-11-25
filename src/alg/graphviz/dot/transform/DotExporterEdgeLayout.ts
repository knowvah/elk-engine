// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../../core/math/KVector.js';
import { KVectorChain } from '../../../../core/math/KVectorChain.js';
import { CoreOptions } from '../../../../core/options/CoreOptions.js';
import { EdgeLabelPlacement } from '../../../../core/options/EdgeLabelPlacement.js';
import { EdgeRouting } from '../../../../core/options/EdgeRouting.js';
import { ElkUtil } from '../../../../core/util/ElkUtil.js';
import { Pair } from '../../../../core/util/Pair.js';
import type { EList } from '../../../../emf/common/util/EList.js';
import { type ElkEdge, isElkEdge } from '../../../../graph/ElkEdge.js';
import type { ElkEdgeSection } from '../../../../graph/ElkEdgeSection.js';
import type { ElkGraphElement } from '../../../../graph/ElkGraphElement.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import { isElkPort } from '../../../../graph/ElkPort.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import type { BiMap } from '../../../../guava/HashBiMap.js';
import * as Float32 from '../../../../java/lang/Float32.js';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import { checkCast } from '../../../../java/lang/JavaCast.js';
import { StringTokenizer } from '../../../../java/util/StringTokenizer.js';
import type { Attribute } from '../dot/Attribute.js';
import type { EdgeStatement } from '../dot/EdgeStatement.js';
import type { GraphvizModel } from '../dot/GraphvizModel.js';
import { Attributes } from './Attributes.js';
import { ADAPT_PORT_POSITIONS, GRAPH_ELEMS, USE_SPLINES } from './DotExporterProperties.js';
import type { IDotTransformationData } from './IDotTransformationData.js';

/**
 * The private edge layout transfer methods of `DotExporter` (`applyEdgeLayout`, `applyEdgeLabelPos`,
 * `createAttributeMap`, `parseSplinePoints`), split off `DotExporter.ts` for the 500-line limit (the node part is
 * `DotExporterTransfer.ts`). None calls an overridable method; `DotExporter.transferLayout` calls `applyEdgeLayout`.
 * Methods over the function limits are split into helpers named after them, statement order kept.
 *
 * Java's cast `(ElkEdge)` of a `GRAPH_ELEMS` value is a checked cast (a `comment` naming a node throws
 * `ClassCastException`).
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotExporter.java
 */

type TransData = IDotTransformationData<ElkNode, GraphvizModel>;

const ELK_EDGE_CLASS = 'org.eclipse.elk.graph.ElkEdge';

/** The end points `parseSplinePoints` collects. */
interface SplineEnds {
  sourcePoint: KVector | null;
  targetPoint: KVector | null;
}

/** `attributeMap.get(name)`: `HashMap.get` gives `null` for a missing name. */
function attributeOf(attributeMap: ReadonlyMap<string | null, string | null>, name: string): string | null {
  return attributeMap.get(name) ?? null;
}

/** `(ElkEdge) transData.getProperty(GRAPH_ELEMS).get(comment)`: Guava's `BiMap.get` gives `null` for a missing key. */
function elkEdgeOf(transData: TransData, comment: string | null): ElkEdge | null {
  const graphElems = transData.getProperty(GRAPH_ELEMS) as BiMap<string | null, ElkGraphElement>;
  return checkCast(graphElems.get(comment) ?? null, isElkEdge, ELK_EDGE_CLASS);
}

/** The bend point loop of `applyEdgeLayout`: every remaining control point of every spline. */
function applyEdgeLayoutBendPoints(edgeSection: ElkEdgeSection, splines: KVectorChain[]): void {
  for (const points of splines) {
    for (const point of points) {
      ElkGraphUtil.createBendPoint(edgeSection, point.x, point.y);
    }
  }
}

/**
 * Sets the bend points of an edge.
 *
 * @param edgeStatement an edge statement
 * @param edgeOffset offset to be added to edge coordinates
 * @param transData transformation data
 */
export function applyEdgeLayout(edgeStatement: EdgeStatement, edgeOffset: KVector, transData: TransData): void {
  const attributeMap = createAttributeMap(edgeStatement.getAttributes());
  const elkedge = elkEdgeOf(transData, attributeOf(attributeMap, Attributes.COMMENT));
  if (elkedge === null) {
    return;
  }

  const edgeSection = ElkGraphUtil.firstEdgeSection(elkedge, true, true);
  let posString = attributeOf(attributeMap, Attributes.POS);
  if (posString === null) {
    posString = '';
  }

  let referenceNode = elkedge.getContainingNode();
  const reference = new KVector();
  while (referenceNode !== null && referenceNode !== transData.getSourceGraph()) {
    // Note: do _not_ apply padding here,
    // it is already included in the the 'edgeOffset'
    reference.x += referenceNode.getX();
    reference.y += referenceNode.getY();
    referenceNode = referenceNode.getParent();
  }
  const offset = edgeOffset.clone().sub(reference);

  // parse the list of spline control coordinates
  const splines: KVectorChain[] = [];
  const endpoints = parseSplinePoints(posString, splines, offset);
  applyEdgeLayoutSplines(elkedge, edgeSection, splines, endpoints, transData);
  applyEdgeLayoutLabels(elkedge, attributeMap, offset, transData);
}

/** The `if (!splines.isEmpty())` block of `applyEdgeLayout`: end points, bend points, then the port positions. */
function applyEdgeLayoutSplines(
  elkedge: ElkEdge,
  edgeSection: ElkEdgeSection,
  splines: KVectorChain[],
  endpoints: Pair<KVector, KVector>,
  transData: TransData,
): void {
  if (splines.length === 0) {
    return;
  }
  // the first point in the list is the start point, if no arrowhead is given
  const sourcePoint = endpoints.getFirst() ?? applyEdgeLayoutSourcePoint(elkedge, splines);
  // the last point in the list is the end point, if no arrowhead is given
  const targetPoint = endpoints.getSecond() ?? applyEdgeLayoutTargetPoint(elkedge, splines);

  // add all other control points to the edge
  applyEdgeLayoutBendPoints(edgeSection, splines);
  edgeSection.setStartLocation(sourcePoint.x, sourcePoint.y);
  edgeSection.setEndLocation(targetPoint.x, targetPoint.y);

  // set source and target port positions accordingly
  const adaptPortPositions = transData.getProperty(ADAPT_PORT_POSITIONS);
  if (adaptPortPositions && (isElkPort(elkedge.getSources().get(0)) || isElkPort(elkedge.getTargets().get(0)))) {
    applyEdgeLayoutPorts(elkedge, sourcePoint, targetPoint);
  }
}

/** The `sourcePoint == null` branch of `applyEdgeLayout`: the first point of the first spline, or the node centre. */
function applyEdgeLayoutSourcePoint(elkedge: ElkEdge, splines: KVectorChain[]): KVector {
  const points = splines[0] as KVectorChain;
  if (!points.isEmpty()) {
    return points.removeAt(0);
  }
  const sourceNode = ElkGraphUtil.connectableShapeToNode(elkedge.getSources().get(0)) as ElkNode;
  const sourcePoint = new KVector();
  sourcePoint.x = sourceNode.getX() + sourceNode.getWidth() / 2;
  sourcePoint.y = sourceNode.getY() + sourceNode.getHeight() / 2;
  return sourcePoint;
}

/** The `targetPoint == null` branch of `applyEdgeLayout`: the last point of the last spline, or the node centre. */
function applyEdgeLayoutTargetPoint(elkedge: ElkEdge, splines: KVectorChain[]): KVector {
  const points = splines[splines.length - 1] as KVectorChain;
  if (!points.isEmpty()) {
    return points.removeAt(points.size() - 1);
  }
  const targetNode = ElkGraphUtil.connectableShapeToNode(elkedge.getTargets().get(0)) as ElkNode;
  const targetPoint = new KVector();
  targetPoint.x = targetNode.getX() + targetNode.getWidth() / 2;
  targetPoint.y = targetNode.getY() + targetNode.getHeight() / 2;
  return targetPoint;
}

/**
 * The port block of `applyEdgeLayout`. The source port's x and y go through Java's `(float)` cast of the point
 * coordinate (then widen to double); the target port's do not, as in the Java.
 */
function applyEdgeLayoutPorts(elkedge: ElkEdge, sourcePoint: KVector, targetPoint: KVector): void {
  const referenceNode = elkedge.getContainingNode();

  const source = elkedge.getSources().get(0);
  if (isElkPort(source)) {
    const sourceNode = source.getParent();

    ElkUtil.toAbsolute(sourcePoint, referenceNode);
    ElkUtil.toRelative(sourcePoint, sourceNode);

    source.setX(Float32.fromDouble(sourcePoint.x) - source.getWidth() / 2);
    source.setY(Float32.fromDouble(sourcePoint.y) - source.getHeight() / 2);
  }

  const target = elkedge.getTargets().get(0);
  if (isElkPort(target)) {
    const targetNode = target.getParent();

    ElkUtil.toAbsolute(targetPoint, referenceNode);
    ElkUtil.toRelative(targetPoint, targetNode);

    target.setX(targetPoint.x - target.getWidth() / 2);
    target.setY(targetPoint.y - target.getHeight() / 2);
  }
}

/** The tail of `applyEdgeLayout`: the spline routing flag, then the edge label positions. */
function applyEdgeLayoutLabels(
  elkedge: ElkEdge,
  attributeMap: ReadonlyMap<string | null, string | null>,
  offset: KVector,
  transData: TransData,
): void {
  if (transData.getProperty(USE_SPLINES)) {
    elkedge.setProperty(CoreOptions.EDGE_ROUTING, EdgeRouting.SPLINES);
  }

  // process the edge labels
  let labelPos = attributeOf(attributeMap, Attributes.LABELPOS);
  if (labelPos !== null) {
    applyEdgeLabelPos(elkedge, labelPos, EdgeLabelPlacement.CENTER, offset);
  }
  labelPos = attributeOf(attributeMap, Attributes.HEADLP);
  if (labelPos !== null) {
    applyEdgeLabelPos(elkedge, labelPos, EdgeLabelPlacement.HEAD, offset);
  }
  labelPos = attributeOf(attributeMap, Attributes.TAILLP);
  if (labelPos !== null) {
    applyEdgeLabelPos(elkedge, labelPos, EdgeLabelPlacement.TAIL, offset);
  }
}

/**
 * Applies the edge label positions for the given edge.
 *
 * @param elkedge edge for which labels are processed
 * @param posString string with label position
 * @param placement label placement to choose
 * @param offset offset added to positions
 */
function applyEdgeLabelPos(elkedge: ElkEdge, posString: string, placement: EdgeLabelPlacement, offset: KVector): void {
  const { combinedWidth, combinedHeight } = applyEdgeLabelPosCombined(elkedge, placement);
  try {
    const pos = new KVector();
    pos.parse(posString);

    const xpos = pos.x - combinedWidth / 2 + offset.x;
    let ypos = pos.y - combinedHeight / 2 + offset.y;

    for (const label of elkedge.getLabels()) {
      const elp = label.getProperty(CoreOptions.EDGE_LABELS_PLACEMENT);
      if (elp === placement) {
        const xoffset = (combinedWidth - label.getWidth()) / 2;
        label.setX(xpos + xoffset);
        label.setY(ypos);
        ypos += label.getHeight();
      }
    }
  } catch (exception) {
    if (exception instanceof IllegalArgumentException) {
      // ignore exception
      return;
    }
    throw exception;
  }
}

/** The first label loop of `applyEdgeLabelPos`: the combined size of the labels of the placement. */
function applyEdgeLabelPosCombined(
  elkedge: ElkEdge,
  placement: EdgeLabelPlacement,
): { combinedWidth: number; combinedHeight: number } {
  let combinedWidth = 0.0;
  let combinedHeight = 0.0;
  for (const label of elkedge.getLabels()) {
    const elp = label.getProperty(CoreOptions.EDGE_LABELS_PLACEMENT);
    if (elp === placement) {
      combinedWidth = Math.max(combinedWidth, label.getWidth());
      combinedHeight += label.getHeight();
    }
  }
  return { combinedWidth, combinedHeight };
}

/**
 * Converts a list of attributes to a map of attribute names to their values. Java's `HashMap` is a `Map` (AD-10):
 * string keys, only `put` and `get`, no iteration; a repeated name keeps the last value, as `HashMap.put` does.
 *
 * @param attributes attribute list
 * @returns a hash map that contains all given attributes
 */
function createAttributeMap(attributes: EList<Attribute>): Map<string | null, string | null> {
  const attributeMap = new Map<string | null, string | null>();
  for (const attribute of attributes) {
    attributeMap.set(attribute.getName(), attribute.getValue());
  }
  return attributeMap;
}

/**
 * Puts the points of a position string into a list of splines.
 *
 * @param posString string with spline points
 * @param splines list of splines
 * @param offset offset to add to coordinates
 * @returns the source and the target point, if specified by the position string
 */
function parseSplinePoints(posString: string, splines: KVectorChain[], offset: KVector): Pair<KVector, KVector> {
  const ends: SplineEnds = { sourcePoint: null, targetPoint: null };
  const splinesTokenizer = new StringTokenizer(posString, '";');
  while (splinesTokenizer.hasMoreTokens()) {
    const pointList = new KVectorChain();
    const posTokenizer = new StringTokenizer(splinesTokenizer.nextToken(), ' \t');
    while (posTokenizer.hasMoreTokens()) {
      const token = posTokenizer.nextToken();
      parseSplinePointsToken(token, ends, pointList, offset);
    }
    splines.push(pointList);
  }
  return new Pair<KVector, KVector>(ends.sourcePoint as KVector, ends.targetPoint as KVector);
}

/**
 * The `try` block of the token loop of `parseSplinePoints`. An end point is created before its text is parsed, so a
 * malformed `s,`/`e,` token leaves it at (0, 0) without the offset.
 */
function parseSplinePointsToken(token: string, ends: SplineEnds, pointList: KVectorChain, offset: KVector): void {
  try {
    if (token.startsWith('s')) {
      if (ends.sourcePoint === null) {
        ends.sourcePoint = new KVector();
        const commaIndex = token.indexOf(',');
        ends.sourcePoint.parse(token.substring(commaIndex + 1));
        ends.sourcePoint.add(offset);
      }
    } else if (token.startsWith('e')) {
      if (ends.targetPoint === null) {
        ends.targetPoint = new KVector();
        const commaIndex = token.indexOf(',');
        ends.targetPoint.parse(token.substring(commaIndex + 1));
        ends.targetPoint.add(offset);
      }
    } else {
      const point = new KVector();
      point.parse(token);
      pointList.add(point.add(offset));
    }
  } catch (exception) {
    if (exception instanceof IllegalArgumentException) {
      // ignore exception
      return;
    }
    throw exception;
  }
}
