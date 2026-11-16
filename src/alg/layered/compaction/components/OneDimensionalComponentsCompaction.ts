// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../../core/math/KVector.js';
import { Direction } from '../../../../core/options/Direction.js';
import type { IElkProgressMonitor } from '../../../../core/util/IElkProgressMonitor.js';
import type { Pair } from '../../../../core/util/Pair.js';
import type { CGraph } from '../oned/CGraph.js';
import type { CGroup } from '../oned/CGroup.js';
import type { CNode } from '../oned/CNode.js';
import { OneDimensionalCompactor } from '../oned/OneDimensionalCompactor.js';
import { ComponentsToCGraphTransformer } from './ComponentsToCGraphTransformer.js';
import type { IComponent } from './IComponent.js';
import type { IConnectedComponents } from './IConnectedComponents.js';
import type { IExternalExtension } from './IExternalExtension.js';

/** To differentiate horizontal and vertical directions (Java's private enum `Dir`). */
const Dir = { HORZ: 'HORZ', VERT: 'VERT' } as const;
type Dir = (typeof Dir)[keyof typeof Dir];

const MAX_ITERATION = 10;
const EPSILON = 0.0001;

/**
 * Compacts connected components using a {@link OneDimensionalCompactor}. Consecutively applies
 * horizontal and vertical compaction until no improvement can be made anymore.
 *
 * @typeParam N the type of the contained nodes
 * @typeParam E the type of the contained edges
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compaction/components/OneDimensionalComponentsCompaction.java
 */
export class OneDimensionalComponentsCompaction<N, E> {
  // Java :65-66 `Sets.newHashSet(Direction.LEFT, Direction.RIGHT)` / `(UP, DOWN)`: identity-hashed enum
  // keys iterated by addPlaceholders & co; every identity hash is 1 under -XX:hashCode=2, so the
  // iteration is insertion order (LEFT, RIGHT / UP, DOWN). Built on first use: a module-level read of
  // `Direction` would run too early (mission 7b decision E1).
  static #LEFT_RIGHT: Set<Direction> | undefined;
  static #UP_DOWN: Set<Direction> | undefined;

  private static get LEFT_RIGHT(): Set<Direction> {
    return (OneDimensionalComponentsCompaction.#LEFT_RIGHT ??= new Set([Direction.LEFT, Direction.RIGHT]));
  }

  private static get UP_DOWN(): Set<Direction> {
    return (OneDimensionalComponentsCompaction.#UP_DOWN ??= new Set([Direction.UP, Direction.DOWN]));
  }

  private compactionGraph: CGraph = null as never;

  private transformer: ComponentsToCGraphTransformer<N, E> = null as never;

  private verticalExternalExtensions: Pair<CGroup, CNode>[] = null as never;
  private horizontalExternalExtensions: Pair<CGroup, CNode>[] = null as never;

  private compactor: OneDimensionalCompactor = null as never;

  private topLeft: KVector = null as never;
  private bottomRight: KVector = null as never;

  /** Use {@link init}. */
  private constructor() {}

  /**
   * Creates a new compaction object for the passed elements.
   *
   * @param ccs a list with components to be compacted.
   * @param spacing the spacing to be preserved between any pair of components.
   * @returns a new compactor object.
   */
  static init<N, E>(ccs: IConnectedComponents<N, E>, spacing: number): OneDimensionalComponentsCompaction<N, E> {
    const compaction = new OneDimensionalComponentsCompaction<N, E>();
    compaction.transformer = new ComponentsToCGraphTransformer<N, E>(spacing);
    compaction.compactionGraph = compaction.transformer.transform(ccs);

    return compaction;
  }

  /**
   * Executes the compaction. (The Java body is split at its comment blocks into `prepareCompactor` and
   * `determineDrawingDimensions` for the complexity limits; Java's private `compact(int)` is
   * `compactRun`, TypeScript cannot overload by type.)
   *
   * @param monitor a progress monitor (unused, as in Java).
   */
  compact(monitor: IElkProgressMonitor): void {
    const allNodes = this.prepareCompactor();
    this.determineDrawingDimensions(allNodes);

    // we "lock" nodes based on outgoing constraints, i.e. if there's a
    // node in the "opposite" shadow we do not move it away
    // remember do execute an initial unlocked compaction
    // in #compact() first, though
    this.compactor.setLockingStrategy((pair) => ((pair.getFirst() as CNode).cGroup as CGroup).outDegree !== 0);

    // now execute compaction until no improvement is made or we hit the maximum number of iterations
    let run = 0;
    let delta: number;
    do {
      delta = this.compactRun(run);
      run++;
    } while ((run < 2 || delta > EPSILON) && run < MAX_ITERATION);

    // "align" the compaction top left
    this.compactor.setLockingStrategy(
      (pair) =>
        (pair.getFirst() as CNode).lock.get(pair.getSecond() as Direction) ||
        (((pair.getFirst() as CNode).cGroup as CGroup).outDegree !== 0 &&
          (pair.getFirst() as CNode).lock.get(pair.getSecond() as Direction)),
    );
    this.compactRun(0);

    // finish it!
    // make sure that the external edge representations have been removed from the
    // compaction graph at this point for correct graph size calculation
    this.compactor.finish();

    // finally apply the determined positions
    this.transformer.applyLayout();
  }

  /**
   * First part of Java's `compact(IElkProgressMonitor)` (:104-132): separate the extensions, create the
   * compactor with the external edge representations added once.
   *
   * @returns `allNodes` of the Java method
   */
  private prepareCompactor(): CNode[] {
    // separate vertical and horizontal extensions
    const allNodes: CNode[] = [];
    this.verticalExternalExtensions = [];
    this.horizontalExternalExtensions = [];

    for (const [key, value] of this.transformer.getExternalExtensions().entries()) {
      allNodes.push(value.getSecond() as CNode);
      if (key.getDirection().isHorizontal()) {
        this.horizontalExternalExtensions.push(value);
      } else {
        this.verticalExternalExtensions.push(value);
      }
    }

    // add the external edge representations prior to the creation
    // of the one dimensional compactor.
    // it is necessary for all group offsets to be calculated properly
    this.addExternalEdgeRepresentations(this.horizontalExternalExtensions);
    this.addExternalEdgeRepresentations(this.verticalExternalExtensions);

    // create our favorite compactor instance
    this.compactor = new OneDimensionalCompactor(this.compactionGraph);
    this.compactor.setSpacingsHandler(ComponentsToCGraphTransformer.SPACING_HANDLER);

    this.removeExternalEdgeRepresentations(this.horizontalExternalExtensions);
    this.removeExternalEdgeRepresentations(this.verticalExternalExtensions);

    allNodes.push(...this.compactor.cGraph.cNodes);
    return allNodes;
  }

  /** Second part of Java's `compact(IElkProgressMonitor)` (:134-144): the current drawing's dimensions. */
  private determineDrawingDimensions(allNodes: CNode[]): void {
    // calculating new graph size and offset
    this.topLeft = new KVector(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
    this.bottomRight = new KVector(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);

    // determine the current drawing's dimensions
    for (const cNode of allNodes) {
      this.topLeft.x = Math.min(this.topLeft.x, cNode.hitbox.x);
      this.topLeft.y = Math.min(this.topLeft.y, cNode.hitbox.y);
      this.bottomRight.x = Math.max(this.bottomRight.x, cNode.hitbox.x + cNode.hitbox.width);
      this.bottomRight.y = Math.max(this.bottomRight.y, cNode.hitbox.y + cNode.hitbox.height);
    }
  }

  /**
   * Internal compaction method, performs 3 compactions into each direction (horizontal first,
   * then vertical). The first compaction is unconstrained, the latter two consider the node locks.
   * (Java's `compact(int)`, split into `compactHorizontally`, `prepareVertical` and
   * `compactVertically` for the complexity limits; `delta` stays one running sum.)
   */
  private compactRun(run: number): number {
    let delta = 0;

    // reset all groups' deltas
    for (const g of this.compactionGraph.cGroups) {
      g.delta = 0;
      g.deltaNormalized = 0;
    }

    this.compactHorizontally();
    delta = this.prepareVertical(delta);
    this.compactVertically();

    // ... and the delta from vertical compaction
    for (const g of this.compactionGraph.cGroups) {
      delta += Math.abs(g.deltaNormalized);
    }

    return delta;
  }

  /** Java `compact(int)` block `#1` (:190-226): horizontal compaction. */
  private compactHorizontally(): void {
    // ----------------------------------------------------
    // #1 We want to perform horizontal compaction first.
    //    For this we have to add the vertical external
    //    edges to the hulls to prevent edge node overlaps
    // ----------------------------------------------------

    this.addPlaceholders(Dir.HORZ);
    this.addExternalEdgeRepresentations(this.verticalExternalExtensions);
    this.compactor.calculateGroupOffsets();
    // there are new nodes in the compaction graph, we have to update the constraints
    this.compactor.forceConstraintsRecalculation();

    const direction = Direction.LEFT;
    // compact horizontally
    this.compactor
      .changeDirection(direction)
      .compact()
      .changeDirection(direction.opposite())
      .applyLockingStrategy()
      .compact()
      .changeDirection(direction)
      .applyLockingStrategy()
      .compact();

    // very important to transform back to LEFT
    // because the hitboxes representing external edges
    // that will be added in a second have not been transformed yet
    this.compactor.changeDirection(Direction.LEFT);

    // remove the vertical external edges again
    this.removeExternalEdgeRepresentations(this.verticalExternalExtensions);
    this.removePlaceholders(Dir.HORZ);

    // .. and offset the horizontal external edges (that will be added next)
    // according to the just finished horizontal compaction
    this.updateExternalExtensionDimensions(Dir.HORZ);
    this.updatePlaceholders(Dir.VERT);
  }

  /**
   * Java `compact(int)` start of block `#2` (:229-244): add the horizontal extensions and fold the
   * horizontal delta into the running sum.
   *
   * @returns the running `delta`
   */
  private prepareVertical(deltaSoFar: number): number {
    let delta = deltaSoFar;

    // ----------------------------------------------------
    // #2 We want to perform vertical compaction.
    // ----------------------------------------------------

    // now add them
    this.addPlaceholders(Dir.VERT);
    this.addExternalEdgeRepresentations(this.horizontalExternalExtensions);
    this.compactor.calculateGroupOffsets();
    // remember delta from horizontal compaction
    for (const g of this.compactionGraph.cGroups) {
      delta += Math.abs(g.deltaNormalized);
    }
    // reset all groups' deltas
    for (const g of this.compactionGraph.cGroups) {
      g.delta = 0;
      g.deltaNormalized = 0;
    }
    return delta;
  }

  /** Java `compact(int)` rest of block `#2` (:246-271): vertical compaction. */
  private compactVertically(): void {
    const direction = Direction.UP;
    // compact vertically
    this.compactor
      .changeDirection(direction)
      .forceConstraintsRecalculation()
      .compact()
      .changeDirection(direction.opposite())
      .applyLockingStrategy()
      .compact()
      .changeDirection(direction)
      .applyLockingStrategy()
      .compact();

    // transform back to LEFT
    this.compactor.changeDirection(Direction.LEFT);

    // remove the horizontal external edges
    this.removeExternalEdgeRepresentations(this.horizontalExternalExtensions);
    this.removePlaceholders(Dir.VERT);

    // ... offset the vertical external edges
    // (which have been excluded during the last compaction)
    this.updateExternalExtensionDimensions(Dir.VERT);
    this.updatePlaceholders(Dir.HORZ);

    this.compactor.forceConstraintsRecalculation();
  }

  /**
   * @returns After {@link compact} has been executed, returns the new size of the graph. That is,
   *          the size of a rectangle that represents the bounding box of all contained
   *          {@link IComponent}s.
   *
   *          Note that this bounding box considers only real nodes and no contribution of external
   *          edges.
   */
  getGraphSize(): KVector {
    return this.transformer.getGraphSize();
  }

  /**
   * @param c the {@link IComponent} for which the offset is requested.
   * @returns After {@link compact} has been executed returns the offset of this {@link IComponent}
   *          compared to the component's position prior to compaction.
   */
  getOffset(c: IComponent<N, E>): KVector {
    const individual = this.transformer.getOffset(c);
    return individual.negate().add(this.transformer.getGlobalOffset());
  }

  /** Adds the passed external edges to the {@link compactionGraph}. */
  private addExternalEdgeRepresentations(ees: Pair<CGroup, CNode>[]): void {
    for (const p of ees) {
      this.compactionGraph.cNodes.push(p.getSecond() as CNode);
      (p.getFirst() as CGroup).addCNode(p.getSecond() as CNode);
    }
  }

  /** Remove the passed external edges from the {@link compactionGraph}. */
  private removeExternalEdgeRepresentations(ees: Pair<CGroup, CNode>[]): void {
    for (const p of ees) {
      removeFrom(this.compactionGraph.cNodes, p.getSecond() as CNode);
      (p.getFirst() as CGroup).removeCNode(p.getSecond() as CNode);
    }
  }

  private addPlaceholders(dir: Dir): void {
    const dirs =
      dir === Dir.VERT ? OneDimensionalComponentsCompaction.UP_DOWN : OneDimensionalComponentsCompaction.LEFT_RIGHT;
    for (const d of dirs) {
      for (const pair of this.transformer.getExternalPlaceholder().get(d)) {
        const second = pair.getSecond() as CNode;
        this.compactionGraph.cNodes.push(second);
        this.compactionGraph.cGroups.push(second.cGroup as CGroup);
      }
    }
  }

  private removePlaceholders(dir: Dir): void {
    const dirs =
      dir === Dir.VERT ? OneDimensionalComponentsCompaction.UP_DOWN : OneDimensionalComponentsCompaction.LEFT_RIGHT;
    for (const d of dirs) {
      for (const pair of this.transformer.getExternalPlaceholder().get(d)) {
        const second = pair.getSecond() as CNode;
        removeFrom(this.compactionGraph.cNodes, second);
        removeFrom(this.compactionGraph.cGroups, second.cGroup as CGroup);
      }
    }
  }

  private updatePlaceholders(dir: Dir): void {
    const dirs =
      dir === Dir.VERT ? OneDimensionalComponentsCompaction.UP_DOWN : OneDimensionalComponentsCompaction.LEFT_RIGHT;
    for (const d of dirs) {
      for (const pair of this.transformer.getExternalPlaceholder().get(d)) {
        const cNode = pair.getSecond() as CNode;
        const parentComponentGroup = pair.getFirst() as CGroup;

        // deltaNormalized is negative if a group was moved to the left,
        //  positive if the group was moved to the right
        // the size of each component stays the same!
        const adelta = parentComponentGroup.deltaNormalized;
        switch (d) {
          case Direction.LEFT:
          case Direction.RIGHT:
            cNode.hitbox.y += adelta;
            break;

          case Direction.UP:
          case Direction.DOWN:
            // y sticks to the top of the diagram
            cNode.hitbox.x += adelta;
            break;
        }
      }
    }
  }

  /**
   * During compaction of the x dimension the horizontal external extensions are not part of the
   * graph that is being compacted. As a consequence, their positions are not updated. We make up
   * for this in this method. Additionally, the dimensions of the diagram are respected and
   * external extensions are guaranteed to always extend to the very border of the diagram
   * (preventing components from overlapping with edges).
   *
   * @param dir whether to update the vertical or the horizontal extensions.
   */
  private updateExternalExtensionDimensions(dir: Dir): void {
    for (const [ee, pair] of this.transformer.getExternalExtensions().entries()) {
      if (dir === Dir.VERT) {
        if (ee.getDirection() !== Direction.UP && ee.getDirection() !== Direction.DOWN) {
          continue;
        }
      } else {
        if (ee.getDirection() !== Direction.LEFT && ee.getDirection() !== Direction.RIGHT) {
          continue;
        }
      }

      this.updateExternalExtensionDimension(ee, pair);
    }
  }

  /** The tail of the Java loop body of `updateExternalExtensionDimensions` (:398-425). */
  private updateExternalExtensionDimension(ee: IExternalExtension<E>, pair: Pair<CGroup, CNode>): void {
    const cNode = pair.getSecond() as CNode;
    // the node may not be associated with the group atm, thus cNode.group may be null
    const group = pair.getFirst() as CGroup;

    // deltaNormalized is negative if a group was moved to the left,
    // positive if the group was moved to the right
    const adelta = group.deltaNormalized;
    switch (ee.getDirection()) {
      case Direction.LEFT:
        // x sticks to the left of the diagram
        cNode.hitbox.x = this.topLeft.x;
        cNode.hitbox.width = Math.max(1, cNode.hitbox.width + adelta);
        break;
      case Direction.RIGHT:
        cNode.hitbox.x = cNode.hitbox.x + adelta;
        cNode.hitbox.width = Math.max(1, cNode.hitbox.width - adelta);
        break;

      case Direction.UP:
        // y sticks to the top of the diagram
        cNode.hitbox.y = this.topLeft.y;
        cNode.hitbox.height = Math.max(1, cNode.hitbox.height + adelta);
        break;
      case Direction.DOWN:
        cNode.hitbox.y = cNode.hitbox.y + adelta;
        cNode.hitbox.height = Math.max(1, cNode.hitbox.height - adelta);
        break;
    }
  }
}

/** Java `List.remove(Object)`: removes the first occurrence (by `equals`, identity for these types). */
function removeFrom<T>(list: T[], element: T): boolean {
  const index = list.indexOf(element);
  if (index < 0) {
    return false;
  }
  list.splice(index, 1);
  return true;
}
