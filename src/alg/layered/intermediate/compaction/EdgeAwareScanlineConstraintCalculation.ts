// SPDX-License-Identifier: EPL-2.0
import type { CGroup } from '../../../common/compaction/oned/CGroup.js';
import type { CNode } from '../../../common/compaction/oned/CNode.js';
import type { OneDimensionalCompactor } from '../../../common/compaction/oned/OneDimensionalCompactor.js';
import { ScanlineConstraintCalculator } from '../../../common/compaction/oned/ScanlineConstraintCalculator.js';
import { UnsupportedConfigurationException } from '../../../../core/UnsupportedConfigurationException.js';
import { EdgeRouting } from '../../../../core/options/EdgeRouting.js';
import type { LGraph } from '../../graph/LGraph.js';
import { LNode } from '../../graph/LNode.js';
import { NodeType } from '../../graph/LNodeNodeType.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { Spacings } from '../../options/Spacings.js';
import { getLNodeOrNull, getVerticalSegmentOrNull } from './CNodeOrigins.js';
import { VerticalSegment } from './VerticalSegment.js';

const EPSILON = 0.5;
const SMALL_EPSILON = 0.01;

/**
 * An extended scanline procedure that is able to properly handle different spacing values between nodes and edges.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/compaction/EdgeAwareScanlineConstraintCalculation.java
 */
export class EdgeAwareScanlineConstraintCalculation extends ScanlineConstraintCalculator {
  private readonly verticalEdgeEdgeSpacing: number;

  private readonly edgeRouting: EdgeRouting;

  /** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/compaction/EdgeAwareScanlineConstraintCalculation.java */
  constructor(graph: LGraph) {
    super();
    this.verticalEdgeEdgeSpacing = graph.getProperty(LayeredOptions.SPACING_EDGE_EDGE);
    this.edgeRouting = graph.getProperty(LayeredOptions.EDGE_ROUTING);
  }

  /** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/compaction/EdgeAwareScanlineConstraintCalculation.java */
  override calculateConstraints(theCompactor: OneDimensionalCompactor): void {
    this.compactor = theCompactor;

    switch (this.edgeRouting) {
      case EdgeRouting.ORTHOGONAL:
        this.calculateForOrthogonal();
        break;
      case EdgeRouting.SPLINES:
        this.calculateForSpline();
        break;
      default:
        throw new UnsupportedConfigurationException();
    }
  }

  // -------------------------------------- SPLINES --------------------------------------

  private calculateForSpline(): void {
    const schedule: (() => void)[] = [];

    /* -------------------- Vertical Segments -------------------- */
    // Note that some constraints between subsequent vertical segments of the same spline
    //  have been precalculated during import
    // Apart from that the boxes are not enlarged since this risks to introduce overlaps

    this.sweep((n) => n.origin instanceof VerticalSegment);

    /* -------------------- Everything -------------------- */

    // find the minimum spacing
    const minSpacing = this.findMinimumSpacing();

    for (const n of this.compactor.cGraph.cNodes) {
      if (n.origin instanceof LNode) {
        this.alterHitbox(n, minSpacing, 1);
        schedule.push(() => {
          this.alterHitbox(n, minSpacing, -1);
        });
      }
    }

    this.sweep(() => true);

    schedule.forEach((r) => {
      r();
    });
    schedule.length = 0;
  }

  // -------------------------------------- ORTHOGONAL --------------------------------------
  // Java's calculateForOrthogonal, split into its three commented phases (complexity limit); the phases run in order.
  private calculateForOrthogonal(): void {
    const schedule: (() => void)[] = [];

    this.orthogonalVerticalSegments(schedule);
    this.orthogonalNodes(schedule);
    this.orthogonalEverything(schedule);
  }

  /* -------------------- Vertical Segments -------------------- */
  private orthogonalVerticalSegments(schedule: (() => void)[]): void {
    for (const n of this.compactor.cGraph.cNodes) {
      if (n.origin instanceof VerticalSegment) {
        const spacing = Math.max(0, this.verticalEdgeEdgeSpacing / 2 - EPSILON);
        this.alterHitbox(n, spacing, 1);

        schedule.push(() => {
          this.alterHitbox(n, spacing, -1);
        });
      }
    }

    this.sweep((n) => n.origin instanceof VerticalSegment);

    schedule.forEach((r) => {
      r();
    });
    schedule.length = 0;
  }

  /* -------------------- Nodes -------------------- */
  private orthogonalNodes(schedule: (() => void)[]): void {
    for (const n of this.compactor.cGraph.cNodes) {
      if (n.origin instanceof LNode) {
        const lNode = getLNodeOrNull(n) as LNode;
        // One would want to use node-to-node spacing here but there's a problem:
        // if edge-node spacing is smaller than node-to-node/2, two nodes can be placed closer than they
        // actually may by the previous phases ...
        //double spacing = Spacings.getIndividualOrDefault(lNode, LayeredOptions.SPACING_NODE_NODE);
        const spacing = Spacings.getIndividualOrDefault(lNode, LayeredOptions.SPACING_EDGE_EDGE);
        const finalSpacing = Math.max(0, spacing / 2 - EPSILON);
        this.alterHitbox(n, finalSpacing, 1);

        schedule.push(() => {
          this.alterHitbox(n, finalSpacing, -1);
        });
      }
    }

    this.sweep((n) => n.origin instanceof LNode);

    schedule.forEach((r) => {
      r();
    });
    schedule.length = 0;
  }

  /* -------------------- Everything -------------------- */
  private orthogonalEverything(schedule: (() => void)[]): void {
    // find the minimum spacing
    const minSpacing = this.findMinimumSpacing();

    for (const g of this.compactor.cGraph.cGroups) {
      this.alterGroupedHitboxOrthogonal(g, minSpacing, 1);
      schedule.push(() => {
        this.alterGroupedHitboxOrthogonal(g, minSpacing, -1);
      });
    }

    this.sweep(() => true);

    schedule.forEach((r) => {
      r();
    });
    schedule.length = 0;
  }

  /**
   * The "find the minimum spacing" stream of Java's `calculateForSpline` and `calculateForOrthogonal` (the two copies
   * are identical): `mapToDouble(...).min().orElseGet(() -> 0.0)`; `DoubleStream.min` reduces with `Math.min`.
   */
  private findMinimumSpacing(): number {
    const values = this.compactor.cGraph.cNodes.map((n) => this.minSpacingOf(n));
    return values.length === 0 ? 0.0 : values.reduce((a, b) => Math.min(a, b));
  }

  private minSpacingOf(n: CNode): number {
    // ignore external ports since their spacing is internally set to 0
    if (n.origin instanceof LNode && n.origin.getType() === NodeType.EXTERNAL_PORT) {
      return Number.POSITIVE_INFINITY;
    }

    const vs = getVerticalSegmentOrNull(n);
    if (vs !== null) {
      return Math.max(0, this.verticalEdgeEdgeSpacing / 2 - EPSILON);
    }
    const lNode = getLNodeOrNull(n);
    if (lNode !== null) {
      const spacing = Spacings.getIndividualOrDefault(lNode, LayeredOptions.SPACING_NODE_NODE);
      return Math.max(0, spacing / 2 - EPSILON);
    }

    return Number.POSITIVE_INFINITY;
  }

  /**
   * Alters the hitboxes of the whole {@link CGroup}. That is, for orthogonal edge routes the {@link CGroup} is
   * constructed such that the group's {@link CGroup.master master} is a node and any further {@link CNode node} of
   * the group represents a {@link VerticalSegment}. When enlarging the vertical segments, care has to be taken to
   * regard the {@link VerticalSegment.ignoreSpacing spacing ignores}.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/compaction/EdgeAwareScanlineConstraintCalculation.java
   */
  private alterGroupedHitboxOrthogonal(g: CGroup, spacing: number, fac: number): void {
    let master = g.master;
    if (master === null) {
      master = g.cNodes.values().next().value as CNode;
    }

    // modify the master
    this.alterHitbox(master, spacing, fac);
    if (g.cNodes.size === 1) {
      return;
    }

    // adjust all vertical segments
    const delta = spacing * fac;
    for (const n of g.cNodes) {
      if (n !== master) {
        // n represents a vertical segment (by construction of the groups)
        const vs = getVerticalSegmentOrNull(n) as VerticalSegment;

        if (vs.ignoreSpacing.up) {
          // it's a southward segment
          n.hitbox.y += delta + SMALL_EPSILON;
          n.hitbox.height -= delta + SMALL_EPSILON;
        } else if (vs.ignoreSpacing.down) {
          // northward
          n.hitbox.height -= delta + SMALL_EPSILON;
        }
      }
    }
  }

  // -------------------------------------- COMMON --------------------------------------

  /**
   * Alter the hitbox of a {@link CNode} that either represents an {@link LNode} or a {@link VerticalSegment}.
   * For {@link VerticalSegment}s the {@link VerticalSegment.ignoreSpacing ignoreSpacing} is regarded.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/compaction/EdgeAwareScanlineConstraintCalculation.java
   */
  private alterHitbox(n: CNode, spacing: number, fac: number): void {
    const delta = spacing * fac;

    if (n.origin instanceof VerticalSegment) {
      const vs = getVerticalSegmentOrNull(n) as VerticalSegment;
      if (!vs.ignoreSpacing.up) {
        n.hitbox.y -= delta + SMALL_EPSILON;
        n.hitbox.height += delta + SMALL_EPSILON;
      } else if (!vs.ignoreSpacing.down) {
        n.hitbox.height += delta + SMALL_EPSILON;
      }
    } else if (n.origin instanceof LNode) {
      n.hitbox.y -= delta;
      n.hitbox.height += 2 * delta;
    }
  }
}
