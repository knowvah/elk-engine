// SPDX-License-Identifier: EPL-2.0
import { ElkPadding } from '../../../../core/math/ElkPadding.js';
import { KVector } from '../../../../core/math/KVector.js';
import { CoreOptions } from '../../../../core/options/CoreOptions.js';
import { SizeConstraint } from '../../../../core/options/SizeConstraint.js';
import { ElkUtil } from '../../../../core/util/ElkUtil.js';
import type { EList } from '../../../../emf/common/util/EList.js';
import type { ElkGraphElement } from '../../../../graph/ElkGraphElement.js';
import { type ElkNode, isElkNode } from '../../../../graph/ElkNode.js';
import type { BiMap } from '../../../../guava/HashBiMap.js';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import { checkCast } from '../../../../java/lang/JavaCast.js';
import { parseDouble } from '../../../../java/lang/JavaDouble.js';
import { NumberFormatException } from '../../../../java/lang/NumberFormatException.js';
import { NoSuchElementException } from '../../../../java/util/NoSuchElementException.js';
import { StringTokenizer } from '../../../../java/util/StringTokenizer.js';
import type { Attribute } from '../dot/Attribute.js';
import type { AttributeStatement } from '../dot/AttributeStatement.js';
import { AttributeType } from '../dot/AttributeType.js';
import { DotPackage } from '../dot/DotPackage.js';
import type { GraphvizModel } from '../dot/GraphvizModel.js';
import type { Node } from '../dot/Node.js';
import type { NodeStatement } from '../dot/NodeStatement.js';
import type { Statement } from '../dot/Statement.js';
import type { Subgraph } from '../dot/Subgraph.js';
import { Attributes } from './Attributes.js';
import { ATTRIBUTE_DELIM, DPI, GRAPH_ELEMS } from './DotExporterProperties.js';
import type { IDotTransformationData } from './IDotTransformationData.js';

/**
 * The private node layout transfer methods of `DotExporter` (`applyLayout`, `applyNodeLayout`), split off
 * `DotExporter.ts` for the 500-line limit (the edge part is `DotExporterEdgeLayout.ts`). Neither calls an overridable
 * method; `DotExporter.transferLayout` calls `applyLayout`. Methods over the function limits are split into helpers
 * named after them, statement order kept.
 *
 * Java's cast `(ElkNode)` of a `GRAPH_ELEMS` value is a checked cast (a DOT node named like an edge throws
 * `ClassCastException`); a `null` element dereferenced throws the NullPointerException of the Java (`TypeError`).
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotExporter.java
 */

type TransData = IDotTransformationData<ElkNode, GraphvizModel>;

const L = DotPackage.Literals;
const ELK_NODE_CLASS = 'org.eclipse.elk.graph.ElkNode';

/** The locals of `applyLayout` that its bounding box part shares. */
interface LayoutScope {
  readonly parentNode: ElkNode | null;
  readonly baseOffset: KVector;
  readonly nodeOffset: KVector;
  readonly transData: TransData;
}

/** The node box `applyNodeLayout` collects from the attributes. */
interface NodeBox {
  xpos: number;
  ypos: number;
  width: number;
  height: number;
}

function graphElems(transData: TransData): BiMap<string | null, ElkGraphElement> {
  return transData.getProperty(GRAPH_ELEMS) as BiMap<string | null, ElkGraphElement>;
}

/** `(ElkNode) transData.getProperty(GRAPH_ELEMS).get(name)`. */
function elkNodeOf(transData: TransData, name: string | null): ElkNode | null {
  return checkCast(graphElems(transData).get(name) ?? null, isElkNode, ELK_NODE_CLASS);
}

/**
 * Applies layout information from a Graphviz model to the original graph. Note that GraphViz uses cubic B-Splines
 * for edge routing, some generalization of Bezier curves. Edge offsets are given separately, since on some platforms
 * edges seem to have a different reference point than nodes.
 *
 * @param parentNode parent node of the original graph (`null` for a subgraph without element)
 * @param statements list of statements to process
 * @param baseOffset offset to be added to edge and subgraph coordinates
 * @param outerPadding the padding of the parent
 * @param transData transformation data
 */
export function applyLayout(
  parentNode: ElkNode | null,
  statements: EList<Statement>,
  baseOffset: KVector,
  outerPadding: ElkPadding,
  transData: TransData,
): void {
  // process attributes: determine bounding box of the parent node
  const nodeOffset = new KVector();
  const padding = applyLayoutAttributes({ parentNode, baseOffset, nodeOffset, transData }, statements, outerPadding);

  // process nodes and subgraphs to collect all offset data
  for (const statement of statements) {
    if (L.NODE_STATEMENT.isInstance(statement)) {
      applyNodeLayout(statement as NodeStatement, nodeOffset, padding, transData);
    } else if (L.SUBGRAPH.isInstance(statement)) {
      const subgraph = statement as Subgraph;
      const elknode = elkNodeOf(transData, subgraph.getName());
      applyLayout(elknode, subgraph.getStatements(), baseOffset, padding, transData);
      (elknode as ElkNode).setX((elknode as ElkNode).getX() + nodeOffset.x);
      (elknode as ElkNode).setY((elknode as ElkNode).getY() + nodeOffset.y);
    }
  }
}

/** The `attr_loop` of `applyLayout`: the first parseable `bb` of a `graph` attribute statement; returns the padding. */
function applyLayoutAttributes(scope: LayoutScope, statements: EList<Statement>, outerPadding: ElkPadding): ElkPadding {
  // attr_loop: the Java breaks out of both loops after the first parsed bounding box
  for (const statement of statements) {
    if (L.ATTRIBUTE_STATEMENT.isInstance(statement)) {
      const attributeStatement = statement as AttributeStatement;
      if (attributeStatement.getType() === AttributeType.GRAPH) {
        for (const attribute of attributeStatement.getAttributes()) {
          if (attribute.getName() === Attributes.BOUNDINGBOX) {
            const padding = applyLayoutBoundingBox(scope, attribute, outerPadding);
            if (padding !== null) {
              return padding;
            }
          }
        }
      }
    }
  }
  return outerPadding;
}

/**
 * The `try` block of `applyLayout` for one `bb` attribute: sizes (and for a child, places) the parent node. Returns
 * the padding for the children, or `null` when the value does not parse (the caught `NumberFormatException` and
 * `NoSuchElementException`), so the loop goes on.
 */
function applyLayoutBoundingBox(scope: LayoutScope, attribute: Attribute, outerPadding: ElkPadding): ElkPadding | null {
  let padding = outerPadding;
  try {
    const tokenizer = new StringTokenizer(attribute.getValue() as string, ATTRIBUTE_DELIM);
    const leftx = parseDouble(tokenizer.nextToken());
    const bottomy = parseDouble(tokenizer.nextToken());
    const rightx = parseDouble(tokenizer.nextToken());
    const topy = parseDouble(tokenizer.nextToken());
    // set parent node attributes
    let width = rightx - leftx;
    let height = bottomy - topy;
    const parentNode = scope.parentNode as ElkNode;
    if (scope.parentNode === scope.transData.getSourceGraph()) {
      // the root node, representing the drawing frame
      width += padding.getHorizontal();
      height += padding.getVertical();
      scope.baseOffset.add(-leftx, -topy);
      scope.nodeOffset.add(-leftx, -topy);
    } else {
      padding = applyLayoutChildBox(scope, leftx, topy, padding);
    }
    ElkUtil.resizeNode(parentNode, width, height, false, true);
    parentNode.setProperty(CoreOptions.NODE_SIZE_CONSTRAINTS, SizeConstraint.fixed());
    return padding;
  } catch (exception) {
    if (exception instanceof NumberFormatException || exception instanceof NoSuchElementException) {
      // ignore exception
      return null;
    }
    throw exception;
  }
}

/** The `else` branch of the bounding box of `applyLayout`: a child or descendant of the root node. */
function applyLayoutChildBox(scope: LayoutScope, leftx: number, topy: number, padding: ElkPadding): ElkPadding {
  const parentNode = scope.parentNode as ElkNode;
  parentNode.setX(scope.baseOffset.x + leftx + padding.getLeft());
  parentNode.setY(scope.baseOffset.y + topy + padding.getTop());

  // since dot uses a 'compound' layout instead of laying out a hierarchical graph,
  // no padding is supported for children
  const childPadding = new ElkPadding();
  // ... and the children's offset must be somewhat adjusted
  scope.nodeOffset.x = -(scope.baseOffset.x + leftx);
  scope.nodeOffset.y = -(scope.baseOffset.y + topy);
  return childPadding;
}

/**
 * Set the position of a node.
 *
 * @param nodeStatement a node statement
 * @param offset the offset to be added to node coordinates
 * @param padding additional border spacing
 * @param transData transformation data
 */
function applyNodeLayout(
  nodeStatement: NodeStatement,
  offset: KVector,
  padding: ElkPadding,
  transData: TransData,
): void {
  const elknode = elkNodeOf(transData, (nodeStatement.getNode() as Node).getName());
  if (elknode === null) {
    return;
  }

  const box: NodeBox = { xpos: 0.0, ypos: 0.0, width: 0.0, height: 0.0 };
  for (const attribute of nodeStatement.getAttributes()) {
    applyNodeLayoutAttribute(attribute, offset, padding, box);
  }
  elknode.setX(box.xpos - box.width / 2);
  elknode.setY(box.ypos - box.height / 2);
}

/** The `try` block of the attribute loop of `applyNodeLayout`. */
function applyNodeLayoutAttribute(attribute: Attribute, offset: KVector, padding: ElkPadding, box: NodeBox): void {
  try {
    if (attribute.getName() === Attributes.POS) {
      const pos = new KVector();
      pos.parse(attribute.getValue() as string);
      box.xpos = pos.x + offset.x + padding.getLeft();
      box.ypos = pos.y + offset.y + padding.getTop();
    } else if (attribute.getName() === Attributes.WIDTH) {
      const tokenizer = new StringTokenizer(attribute.getValue() as string, ATTRIBUTE_DELIM);
      box.width = parseDouble(tokenizer.nextToken()) * DPI;
    } else if (attribute.getName() === Attributes.HEIGHT) {
      const tokenizer = new StringTokenizer(attribute.getValue() as string, ATTRIBUTE_DELIM);
      box.height = parseDouble(tokenizer.nextToken()) * DPI;
    }
  } catch (exception) {
    if (
      exception instanceof NumberFormatException ||
      exception instanceof IllegalArgumentException ||
      exception instanceof NoSuchElementException
    ) {
      // ignore exception
      return;
    }
    throw exception;
  }
}
