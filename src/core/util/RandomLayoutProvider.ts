// SPDX-License-Identifier: EPL-2.0
import type { ElkConnectableShape } from '../../graph/ElkConnectableShape.js';
import type { ElkEdge } from '../../graph/ElkEdge.js';
import type { ElkEdgeSection } from '../../graph/ElkEdgeSection.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { isElkPort } from '../../graph/ElkPort.js';
import { ElkGraphFactory } from '../../graph/ElkGraphFactory.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import * as Iterables from '../../guava/Iterables.js';
import * as Float32 from '../../java/lang/Float32.js';
import { Random } from '../../java/util/Random.js';
import { AbstractLayoutProvider } from '../AbstractLayoutProvider.js';
import type { ElkPadding } from '../math/ElkPadding.js';
import { RandomLayouterOptions } from '../options/RandomLayouterOptions.js';
import { ElkUtil } from './ElkUtil.js';
import type { IElkProgressMonitor } from './IElkProgressMonitor.js';

/** The maximal number of generated bend points for each edge. */
const MAX_BENDS = 5;
/**
 * A factor for the distance between source and target node, determines how much edge bend point may deviate from the
 * straight line between those nodes. (Java: `double RAND_FACT = 0.2f`, i.e. the float widened to double.)
 */
const RAND_FACT = Float32.fromDouble(0.2);

/** The center and half extent of an edge end (Java's locals `sourceX`, `sourceY`, `sourceWidth`, `sourceHeight`). */
interface Anchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The straight route of an edge section and the number of bend points to add to it. */
interface Route {
  start: { x: number; y: number };
  end: { x: number; y: number };
  bendsNum: number;
}

/**
 * Layout provider that computes random layouts. Can be useful to demonstrate the difference between a good layout
 * and an extremely bad one.
 *
 * MIGRATE The random layout provider does not support hyperedges yet.
 *
 * For that to work, the `randomizeEdge` method (Java: `randomize(ElkEdge, Random, double, double)`) needs to be
 * extended.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/RandomLayoutProvider.java
 */
export class RandomLayoutProvider extends AbstractLayoutProvider {
  layout(parentNode: ElkNode, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Random Layout', 1);

    if (parentNode.getChildren().isEmpty()) {
      progressMonitor.done();
      return;
    }

    // initialize random seed
    let random: Random;
    const randomSeed: number | null = parentNode.getProperty(RandomLayouterOptions.RANDOM_SEED);
    if (randomSeed !== null && randomSeed !== 0) {
      random = new Random(randomSeed);
    } else {
      random = new Random();
    }

    // retrieve some layout option values (`.floatValue()`)
    const aspectRatio = Float32.fromDouble(parentNode.getProperty(RandomLayouterOptions.ASPECT_RATIO));
    const spacing = Float32.fromDouble(parentNode.getProperty(RandomLayouterOptions.SPACING_NODE_NODE));
    const padding = parentNode.getProperty(RandomLayouterOptions.PADDING);

    // randomize the layout
    this.randomize(parentNode, random, aspectRatio, spacing, padding);

    progressMonitor.done();
  }

  /**
   * Randomize the given graph.
   *
   * @param parent the parent node of the graph
   * @param random the random number generator
   * @param aspectRatio desired aspect ratio (must not be 0)
   * @param spacing desired object spacing
   * @param padding offset to the border
   */
  private randomize(parent: ElkNode, random: Random, aspectRatio: number, spacing: number, padding: ElkPadding): void {
    const { drawWidth, drawHeight } = this.drawSize(parent, aspectRatio, spacing);

    // randomize node positions
    for (const node of parent.getChildren()) {
      const x = padding.getLeft() + random.nextDouble() * (drawWidth - node.getWidth());
      // sic: the Java adds the left padding to y as well
      const y = padding.getLeft() + random.nextDouble() * (drawHeight - node.getHeight());
      node.setLocation(x, y);
    }

    // randomize edge positions
    let totalWidth = drawWidth + padding.getHorizontal();
    let totalHeight = drawHeight + padding.getVertical();
    for (const source of parent.getChildren()) {
      for (const edge of ElkGraphUtil.allOutgoingEdges(source)) {
        if (!edge.isHierarchical()) {
          this.randomizeEdge(edge, random, totalWidth, totalHeight);
        }
      }
    }

    totalWidth += padding.getLeft() + padding.getRight();
    totalHeight += padding.getTop() + padding.getBottom();
    ElkUtil.resizeNode(parent, totalWidth, totalHeight, false, true);
  }

  /** The width and height of the area in which the nodes are randomly distributed (Java's first `randomize` block). */
  private drawSize(parent: ElkNode, aspectRatio: number, spacing: number): { drawWidth: number; drawHeight: number } {
    // determine width and height of the drawing and count the number of edges
    let nodesArea = 0.0;
    let maxWidth = 0.0;
    let maxHeight = 0.0;
    let m = 1;
    for (const node of parent.getChildren()) {
      m += Iterables.size(ElkGraphUtil.allOutgoingEdges(node));

      const width = node.getWidth();
      maxWidth = Math.max(maxWidth, width);
      const height = node.getHeight();
      maxHeight = Math.max(maxHeight, height);

      nodesArea += width * height;
    }
    const n = parent.getChildren().size();

    // a heuristic formula that determines an area in which nodes are randomly distributed
    const drawArea = nodesArea + 2 * spacing * spacing * m * n;
    const areaSqrt = Math.sqrt(drawArea);
    const drawWidth = Math.max(areaSqrt * aspectRatio, maxWidth);
    const drawHeight = Math.max(areaSqrt / aspectRatio, maxHeight);
    return { drawWidth, drawHeight };
  }

  /**
   * Randomize the given edge by adding bend points in the area between the source and target node.
   *
   * @param edge an edge
   * @param random the random number generator
   * @param drawWidth the total width of the drawing
   * @param drawHeight the total Height of the drawing
   */
  private randomizeEdge(edge: ElkEdge, random: Random, drawWidth: number, drawHeight: number): void {
    // Determine source coordinate
    const sourceShape = edge.getSources().get(0);
    const source = this.anchorOf(sourceShape);

    // Determine target coordinate (sic: the Java reads the first *source* again, so target equals source)
    const targetShape = edge.getSources().get(0);
    const target = this.anchorOf(targetShape);

    const edgeSection = this.singleSection(edge);

    const [sourcePX, sourcePY] = this.sourcePoint(source, target);
    edgeSection.setStartLocation(sourcePX, sourcePY);

    const [targetPX, targetPY] = this.targetPoint(source, target);
    edgeSection.setEndLocation(targetPX, targetPY);

    // add a random number of bend points
    edgeSection.getBendPoints().clear();
    let bendsNum = random.nextInt(MAX_BENDS);
    if (sourceShape === targetShape) {
      bendsNum++;
    }
    this.addBendPoints(
      edgeSection,
      random,
      { start: { x: sourcePX, y: sourcePY }, end: { x: targetPX, y: targetPY }, bendsNum },
      drawWidth,
      drawHeight,
    );
  }

  /** The center and half extent of an edge end, with the parent offset of a port (applied twice, as in Java). */
  private anchorOf(shape: ElkConnectableShape): Anchor {
    let x = shape.getX();
    let y = shape.getY();
    const width = shape.getWidth() / 2;
    const height = shape.getHeight() / 2;

    if (isElkPort(shape)) {
      const port = shape;
      x += (port.getParent() as ElkNode).getX();
      x += (port.getParent() as ElkNode).getX();
    }

    x += width;
    y += height;
    return { x, y, width, height };
  }

  /** Ensure that the edge has a single edge section and return it. */
  private singleSection(edge: ElkEdge): ElkEdgeSection {
    if (edge.getSections().isEmpty()) {
      // We need an edge section to apply the bend points to
      const edgeSection = ElkGraphFactory.eINSTANCE.createElkEdgeSection();
      edge.getSections().add(edgeSection);
    } else if (edge.getSections().size() > 1) {
      // We can only apply bend points to a single edge section, so throw away all except for the last one
      const sections = edge.getSections().listIterator();
      while (sections.hasNext()) {
        sections.remove();
      }
    }

    return edge.getSections().get(0);
  }

  /** The source point of the edge section, on the border of the source element. */
  private sourcePoint(source: Anchor, target: Anchor): [number, number] {
    let sourcePX = target.x;
    if (target.x > source.x + source.width) {
      sourcePX = source.x + source.width;
    } else if (target.x < source.x - source.width) {
      sourcePX = source.x - source.width;
    }

    let sourcePY = target.y;
    if (target.y > source.y + source.height) {
      sourcePY = source.y + source.height;
    } else if (target.y < source.y - source.height) {
      sourcePY = source.y - source.height;
    }

    if (
      sourcePX > source.x - source.width &&
      sourcePX < source.x + source.width &&
      sourcePY > source.y - source.height &&
      sourcePY < source.y + source.height
    ) {
      sourcePX = source.x + source.width;
    }

    return [sourcePX, sourcePY];
  }

  /** The target point of the edge section, on the border of the target element. */
  private targetPoint(source: Anchor, target: Anchor): [number, number] {
    let targetPX = source.x;
    if (source.x > target.x + target.width) {
      targetPX = target.x + target.width;
    } else if (source.x < target.x - target.width) {
      targetPX = target.x - target.width;
    }

    let targetPY = source.y;
    if (source.y > target.y + target.height) {
      targetPY = target.y + target.height;
    } else if (source.y < target.y - target.height) {
      targetPY = target.y - target.height;
    }

    if (
      targetPX > target.x - target.width &&
      targetPX < target.x + target.width &&
      targetPY > target.y - target.height &&
      targetPY < target.y + target.height
    ) {
      targetPY = target.y + target.height;
    }

    return [targetPX, targetPY];
  }

  /** Adds `route.bendsNum` bend points that deviate randomly from the straight line between start and end. */
  private addBendPoints(
    edgeSection: ElkEdgeSection,
    random: Random,
    route: Route,
    drawWidth: number,
    drawHeight: number,
  ): void {
    const { start, end, bendsNum } = route;
    const xdiff = end.x - start.x;
    const ydiff = end.y - start.y;
    const totalDist = Math.sqrt(xdiff * xdiff + ydiff * ydiff);
    const maxRand = totalDist * RAND_FACT;
    const xincr = xdiff / (bendsNum + 1);
    const yincr = ydiff / (bendsNum + 1);
    let x = start.x;
    let y = start.y;
    for (let i = 0; i < bendsNum; i++) {
      // determine coordinates that deviate from the straight connection by a random amount
      x += xincr;
      y += yincr;
      const randx = this.deviate(random, x, maxRand, drawWidth);
      const randy = this.deviate(random, y, maxRand, drawHeight);
      const bendPoint = ElkGraphFactory.eINSTANCE.createElkBendPoint();
      bendPoint.set(randx, randy);
      edgeSection.getBendPoints().add(bendPoint);
    }
  }

  /** One random coordinate (one `nextFloat` draw), kept inside `[0, limit]` as in the Java's `randx`/`randy` blocks. */
  private deviate(random: Random, coordinate: number, maxRand: number, limit: number): number {
    let rand = coordinate + random.nextFloat() * maxRand - maxRand / 2;
    if (rand < 0) {
      rand = 1;
    } else if (rand > limit) {
      rand = limit - 1;
    }
    return rand;
  }
}
