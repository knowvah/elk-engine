// SPDX-License-Identifier: EPL-2.0
import { ElkMargin } from '../../core/math/ElkMargin.js';
import { ElkMath } from '../../core/math/ElkMath.js';
import { ElkRectangle } from '../../core/math/ElkRectangle.js';
import { KVector } from '../../core/math/KVector.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { ElkUtil } from '../../core/util/ElkUtil.js';
import { Pair } from '../../core/util/Pair.js';
import { ElkGraphAdapters } from '../../core/util/adapters/ElkGraphAdapters.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import * as Maps from '../../guava/Maps.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { PROPERTY_RETURN_VALUE, unboxInteger } from '../../java/lang/Unbox.js';
import { hashable } from '../../java/util/HashStrategy.js';
import type { JavaHashMap } from '../../java/util/JavaHashMap.js';
import { Random } from '../../java/util/Random.js';
import type { ICostFunction } from '../common/ICostFunction.js';
import { NodeDimensionCalculation } from '../common/nodespacing/NodeDimensionCalculation.js';
import { InternalProperties } from '../common/spore/InternalProperties.js';
import { Node } from '../common/spore/Node.js';
import { Utils } from '../common/utils/Utils.js';
import { Graph } from './graph/Graph.js';
import type { IGraphImporter } from './IGraphImporter.js';
import type { CompactionStrategy } from './options/CompactionStrategy.js';
import { RootSelection } from './options/RootSelection.js';
import { SpanningTreeCostFunction } from './options/SpanningTreeCostFunction.js';
import { SporeCompactionOptions } from './options/SporeCompactionOptions.js';
import type { TreeConstructionStrategy } from './options/TreeConstructionStrategy.js';

/** Key protocol of the `KVector`-keyed `nodeMap`: `KVector.hashCode` and `KVector.equals`. */
const KVECTOR_STRATEGY = hashable<KVector>();

/** The factor of the random shift of identical centres: `(random.nextDouble() - 0.5) * 0.001`. */
const JITTER_OFFSET = 0.5;
const JITTER_SCALE = 0.001;
/** `center.scale(0.5)` of the CENTER_NODE root selection. */
const HALF = 0.5;

type NodeMap = JavaHashMap<KVector, Pair<Node, ElkNode>>;

/**
 * Provides the methods for conversions between ElkGraphs and Graphs.
 *
 * `importGraph` and `applyPositions` are split at their statement-group boundaries (the node creation loop, the
 * root selection switch, the cost function switch, the position loop, the edge loop) to stay inside the complexity
 * limits; statement order is unchanged. The jitter of identical centres draws from a `Random` seeded by `randomSeed`
 * (default 1, eclipse-elk/elk#1242; an unseeded `Math.random()` until `e7eaea57`, PK4), in `importGraph` and, since
 * eclipse-elk/elk#1244, in `updateGraph`.
 *
 * @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/ElkGraphImporter.java
 */
export class ElkGraphImporter implements IGraphImporter<ElkNode> {
  private graph!: Graph;
  /**
   * Associates the vertices used in the SPOrE process with the original ElkNodes. The key is the value-hashed
   * `KVector` (a `JavaHashMap`): two equal centres collapse into one entry.
   */
  private nodeMap!: NodeMap;
  /** The original graph to be resized after the execution phase. */
  private elkGraph!: ElkNode;
  /** Spacing between nodes. */
  private spacingNodeNode = 0;
  /** The random number generator. */
  private random!: Random;

  // callback functions ----------------------------------------------------------------------------------------------
  /**
   * A cost function for the spanning tree calculation, that represents the euclidean distance between
   * the center points of two elements.
   */
  private readonly centerDistance: ICostFunction = {
    cost: (e) => e.u.distance(e.v),
  };

  /**
   * A cost function for the spanning tree calculation, that represents the minimum of the euclidean distances
   * between the center point of each element and the center of the root element.
   */
  private readonly minimumRootDistance: ICostFunction = {
    // `graph.preferredRoot` is null for a missing root (the Java throws a NullPointerException here, ElkGraphImporter.java:72)
    cost: (e) =>
      Math.min(e.u.distance(this.graph.preferredRoot!.vertex), e.v.distance(this.graph.preferredRoot!.vertex)),
  };

  /**
   * A cost function for the spanning tree calculation, that represents the euclidean distance between
   * the circumcircles of two elements.
   */
  private readonly circleUnderlap: ICostFunction = {
    cost: (e) => {
      const n1 = this.nodeOf(e.u);
      const n2 = this.nodeOf(e.v);
      return e.u.distance(e.v) - e.u.distance(n1.rect.getPosition()) - e.v.distance(n2.rect.getPosition());
    },
  };

  /**
   * A cost function for the spanning tree calculation, that represents the distance in a certain direction between
   * the bounding boxes of two elements. The direction is given by a vector connecting the center points.
   */
  private readonly rectangleUnderlap: ICostFunction = {
    cost: (e) => this.nodeOf(e.u).underlap(this.nodeOf(e.v)),
  };

  /** Cost function for overlap removal by Nachmanson et al. "Node Overlap Removal by Growing a Tree". */
  private readonly invertedOverlap: ICostFunction = {
    cost: (e) => {
      const r1 = this.nodeOf(e.u).rect;
      const r2 = this.nodeOf(e.v).rect;
      const dist = ElkMath.shortestDistance(r1, r2);
      if (dist >= 0) {
        return dist;
      }

      const s = r2.getCenter().sub(r1.getCenter()).length();
      return -(Utils.overlap(r1, r2) - 1) * s;
    },
  };

  /** `nodeMap.get(v).getFirst()` (a missing key throws a NullPointerException in the Java). */
  private nodeOf(v: KVector): Node {
    return this.nodeMap.get(v)!.getFirst()!;
  }

  /** @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/ElkGraphImporter.java:109 */
  importGraph(inputGraph: ElkNode): Graph {
    this.elkGraph = inputGraph;

    this.nodeMap = Maps.newHashMap<KVector, Pair<Node, ElkNode>>(KVECTOR_STRATEGY);

    // calculate margins
    const adapter = ElkGraphAdapters.adapt(this.elkGraph);
    NodeDimensionCalculation.calculateNodeMargins(adapter);

    // retrieve layout options
    const preferredRootID = this.elkGraph.getProperty(SporeCompactionOptions.PROCESSING_ORDER_PREFERRED_ROOT) as
      string | null;
    const costFunctionID = this.elkGraph.getProperty(
      SporeCompactionOptions.PROCESSING_ORDER_SPANNING_TREE_COST_FUNCTION,
    );
    const treeConstructionStrategy = this.elkGraph.getProperty(
      SporeCompactionOptions.PROCESSING_ORDER_TREE_CONSTRUCTION,
    );
    const compactionStrategy = this.elkGraph.getProperty(SporeCompactionOptions.COMPACTION_COMPACTION_STRATEGY);
    const rootSelection = this.elkGraph.getProperty(SporeCompactionOptions.PROCESSING_ORDER_ROOT_SELECTION);
    this.spacingNodeNode = this.elkGraph.getProperty(SporeCompactionOptions.SPACING_NODE_NODE);

    // set the random number generator based on the random seed option
    this.random = this.createRandom();

    const costFunction = this.costFunctionFor(costFunctionID);

    // instantiate Graph
    this.graph = this.instantiateGraph(costFunction, treeConstructionStrategy, compactionStrategy);

    if (this.elkGraph.getChildren().isEmpty()) {
      // don't bother
      return this.graph;
    }

    // create Nodes representing the ElkNodes
    this.createNodes();

    // spanning tree root selection method
    this.selectRoot(rootSelection, preferredRootID);

    return this.graph;
  }

  /** The random seed block of `importGraph` (`ElkGraphImporter.java:131-136`): seed 0 is the unseeded generator. */
  private createRandom(): Random {
    const randomSeed = unboxInteger(
      this.elkGraph.getProperty(SporeCompactionOptions.RANDOM_SEED),
      PROPERTY_RETURN_VALUE('ElkNode'),
    );
    if (randomSeed === 0) {
      return new Random();
    } else {
      return new Random(randomSeed);
    }
  }

  /** The cost function switch of `importGraph` (`ElkGraphImporter.java:139-158`). */
  private costFunctionFor(costFunctionID: SpanningTreeCostFunction): ICostFunction {
    switch (costFunctionID) {
      case SpanningTreeCostFunction.CENTER_DISTANCE:
        return this.centerDistance;
      case SpanningTreeCostFunction.CIRCLE_UNDERLAP:
        return this.circleUnderlap;
      case SpanningTreeCostFunction.RECTANGLE_UNDERLAP:
        return this.rectangleUnderlap;
      case SpanningTreeCostFunction.INVERTED_OVERLAP:
        return this.invertedOverlap;
      case SpanningTreeCostFunction.MINIMUM_ROOT_DISTANCE:
        return this.minimumRootDistance;
      default:
        throw new IllegalArgumentException(`No implementation available for ${costFunctionID.toString()}`);
    }
  }

  /** The graph instantiation of `importGraph` (`ElkGraphImporter.java:160-163`). */
  private instantiateGraph(
    costFunction: ICostFunction,
    treeConstructionStrategy: TreeConstructionStrategy,
    compactionStrategy: CompactionStrategy,
  ): Graph {
    const graph = new Graph(costFunction, treeConstructionStrategy, compactionStrategy);
    graph.setProperty(InternalProperties.DEBUG_SVG, this.elkGraph.getProperty(SporeCompactionOptions.DEBUG_MODE));
    graph.orthogonalCompaction = this.elkGraph.getProperty(SporeCompactionOptions.COMPACTION_ORTHOGONAL);
    return graph;
  }

  /** The node creation loop of `importGraph` (`ElkGraphImporter.java:170-189`). */
  private createNodes(): void {
    for (const elkNode of this.elkGraph.getChildren()) {
      const halfWidth = elkNode.getWidth() / 2;
      const halfHeight = elkNode.getHeight() / 2;
      const vertex = new KVector(elkNode.getX() + halfWidth, elkNode.getY() + halfHeight);

      // randomly shift identical points a tiny bit to make them unique
      this.shiftUntilUnique(vertex, this.nodeMap);

      const margin: ElkMargin = elkNode.getProperty(CoreOptions.MARGINS);

      const node = new Node(
        vertex,
        new ElkRectangle(
          vertex.x - halfWidth - this.spacingNodeNode / 2 - margin.left,
          vertex.y - halfHeight - this.spacingNodeNode / 2 - margin.top,
          elkNode.getWidth() + this.spacingNodeNode + margin.getHorizontal(),
          elkNode.getHeight() + this.spacingNodeNode + margin.getVertical(),
        ),
      );

      this.graph.vertices.push(node);
      this.nodeMap.put(vertex, Pair.of(node, elkNode));
    }
  }

  /** The root selection switch of `importGraph` (`ElkGraphImporter.java:191-227`). */
  private selectRoot(rootSelection: RootSelection, preferredRootID: string | null): void {
    switch (rootSelection) {
      case RootSelection.FIXED:
        if (preferredRootID === null) {
          // get first Node in list if no ID specified
          this.graph.preferredRoot = this.graph.vertices[0]!;
        } else {
          // find Node associated with the ElkNode containing the ID
          for (const node of this.graph.vertices) {
            const id = this.nodeMap.get(node.originalVertex)!.getSecond()!.getIdentifier();
            if (id !== null && id === preferredRootID) {
              this.graph.preferredRoot = node;
            }
          }
        }
        break;

      case RootSelection.CENTER_NODE:
        this.selectCenterNode();
        break;

      default:
        throw new IllegalArgumentException(`No implementation available for ${rootSelection.toString()}`);
    }
  }

  /** The CENTER_NODE case of the root selection (`ElkGraphImporter.java:208-223`). */
  private selectCenterNode(): void {
    // find node that is most central in the drawing
    const center = new KVector(this.elkGraph.getWidth(), this.elkGraph.getHeight());
    center.scale(HALF);
    center.add(this.elkGraph.getX(), this.elkGraph.getY());
    let closest = Number.POSITIVE_INFINITY;
    for (const node of this.graph.vertices) {
      const distance = node.originalVertex.distance(center);
      if (distance < closest) {
        closest = distance;
        this.graph.preferredRoot = node;
      }
    }
  }

  /** @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/ElkGraphImporter.java:233 */
  updateGraph(g: Graph): void {
    const updatedNodeMap: NodeMap = Maps.newHashMap<KVector, Pair<Node, ElkNode>>(KVECTOR_STRATEGY);
    // reset graph
    g.tEdges = null;
    g.tree = null;

    // update nodes
    for (const n of g.vertices) {
      const original = this.nodeMap.get(n.originalVertex)!;
      const center = n.rect.getCenter();
      // overlap removal can move a node onto the center of another one, keep the centers unique
      if (updatedNodeMap.containsKey(center)) {
        const oldCenter = center.clone();
        this.shiftUntilUnique(center, updatedNodeMap);
        n.translate(center.clone().sub(oldCenter));
      }
      n.originalVertex = center;
      updatedNodeMap.put(n.originalVertex, original);
    }
    this.nodeMap = updatedNodeMap;
  }

  /**
   * Randomly shifts the given point a tiny bit until it is not a key of the given map. The centers of the nodes
   * must be unique: if two positions were identical, their corresponding edge in the spanning tree would be of
   * zero length, had no direction, and couldn't be scaled by anything.
   *
   * @param vertex the point to shift
   * @param vertexMap the map whose keys are the points already taken
   * @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/ElkGraphImporter.java:263
   */
  private shiftUntilUnique(vertex: KVector, vertexMap: JavaHashMap<KVector, unknown>): void {
    while (vertexMap.containsKey(vertex)) {
      // Java evaluates the two arguments left to right: the x draw comes first
      const dx = (this.random.nextDouble() - JITTER_OFFSET) * JITTER_SCALE;
      const dy = (this.random.nextDouble() - JITTER_OFFSET) * JITTER_SCALE;
      vertex.add(dx, dy);
    }
  }

  /** @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/ElkGraphImporter.java:271 */
  applyPositions(g: Graph): void {
    // set new node positions
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const node of g.vertices) {
      const elkNode = this.nodeMap.get(node.originalVertex)!.getSecond()!;
      elkNode.setLocation(node.rect.x, node.rect.y);
      minX = Math.min(minX, elkNode.getX());
      minY = Math.min(minY, elkNode.getY());
      maxX = Math.max(maxX, elkNode.getX() + elkNode.getWidth());
      maxY = Math.max(maxY, elkNode.getY() + elkNode.getHeight());
    }

    // set new dimensions of parent node
    const padding = this.elkGraph.getProperty(SporeCompactionOptions.PADDING);
    ElkUtil.resizeNode(
      this.elkGraph,
      maxX - minX + padding.getHorizontal(),
      maxY - minY + padding.getVertical(),
      true,
      true,
    );
    ElkUtil.translate(this.elkGraph, -minX + padding.left, -minY + padding.top);

    this.routeEdges();
  }

  /** The edge loop of `applyPositions` (`ElkGraphImporter.java:292-315`): straight lines clipped at the nodes. */
  private routeEdges(): void {
    // update edges and route them as straight lines
    for (const e of this.elkGraph.getContainedEdges()) {
      const kedgeSection = ElkGraphUtil.firstEdgeSection(e, true, true);

      const source = ElkGraphUtil.getSourceNode(e)!;
      const target = ElkGraphUtil.getTargetNode(e)!;
      const startLocation = new KVector(source.getX() + source.getWidth() / 2, source.getY() + source.getHeight() / 2);
      const endLocation = new KVector(target.getX() + target.getWidth() / 2, target.getY() + target.getHeight() / 2);

      const uv = endLocation.clone().sub(startLocation);
      ElkMath.clipVector(uv, source.getWidth(), source.getHeight());
      startLocation.add(uv);
      const vu = startLocation.clone().sub(endLocation);
      ElkMath.clipVector(vu, target.getWidth(), target.getHeight());
      endLocation.add(vu);

      kedgeSection.setStartLocation(startLocation.x, startLocation.y);
      kedgeSection.setEndLocation(endLocation.x, endLocation.y);
    }
  }
}
